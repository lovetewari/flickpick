import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';
import { SERIES_OFFSET } from '@/lib/constants';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { GET } from '@/app/api/content/route';

const get = qs => GET(new Request(`http://localhost/api/content?${qs}`));

const movieRow = (id, over = {}) => ({
  id, tmdb_id: id, type: 'movie', title: `Movie ${id}`, year: 2024, release_date: '2024-05-01',
  genres: ['Action'], rating: 7.5, votes: 900, popularity: 50 + id % 7, hit_score: 22,
  poster_path: `/m${id}.jpg`, overview: 'o', duration: '2h', seasons: 0, episodes: 0,
  status: '', network: '', providers: ['Netflix'], ...over,
});
const seriesRow = (tmdbId, over = {}) => ({
  ...movieRow(tmdbId + SERIES_OFFSET), tmdb_id: tmdbId, type: 'series',
  title: `Series ${tmdbId}`, duration: '3 Seasons', seasons: 3, episodes: 24, ...over,
});

describe('GET /api/content', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('serves a movies-only deck of the requested size in the UI item shape', async () => {
    h.current.queue('catalog', { data: Array.from({ length: 20 }, (_, i) => movieRow(i + 1)), error: null });

    const res = await get('type=movies&category=hits&movieCount=10&seriesCount=20');
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.results.length).toBe(10);
    const item = d.results[0];
    expect(item).toMatchObject({ type: 'movie', duration: '2h', ott: ['Netflix'] });
    expect(item.poster).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/m\d+\.jpg$/);
    expect(Array.isArray(item.genre)).toBe(true);
    // only the movie deck was queried
    expect(h.current.calls.every(c => c.table === 'catalog')).toBe(true);
  });

  it('clamps deck counts into 1..50 (garbage → default, huge → 50)', async () => {
    h.current.queue('catalog', { data: Array.from({ length: 100 }, (_, i) => movieRow(i + 1)), error: null });
    const d = await (await get('type=movies&category=hits&movieCount=999')).json();
    expect(d.results.length).toBe(50);

    h.current = createSupabaseMock();
    h.current.queue('catalog', { data: Array.from({ length: 100 }, (_, i) => movieRow(i + 1)), error: null });
    const d2 = await (await get('type=movies&category=hits&movieCount=banana')).json();
    expect(d2.results.length).toBe(20); // default
  });

  it('maps legacy category ids (trending → hot) and ranks by real swipe likes per content_type', async () => {
    // hot ranking source: 3 likes for series 42 (stored with content_type), 1 for movie 7
    h.current.queue('swipes', {
      data: [
        { content_id: 42 + SERIES_OFFSET, content_type: 'series' },
        { content_id: 42 + SERIES_OFFSET, content_type: 'series' },
        { content_id: 42 + SERIES_OFFSET, content_type: 'series' },
        { content_id: 7, content_type: 'movie' },
      ], error: null,
    });
    // movie deck: hot hydration for movie ids, then fill
    h.current.queue('catalog', { data: [movieRow(7)], error: null });
    h.current.queue('catalog', { data: [movieRow(7), movieRow(8), movieRow(9)], error: null });
    // series deck: hot hydration, then fill
    h.current.queue('catalog', { data: [seriesRow(42)], error: null });
    h.current.queue('catalog', { data: [seriesRow(42), seriesRow(43)], error: null });

    const d = await (await get('type=all&category=trending&movieCount=3&seriesCount=2')).json();
    const series = d.results.filter(r => r.type === 'series');
    const movies = d.results.filter(r => r.type === 'movie');
    expect(series.map(s => s.id)).toContain(42 + SERIES_OFFSET);
    expect(movies.map(m => m.id)).toContain(7);
  });

  it('translates legacy series swipe ids (old +200000 offset) instead of misclassifying them as movies', async () => {
    h.current.queue('swipes', {
      data: [{ content_id: 1396 + 200000, content_type: 'series' }], // legacy row
      error: null,
    });
    h.current.queue('catalog', { data: [seriesRow(1396)], error: null }); // hot hydration
    h.current.queue('catalog', { data: [seriesRow(1396)], error: null }); // fill

    const d = await (await get('type=series&category=hot&seriesCount=1')).json();
    expect(d.results[0].id).toBe(1396 + SERIES_OFFSET);
    // the hot hydration query used the TRANSLATED id
    const inArgs = h.current.calls.find(c => c.table === 'catalog').chain.find(c => c.method === 'in').args;
    expect(inArgs[1]).toContain(1396 + SERIES_OFFSET);
    expect(inArgs[1]).not.toContain(1396 + 200000);
  });

  it('falls back past a starving platform filter to fill the deck', async () => {
    h.current.queue('catalog', { data: [movieRow(1)], error: null });                      // filtered: 1 result
    h.current.queue('catalog', { data: [movieRow(1), movieRow(2), movieRow(3)], error: null }); // unfiltered fill
    const d = await (await get('type=movies&category=hits&movieCount=3&platforms=Hulu')).json();
    expect(d.results.length).toBe(3);
    expect(new Set(d.results.map(r => r.id)).size).toBe(3); // no duplicates from the two passes
  });

  it('expands a canonical platform into stored catalog spellings for the overlaps filter', async () => {
    h.current.queue('catalog', { data: Array.from({ length: 5 }, (_, i) => movieRow(i + 1)), error: null });
    await get('type=movies&category=hits&movieCount=5&platforms=Prime+Video');
    const overlaps = h.current.calls.find(c => c.table === 'catalog').chain.find(c => c.method === 'overlaps');
    expect(overlaps.args[0]).toBe('providers');
    expect(overlaps.args[1]).toEqual(expect.arrayContaining([
      'Prime Video', 'Amazon Prime Video', 'Amazon Prime Video with Ads',
    ]));
  });

  it('relaxes category constraints (never type/genre) until the requested count is met', async () => {
    // hidden_gems' vote/rating cuts starve the catalog: primary fill finds
    // only 4, the hit_score pass adds 4 more, the popularity pass finishes.
    h.current.queue('catalog', { data: Array.from({ length: 4 }, (_, i) => movieRow(i + 1)), error: null });   // category fill
    h.current.queue('catalog', { data: Array.from({ length: 8 }, (_, i) => movieRow(i + 1)), error: null });   // hit_score (4 dupes + 4 new)
    h.current.queue('catalog', { data: Array.from({ length: 12 }, (_, i) => movieRow(i + 1)), error: null });  // popularity
    const d = await (await get('type=movies&category=hidden_gems&genre=Horror&movieCount=10')).json();
    expect(d.results.length).toBe(10);
    expect(new Set(d.results.map(r => r.id)).size).toBe(10);
    // every relaxation query kept the genre filter strict
    const catalogCalls = h.current.calls.filter(c => c.table === 'catalog');
    for (const call of catalogCalls) {
      const contains = call.chain.find(c => c.method === 'contains');
      expect(contains?.args).toEqual(['genres', ['Horror']]);
    }
  });

  it('reports requested vs delivered so the UI can flag a genuinely short deck', async () => {
    h.current.queue('catalog', { data: Array.from({ length: 6 }, (_, i) => movieRow(i + 1)), error: null });
    // remaining cascade queries return nothing — only 6 titles exist
    const d = await (await get('type=movies&category=hits&movieCount=10')).json();
    expect(d.requested).toEqual({ movies: 10, series: 0 });
    expect(d.delivered).toEqual({ movies: 6, series: 0 });
  });

  it('503s with a helpful message when the catalog has never been seeded', async () => {
    h.current.queue('catalog', { data: [], error: null }); // deck query: empty
    h.current.queue('catalog', { data: [], error: null }); // platform fallback: empty
    h.current.queue('catalog', { count: 0, data: null, error: null }); // emptiness check
    const res = await get('type=movies&category=hits');
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/seed/i);
  });
});
