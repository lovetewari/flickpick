import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabaseMock';

const h = vi.hoisted(() => ({ current: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...a) => h.current.client.from(...a) }),
}));

import { GET as getHealth } from '@/app/api/health/route';
import { GET as getProviders } from '@/app/api/providers/route';
import { GET as getContent } from '@/app/api/content/route';

afterEach(() => vi.unstubAllEnvs());

// ── /api/health — the setup self-diagnosis (also used for Supabase-pause checks) ──
describe('GET /api/health', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  it('flags placeholder env values and blocks downstream checks', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://YOUR-PROJECT-ID.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PASTE_YOUR_KEY');
    const res = await getHealth();
    const d = await res.json();
    expect(res.status).toBe(503);
    expect(d.ready).toBe(false);
    expect(d.checks.supabase_url).toContain('placeholder');
    expect(d.checks.database).toContain('blocked');
  });

  it('reports ready with a seeded catalog when env + database are healthy', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://real-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJ-real-anon-key');
    vi.stubEnv('TMDB_API_KEY', 'realkey123');
    h.current.queue('catalog', { data: null, error: null, count: 812 });
    const res = await getHealth();
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.ready).toBe(true);
    expect(d.checks.database).toContain('reachable');
    expect(d.checks.catalog).toContain('812');
  });

  it('detects a missing catalog table and points to the schema file', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://real-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJ-real-anon-key');
    vi.stubEnv('TMDB_API_KEY', 'realkey123');
    h.current.queue('catalog', { data: null, error: { message: 'relation "public.catalog" does not exist' }, count: null });
    const d = await (await getHealth()).json();
    expect(d.ready).toBe(false);
    expect(d.checks.catalog).toContain('supabase-schema.sql');
  });

  it('reports an unseeded catalog as a warning, not a failure of the database', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://real-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJ-real-anon-key');
    vi.stubEnv('TMDB_API_KEY', 'realkey123');
    h.current.queue('catalog', { data: null, error: null, count: 0 });
    const d = await (await getHealth()).json();
    expect(d.checks.database).toContain('reachable');
    expect(d.checks.catalog).toContain('empty');
  });
});

// ── /api/providers — real platform logos for the landing row ──
describe('GET /api/providers', () => {
  it('returns aliased, prioritized providers with real TMDB logo urls', async () => {
    vi.stubEnv('TMDB_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ results: [
        { provider_name: 'Some Obscure TV', logo_path: '/x.jpg', display_priority: 3 },
        { provider_name: 'Amazon Prime Video', logo_path: '/pv.jpg', display_priority: 2 },
        { provider_name: 'Netflix', logo_path: '/nf.jpg', display_priority: 1 },
        { provider_name: 'Netflix', logo_path: '/dup.jpg', display_priority: 9 }, // deduped
        { provider_name: 'Sketchy', logo_path: '../../etc/passwd', display_priority: 1 }, // invalid path → dropped
      ] }),
    })));
    try {
      const d = await (await getProviders()).json();
      expect(d.providers[0]).toEqual({ name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/nf.jpg' });
      expect(d.providers[1]).toEqual({ name: 'Prime Video', logo: 'https://image.tmdb.org/t/p/w92/pv.jpg' });
      expect(d.providers.filter(p => p.name === 'Netflix')).toHaveLength(1);
      expect(d.providers.at(-1).name).toBe('Some Obscure TV'); // non-preferred sorts last
      expect(d.providers.find(p => p.name === 'Sketchy')).toBeUndefined(); // invalid logo path rejected
    } finally { vi.unstubAllGlobals(); }
  });

  it('degrades to an empty list without a key or on failure', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    const d = await (await getProviders()).json();
    expect(d.providers).toEqual([]);
  });
});

// ── /api/content — live TMDB fallback keeps rooms playable pre-seed ──
describe('GET /api/content — TMDB fallback', () => {
  beforeEach(() => { h.current = createSupabaseMock(); });

  const req = q => new Request(`http://x/api/content?${q}`);

  it('builds a playable deck from TMDB when the catalog is empty', async () => {
    vi.stubEnv('TMDB_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(url => Promise.resolve({
      json: () => Promise.resolve(String(url).includes('/tv/') || String(url).includes('/trending/tv')
        ? { results: [{ id: 1396, name: 'Breaking Bad', poster_path: '/bb.jpg', first_air_date: '2008-01-20', genre_ids: [18], vote_average: 8.9, popularity: 90, overview: 'meth' }] }
        : { results: [{ id: 603, title: 'The Matrix', poster_path: '/m.jpg', release_date: '1999-03-31', genre_ids: [878], vote_average: 8.2, popularity: 80, overview: 'neo' }] }),
    })));
    try {
      const d = await (await getContent(req('type=all&category=hits&movieCount=10&seriesCount=10'))).json();
      expect(d.error).toBeUndefined();
      const movie = d.results.find(r => r.type === 'movie');
      const series = d.results.find(r => r.type === 'series');
      expect(movie).toMatchObject({ id: 603, title: 'The Matrix', genre: ['Sci-Fi'], rating: 8.2 });
      expect(series.id).toBe(100001396); // series offset applied → swipes stay consistent
      expect(series.title).toBe('Breaking Bad');
    } finally { vi.unstubAllGlobals(); }
  });

  it('returns a clear 503 with seeding guidance when every source is empty', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    const res = await getContent(req('type=movies&movieCount=10'));
    const d = await res.json();
    expect(res.status).toBe(503);
    expect(d.error).toContain('seed');
    expect(d.results).toEqual([]);
  });
});
