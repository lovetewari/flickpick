import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { POST, PATCH } from '@/app/api/swipe/route';

const req = (method, body) => new Request('http://localhost/api/swipe', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('POST /api/swipe', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('rejects invalid session tokens with 401', async () => {
    h.current.queue('players', { data: null, error: null });
    const res = await POST(req('POST', { sessionToken: 'tok_bogus', contentId: 603, contentType: 'movie', liked: true }));
    expect(res.status).toBe(401);
  });

  it('upserts the swipe keyed on player+content (re-swipe overwrites, no dup)', async () => {
    h.current.queue('players', { data: { id: 'p1', room_id: 'r1' }, error: null });
    h.current.queue('swipes', { data: null, error: null });

    const res = await POST(req('POST', { sessionToken: 'tok_ok', contentId: 603, contentType: 'movie', liked: true }));
    expect(res.status).toBe(200);

    const upsert = h.current.calls.find(c => c.table === 'swipes').chain.find(c => c.method === 'upsert');
    expect(upsert.args[0]).toMatchObject({ player_id: 'p1', room_id: 'r1', content_id: 603, liked: true });
    expect(upsert.args[1]).toMatchObject({ onConflict: 'player_id,content_id' });
  });

  it('propagates database failures as 500 (client shows a toast instead of losing votes silently)', async () => {
    h.current.queue('players', { data: { id: 'p1', room_id: 'r1' }, error: null });
    h.current.queue('swipes', { data: null, error: { message: 'db down' } });
    const res = await POST(req('POST', { sessionToken: 'tok_ok', contentId: 603, contentType: 'movie', liked: false }));
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/swipe (mark done)', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('marks the player done by session token', async () => {
    h.current.queue('players', { data: null, error: null });
    const res = await PATCH(req('PATCH', { sessionToken: 'tok_ok' }));
    expect(res.status).toBe(200);
    const chain = h.current.chainOf('players');
    expect(chain).toContain('update');
    expect(chain).toContain('eq');
  });
});
