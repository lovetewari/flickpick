import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { GET, PATCH } from '@/app/api/results/[code]/route';

const getReq = () => new Request('http://localhost/api/results/ABC234');
const patchReq = body => new Request('http://localhost/api/results/ABC234', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const params = { params: { code: 'abc234' } };

const swipe = (player, content, liked, type = 'movie') => ({ player_id: player, content_id: content, content_type: type, liked });

describe('GET /api/results/[code]', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('404s for unknown rooms', async () => {
    h.current.queue('rooms', { data: null, error: null });
    const res = await GET(getReq(), params);
    expect(res.status).toBe(404);
  });

  it('computes perfect matches (liked by ALL players), ranked votes, and per-player likes', async () => {
    h.current.queue('rooms', { data: { id: 'r1', code: 'ABC234' }, error: null });
    h.current.queue('players', { data: [{ id: 'p1' }, { id: 'p2' }], error: null });
    h.current.queue('swipes', {
      data: [
        swipe('p1', 603, true), swipe('p2', 603, true),          // both liked → match
        swipe('p1', 604, true), swipe('p2', 604, false),         // split → ranked only
        swipe('p1', 100000042, true, 'series'), swipe('p2', 100000042, true, 'series'), // series match
      ],
      error: null,
    });

    const res = await GET(getReq(), params);
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.matchIds.sort()).toEqual([100000042, 603]);
    expect(d.ranked[0].votes).toBe(2);
    expect(d.ranked.find(r => r.contentId === 604).votes).toBe(1);
    expect(d.individual.p1.map(x => x.id)).toContain(604);
    expect(d.individual.p2.map(x => x.id)).not.toContain(604);
  });

  it('pages past the 1000-row cap so big rooms are not truncated', async () => {
    h.current.queue('rooms', { data: { id: 'r1' }, error: null });
    h.current.queue('players', { data: [{ id: 'p1' }], error: null });
    // First page: exactly 1000 rows → route must fetch a second page
    const page1 = Array.from({ length: 1000 }, (_, i) => swipe('p1', i + 1, true));
    const page2 = [swipe('p1', 2001, true)];
    h.current.queue('swipes', { data: page1, error: null });
    h.current.queue('swipes', { data: page2, error: null });

    const res = await GET(getReq(), params);
    const d = await res.json();
    expect(d.ranked.length).toBe(1001); // nothing dropped
    expect(h.current.calls.filter(c => c.table === 'swipes').length).toBe(2);
    // both pages used .range()
    const ranges = h.current.calls.filter(c => c.table === 'swipes')
      .map(c => c.chain.find(x => x.method === 'range')?.args);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });
});

describe('PATCH /api/results/[code]', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('whitelists fields: unknown or invalid values are rejected', async () => {
    const res = await PATCH(patchReq({ status: 'hacked', evil: true }), params);
    expect(res.status).toBe(400); // nothing valid to update
    expect(h.current.calls.length).toBe(0);
  });

  it('accepts the frozen deck (validated) and persists it with the status flip', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'swiping' }, error: null });
    const deck = [{ id: 603, title: 'The Matrix', type: 'movie' }];
    const res = await PATCH(patchReq({ status: 'swiping', deck, movie_count: 30 }), params);
    expect(res.status).toBe(200);
    const update = h.current.calls.find(c => c.table === 'rooms').chain.find(c => c.method === 'update').args[0];
    expect(update.deck).toEqual(deck);
    expect(update.movie_count).toBe(30);
    expect(update.status).toBe('swiping');
  });

  it('rejects malformed decks (items without numeric ids)', async () => {
    h.current.queue('rooms', { data: { id: 'r1' }, error: null });
    const res = await PATCH(patchReq({ status: 'swiping', deck: [{ id: 'nope', title: 3 }] }), params);
    expect(res.status).toBe(200); // status still applies…
    const update = h.current.calls.find(c => c.table === 'rooms').chain.find(c => c.method === 'update').args[0];
    expect(update.deck).toBeUndefined(); // …but the bad deck does not
  });

  it('clamps deck-size fields to 1..50', async () => {
    const res = await PATCH(patchReq({ movie_count: 900 }), params);
    expect(res.status).toBe(400); // out-of-range → not a valid field → nothing to update
  });

  it('writes watch history only when revealing results with entries', async () => {
    h.current.queue('rooms', { data: { id: 'r1', status: 'results' }, error: null });
    h.current.queue('watch_history', { data: null, error: null });
    await PATCH(patchReq({ status: 'results', historyEntries: [{ user_id: 'u1', content_id: 603 }] }), params);
    expect(h.current.calls.some(c => c.table === 'watch_history')).toBe(true);
  });
});
