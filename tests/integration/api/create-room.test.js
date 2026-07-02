import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { POST } from '@/app/api/create-room/route';

const post = body => POST(new Request('http://localhost/api/create-room', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

describe('POST /api/create-room', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('creates a room + host player and returns a session token', async () => {
    h.current.queue('rooms', { data: { id: 'r1', code: 'ABC234' }, error: null });
    h.current.queue('players', { data: { id: 'p1', is_host: true, session_token: 'tok_x' }, error: null });

    const res = await post({ hostName: 'Love', userId: null });
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.room.code).toBe('ABC234');
    expect(d.player.is_host).toBe(true);
    expect(d.sessionToken).toMatch(/^tok_/);
  });

  it('retries on room-code collision (unique violation) and succeeds', async () => {
    h.current.queue('rooms', { data: null, error: { code: '23505', message: 'duplicate key' } });
    h.current.queue('rooms', { data: { id: 'r2', code: 'NEW234' }, error: null });
    h.current.queue('players', { data: { id: 'p1' }, error: null });

    const res = await post({ hostName: 'Love' });
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.room.code).toBe('NEW234');
  });

  it('does not retry on non-collision insert errors', async () => {
    h.current.queue('rooms', { data: null, error: { code: '42P01', message: 'relation missing' } });
    const res = await post({ hostName: 'Love' });
    expect(res.status).toBe(500);
    expect(h.current.calls.filter(c => c.table === 'rooms').length).toBe(1);
  });

  it('cleans up the orphaned room when the player insert fails', async () => {
    h.current.queue('rooms', { data: { id: 'r1', code: 'ABC234' }, error: null });
    h.current.queue('players', { data: null, error: { message: 'player boom' } });
    h.current.queue('rooms', { data: null, error: null }); // the delete

    const res = await post({ hostName: 'Love' });
    expect(res.status).toBe(500);
    const roomCalls = h.current.calls.filter(c => c.table === 'rooms');
    expect(roomCalls.length).toBe(2);
    expect(roomCalls[1].chain.map(c => c.method)).toContain('delete');
  });

  it('clamps absurd host names and defaults empty ones', async () => {
    h.current.queue('rooms', { data: { id: 'r1', code: 'ABC234' }, error: null });
    h.current.queue('players', { data: { id: 'p1' }, error: null });

    await post({ hostName: '   ' });
    const insertArg = h.current.calls.find(c => c.table === 'rooms').chain.find(c => c.method === 'insert').args[0];
    expect(insertArg.host_name).toBe('Host');
  });

  it('survives malformed JSON bodies', async () => {
    h.current.queue('rooms', { data: { id: 'r1', code: 'ABC234' }, error: null });
    h.current.queue('players', { data: { id: 'p1' }, error: null });
    const res = await POST(new Request('http://localhost/api/create-room', { method: 'POST', body: '{not json' }));
    expect(res.status).toBe(200); // defaults kick in, no crash
  });
});
