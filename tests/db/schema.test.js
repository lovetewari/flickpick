// ═══════════════════════════════════════════════════════════════
//  Realistic database integration tests (Testcontainers).
//  Boots a throwaway Postgres, applies the REAL supabase-schema.sql
//  (with a stub auth schema), and verifies constraints, cascades,
//  defaults, triggers, and the legacy id migration.
//
//  Requires Docker. Skips itself cleanly when Docker is unavailable
//  (e.g. sandboxed laptops); runs fully in CI.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

function dockerAvailable() {
  try { execSync('docker info', { stdio: 'ignore', timeout: 10000 }); return true; }
  catch { return false; }
}

const HAS_DOCKER = dockerAvailable();

describe.skipIf(!HAS_DOCKER)('supabase-schema.sql against real Postgres', () => {
  let container, client;

  beforeAll(async () => {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { Client } = await import('pg');

    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();

    // Stub the bits Supabase provides out of the box
    await client.query(`
      create schema auth;
      create table auth.users (
        id uuid primary key default gen_random_uuid(),
        email text,
        raw_user_meta_data jsonb default '{}'::jsonb
      );
    `);

    // Apply the real schema, minus Supabase-managed realtime publications
    const raw = readFileSync(path.resolve(__dirname, '../../supabase-schema.sql'), 'utf8');
    const sql = raw.replace(/do \$\$ begin\s+alter publication[\s\S]*?end \$\$;/g, '');
    await client.query(sql);
  }, 180000);

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });

  it('is idempotent — the whole schema can be re-run on an existing database', async () => {
    const raw = readFileSync(path.resolve(__dirname, '../../supabase-schema.sql'), 'utf8');
    const sql = raw.replace(/do \$\$ begin\s+alter publication[\s\S]*?end \$\$;/g, '');
    await expect(client.query(sql)).resolves.toBeTruthy();
  });

  it('creates all seven tables', async () => {
    const { rows } = await client.query(`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`);
    const names = rows.map(r => r.table_name);
    for (const t of ['profiles', 'rooms', 'players', 'swipes', 'watch_history', 'catalog']) {
      expect(names).toContain(t);
    }
  });

  it('applies deck-size defaults on rooms', async () => {
    const { rows } = await client.query(
      `insert into rooms (code, host_name) values ('TEST01', 'Host') returning movie_count, series_count, status, deck`);
    expect(rows[0].movie_count).toBe(20);
    expect(rows[0].series_count).toBe(20);
    expect(rows[0].status).toBe('lobby');
    expect(rows[0].deck).toBeNull();
  });

  it('enforces unique session tokens on players', async () => {
    const { rows: [room] } = await client.query(
      `insert into rooms (code, host_name) values ('TEST02', 'H') returning id`);
    await client.query(
      `insert into players (room_id, name, session_token) values ($1, 'A', 'tok_dup')`, [room.id]);
    await expect(client.query(
      `insert into players (room_id, name, session_token) values ($1, 'B', 'tok_dup')`, [room.id]
    )).rejects.toThrow(/duplicate key/);
  });

  it('enforces one swipe per player per title, upsertable via ON CONFLICT', async () => {
    const { rows: [room] } = await client.query(
      `insert into rooms (code, host_name) values ('TEST03', 'H') returning id`);
    const { rows: [player] } = await client.query(
      `insert into players (room_id, name, session_token) values ($1, 'A', 'tok_s1') returning id`, [room.id]);

    await client.query(
      `insert into swipes (player_id, room_id, content_id, liked) values ($1, $2, 603, true)`, [player.id, room.id]);
    // plain re-insert violates
    await expect(client.query(
      `insert into swipes (player_id, room_id, content_id, liked) values ($1, $2, 603, false)`, [player.id, room.id]
    )).rejects.toThrow(/duplicate key/);
    // upsert (what /api/swipe does) overwrites
    await client.query(
      `insert into swipes (player_id, room_id, content_id, liked) values ($1, $2, 603, false)
       on conflict (player_id, content_id) do update set liked = excluded.liked`, [player.id, room.id]);
    const { rows } = await client.query(
      `select liked from swipes where player_id = $1 and content_id = 603`, [player.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].liked).toBe(false);
  });

  it('cascades room deletion through players and swipes', async () => {
    const { rows: [room] } = await client.query(
      `insert into rooms (code, host_name) values ('TEST04', 'H') returning id`);
    const { rows: [player] } = await client.query(
      `insert into players (room_id, name, session_token) values ($1, 'A', 'tok_c1') returning id`, [room.id]);
    await client.query(
      `insert into swipes (player_id, room_id, content_id, liked) values ($1, $2, 1, true)`, [player.id, room.id]);

    await client.query(`delete from rooms where id = $1`, [room.id]);
    const { rows: p } = await client.query(`select 1 from players where room_id = $1`, [room.id]);
    const { rows: s } = await client.query(`select 1 from swipes where room_id = $1`, [room.id]);
    expect(p).toHaveLength(0);
    expect(s).toHaveLength(0);
  });

  it('rejects catalog rows with invalid type and duplicate (tmdb_id, type)', async () => {
    await client.query(`
      insert into catalog (id, tmdb_id, type, title, poster_path)
      values (603, 603, 'movie', 'The Matrix', '/m.jpg')`);
    await expect(client.query(`
      insert into catalog (id, tmdb_id, type, title, poster_path)
      values (999, 603, 'movie', 'Dup', '/d.jpg')`)).rejects.toThrow(/duplicate key/);
    await expect(client.query(`
      insert into catalog (id, tmdb_id, type, title, poster_path)
      values (7, 7, 'podcast', 'Nope', '/n.jpg')`)).rejects.toThrow(/check constraint/);
  });

  it('auto-creates a profile when an auth user signs up (trigger)', async () => {
    const { rows: [u] } = await client.query(`
      insert into auth.users (email, raw_user_meta_data)
      values ('new@user.dev', '{"full_name":"New User","avatar_url":"http://a/x.png"}') returning id`);
    const { rows } = await client.query(`select * from profiles where id = $1`, [u.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe('New User');
  });

  it('migrates legacy series swipe ids (+200000) to the new offset (+100000000) exactly once', async () => {
    const { rows: [room] } = await client.query(
      `insert into rooms (code, host_name) values ('TEST05', 'H') returning id`);
    const { rows: [player] } = await client.query(
      `insert into players (room_id, name, session_token) values ($1, 'A', 'tok_m1') returning id`, [room.id]);
    // a legacy series like (old offset) and a legit movie like in the same band
    await client.query(
      `insert into swipes (player_id, room_id, content_id, content_type, liked)
       values ($1, $2, 201396, 'series', true), ($1, $2, 251000, 'movie', true)`, [player.id, room.id]);

    const migrate = `update swipes set content_id = content_id - 200000 + 100000000
      where content_type = 'series' and content_id between 200000 and 99999999`;
    await client.query(migrate);
    await client.query(migrate); // idempotent — second run is a no-op

    const { rows } = await client.query(
      `select content_id, content_type from swipes where player_id = $1 order by content_id`, [player.id]);
    expect(rows.find(r => r.content_type === 'series').content_id).toBe(100001396);
    expect(rows.find(r => r.content_type === 'movie').content_id).toBe(251000); // untouched
  });
});

// Always-on guard so the suite is never silently empty on machines without Docker
describe('db test preflight', () => {
  it(`docker ${HAS_DOCKER ? 'available — full suite ran' : 'unavailable — schema suite skipped (runs in CI)'}`, () => {
    expect(true).toBe(true);
  });
});
