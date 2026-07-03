import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { GET as getPosters } from '@/app/api/posters/route';
import { GET as getKeepalive } from '@/app/api/keepalive/route';

describe('GET /api/posters (trending service)', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  const row = (id, type, title, extra = {}) => ({ id, title, poster_path: `/${title}.jpg`, year: 2024, type, rating: 7.8, providers: [], provider_logos: [], release_date: '2024-01-01', ...extra });

  it('serves trending ITEMS with availability + real provider logos, interleaved', async () => {
    h.current.queue('catalog', { data: [row(1, 'movie', 'm1', { providers: ['Netflix'], provider_logos: ['https://image.tmdb.org/t/p/w45/nf.jpg'] }), row(2, 'movie', 'm2')], error: null });
    h.current.queue('catalog', { data: [row(100000003, 'series', 's1', { providers: ['Amazon Prime Video'], provider_logos: ['https://image.tmdb.org/t/p/w45/pv.jpg'] })], error: null });
    const d = await (await getPosters()).json();
    expect(d.items.map(i => i.title)).toEqual(['m1', 's1', 'm2']); // interleaved mix
    expect(d.week).toMatch(/^\d{4}-W\d{2}$/);
    expect(d.items.map(i => i.rank)).toEqual([1, 2, 3]);
    expect(d.items[0]).toMatchObject({ type: 'movie', year: 2024, rating: 7.8, poster: 'https://image.tmdb.org/t/p/w185/m1.jpg' });
    expect(d.items[0].detailsUrl).toBe('https://www.themoviedb.org/movie/1');
    expect(d.items[1].detailsUrl).toBe('https://www.themoviedb.org/tv/3');
    expect(d.items[0].providers).toEqual(['Netflix']);
    expect(d.items[0].providerLogos).toEqual(['https://image.tmdb.org/t/p/w45/nf.jpg']); // real logo passed through
    expect(d.items[1].providers).toEqual(['Prime Video']); // normalized from "Amazon Prime Video"
    expect(d.posters).toEqual(d.items.map(i => i.poster));
    // Wall gets thumbnail-size variants (w185 → w92)
    expect(d.wallPosters[0]).toBe('https://image.tmdb.org/t/p/w92/m1.jpg');
  });

  it('promotes this week’s liked titles ahead of popularity ranking', async () => {
    h.current.queue('swipes', { data: [
      { content_id: 2, content_type: 'movie', created_at: new Date().toISOString() },
      { content_id: 2, content_type: 'movie', created_at: new Date().toISOString() },
    ], error: null });
    h.current.queue('catalog', { data: [row(1, 'movie', 'popular'), row(2, 'movie', 'liked')], error: null });
    h.current.queue('catalog', { data: [], error: null });
    h.current.queue('catalog', { data: [row(2, 'movie', 'liked')], error: null });

    const d = await (await getPosters()).json();
    expect(d.items[0]).toMatchObject({ title: 'liked', rank: 1 });
    expect(d.items.map(i => i.title)).toEqual(['liked', 'popular']);
  });

  it('rejects junk/untrusted logo urls from the catalog (validation)', async () => {
    h.current.queue('catalog', { data: [
      row(1, 'movie', 'good', { providers: ['Netflix'], provider_logos: ['https://image.tmdb.org/t/p/w45/nf.jpg'] }),
      row(2, 'movie', 'evil', { providers: ['Netflix'], provider_logos: ['https://evil.example.com/steal.png'] }),
      row(3, 'movie', 'junk', { providers: ['Netflix'], provider_logos: ['javascript:alert(1)'] }),
    ], error: null });
    h.current.queue('catalog', { data: [], error: null });
    const d = await (await getPosters()).json();
    expect(d.items[0].providerLogos).toEqual(['https://image.tmdb.org/t/p/w45/nf.jpg']); // trusted CDN → kept
    expect(d.items[1].providerLogos).toEqual([null]);  // foreign host → rejected
    expect(d.items[2].providerLogos).toEqual([null]);  // scheme junk → rejected
  });

  it('flags a recent movie with no streaming home as In Theaters', async () => {
    const today = new Date().toISOString().slice(0, 10);
    h.current.queue('catalog', { data: [row(9, 'movie', 'fresh', { providers: [], release_date: today })], error: null });
    h.current.queue('catalog', { data: [], error: null });
    const d = await (await getPosters()).json();
    expect(d.items[0].inTheaters).toBe(true);
    expect(d.items[0].providers).toEqual([]);
  });

  it('falls back to the keyless iTunes charts when catalog + TMDB are unavailable', async () => {
    h.current.queue('catalog', () => { throw new Error('no db'); });
    h.current.queue('catalog', () => { throw new Error('no db'); });
    const feed = names => ({ feed: { entry: names.map(([n, y], i) => ({
      id: { attributes: { 'im:id': String(1000 + i) } },
      link: [{ attributes: { rel: 'alternate', href: `https://itunes.apple.com/movie/${encodeURIComponent(n)}` } }],
      'im:name': { label: n },
      'im:image': [{}, {}, { label: `https://is1-ssl.mzstatic.com/x/${n}/170x170bb.png` }],
      'im:releaseDate': { label: `${y}-05-01T00:00:00-07:00` },
    })) } });
    vi.stubGlobal('fetch', vi.fn(url =>
      Promise.resolve({ json: () => Promise.resolve(
        String(url).includes('topmovies') ? feed([['Dune 3', 2026]]) : feed([['Severance S3', 2026]])
      ) })
    ));
    try {
      const d = await (await getPosters()).json();
      expect(d.items.map(i => i.title)).toEqual(['Dune 3', 'Severance S3']); // interleaved
      expect(d.items[0].type).toBe('movie');
      expect(d.items[1].type).toBe('series');
      expect(d.items[0].poster).toContain('/300x450bb.jpg'); // upscaled artwork, jpg (smaller than png)
      expect(d.wallPosters[0]).toContain('/150x225bb.jpg');   // thumbnail for the backdrop wall
      expect(d.items[0].year).toBe(2026);
      expect(d.items[0].providers).toEqual([]); // iTunes is a chart source, not availability
      expect(d.items[0].providerLogos).toEqual([]);
      expect(d.items[0].detailsUrl).toBe('https://itunes.apple.com/movie/Dune%203');
    } finally { vi.unstubAllGlobals(); }
  });

  it('degrades to empty lists when every source is unreachable (never breaks the landing)', async () => {
    h.current.queue('catalog', () => { throw new Error('boom'); });
    h.current.queue('catalog', () => { throw new Error('boom'); });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    try {
      const d = await (await getPosters()).json();
      expect(d.posters).toEqual([]);
      expect(d.items).toEqual([]);
      expect(d.wallPosters).toEqual([]);
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('GET /api/keepalive', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('reports ok after touching the database', async () => {
    h.current.queue('catalog', { data: null, error: null, count: 42 });
    const res = await getKeepalive();
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.ok).toBe(true);
    expect(d.at).toBeTruthy();
  });

  it('reports failure with a 500 when the database is unreachable', async () => {
    h.current.queue('catalog', { data: null, error: { message: 'paused' }, count: null });
    const res = await getKeepalive();
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
