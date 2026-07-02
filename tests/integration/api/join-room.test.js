import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { POST } from '@/app/api/join-room/route';

const post = body => POST(new Request('http://localhost/api/join-room', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

describe('POST /api/join-room', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('rejects malformed room codes without hitting the database', async () => {
    for (const code of ['ab', 'toolongcode99', 'AB CD3', '', '<script>']) {
      const res = await post({ code, playerName: 'Sam' });
      expect(res.status).toBe(400);
    }
    expect(h.current.calls.length).toBe(0);
  });

  it('404s when the room does not exist', async () => {
    h.current.queue('rooms', { data: null, error: null });
    const res = await post({ code: 'ABC234', playerName: 'Sam' });
    expect(res.status).toBe(404);
  });

  it('rejects joining a finished room', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'results' }, error: null });
    const res = await post({ code: 'ABC234', playerName: 'Sam' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/finished/i);
  });

  it('returns the existing player for a signed-in user who already joined (no duplicates)', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'lobby' }, error: null });
    h.current.queue('players', { data: { id: 'p9', session_token: 'tok_existing' }, error: null });

    const res = await post({ code: 'ABC234', playerName: 'Sam', userId: 'u1' });
    const d = await res.json();
    expect(d.player.id).toBe('p9');
    expect(d.sessionToken).toBe('tok_existing');
    // only the lookup ran — no count/insert
    expect(h.current.calls.filter(c => c.table === 'players').length).toBe(1);
  });

  it('enforces the 12-player cap', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'lobby' }, error: null });
    h.current.queue('players', { count: 12, data: null, error: null });
    const res = await post({ code: 'ABC234', playerName: 'Sam' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/full/i);
  });

  it('joins as the Nth player with rotating avatar/color', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'lobby' }, error: null });
    h.current.queue('players', { count: 3, data: null, error: null });
    h.current.queue('players', { data: { id: 'p4', session_token: 'tok_new', player_order: 3 }, error: null });

    const res = await post({ code: 'abc234', playerName: 'Sam' }); // lowercase input accepted
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.player.player_order).toBe(3);
    const insert = h.current.calls.filter(c => c.table === 'players')[1].chain.find(c => c.method === 'insert').args[0];
    expect(insert.player_order).toBe(3);
    expect(insert.name).toBe('Sam');
    expect(insert.is_host).toBe(false);
  });
});
