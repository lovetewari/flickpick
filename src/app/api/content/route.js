// ═══════════════════════════════════════════════════════════════
//  Deck builder — serves swipe decks from OUR OWN catalog table.
//  No TMDB at runtime. Categories are computed by us; "hot" is
//  ranked by real FlickPick swipe data.
// ═══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import { LEGACY_CATEGORY, SERIES_OFFSET } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const IMG = 'https://image.tmdb.org/t/p/w500';

const clampCount = v => Math.min(50, Math.max(1, parseInt(v, 10) || 20));

// DB row → the content shape the UI already uses (SwipeCard, results, history)
function toItem(r) {
  return {
    id: r.id,
    title: r.title,
    year: r.year || 0,
    genre: r.genres || [],
    rating: Number(r.rating) || 0,
    poster: `${IMG}${r.poster_path}`,
    posterPath: r.poster_path,
    desc: r.overview || '',
    duration: r.duration || '',
    ott: r.providers || [],
    type: r.type,
    seasons: r.seasons || 0,
    episodes: r.episodes || 0,
    status: r.status || '',
    network: r.network || '',
    popularity: Number(r.popularity) || 0,
  };
}

// Category → ordering/filters on the catalog query
function applyCategory(q, category) {
  switch (category) {
    case 'latest':
      return q.not('release_date', 'is', null).gte('votes', 20).order('release_date', { ascending: false });
    case 'most_watched':
      return q.order('popularity', { ascending: false });
    case 'top_rated':
      return q.gte('votes', 200).order('rating', { ascending: false });
    case 'hidden_gems':
      return q.gte('rating', 7.3).gte('votes', 50).lte('votes', 5000).order('rating', { ascending: false });
    case 'hits':
    default:
      return q.order('hit_score', { ascending: false });
  }
}

// Our recommendation signal: most-liked content ids across ALL rooms.
// Uses the stored content_type (never id-range guessing), translates any
// not-yet-migrated legacy series ids (old +200,000 offset), and orders the
// window deterministically (most recent likes, within PostgREST's row cap).
async function hotIds() {
  const { data } = await sb
    .from('swipes')
    .select('content_id, content_type')
    .eq('liked', true)
    .order('created_at', { ascending: false })
    .limit(1000);
  const counts = { movie: new Map(), series: new Map() };
  for (const s of data || []) {
    const type = s.content_type === 'series' ? 'series' : 'movie';
    let id = s.content_id;
    if (type === 'series' && id < SERIES_OFFSET) id = id - 200000 + SERIES_OFFSET; // legacy row
    counts[type].set(id, (counts[type].get(id) || 0) + 1);
  }
  const rank = m => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id]) => id);
  return { movie: rank(counts.movie), series: rank(counts.series) };
}

// Build one deck for a type ('movie' | 'series'), honoring filters with
// graceful fallbacks so the host always gets a full deck when possible.
async function buildDeck(type, count, { category, genre, platforms, hot }) {
  const query = (usePlatforms) => {
    let q = sb.from('catalog').select('*').eq('type', type);
    if (genre && genre !== 'All') q = q.contains('genres', [genre]);
    if (usePlatforms && platforms.length) q = q.overlaps('providers', platforms);
    return q;
  };

  const picked = [];
  const seen = new Set();
  const take = rows => {
    for (const r of rows || []) {
      if (picked.length >= count) break;
      if (!seen.has(r.id)) { seen.add(r.id); picked.push(r); }
    }
  };

  const hotForType = hot?.[type === 'series' ? 'series' : 'movie'] || [];
  if (category === 'hot' && hotForType.length) {
    // Swipe-ranked ids for this type, then hydrate from catalog keeping rank order
    const ids = hotForType.slice(0, 300);
    const { data } = await query(true).in('id', ids);
    const rank = new Map(ids.map((id, i) => [id, i]));
    take((data || []).sort((a, b) => rank.get(a.id) - rank.get(b.id)));
  }

  // Primary category fill (also the fallback when 'hot' has little data yet)
  if (picked.length < count) {
    const { data } = await applyCategory(query(true), category === 'hot' ? 'hits' : category).limit(count * 2);
    take(data);
  }

  // Platform filter starved the deck → fill the rest ignoring platforms
  if (picked.length < count && platforms.length) {
    const { data } = await applyCategory(query(false), category === 'hot' ? 'hits' : category).limit(count * 2);
    take(data);
  }

  return picked.slice(0, count);
}

// ── Live TMDB fallback deck ──
// Keeps rooms playable before the catalog is seeded (or if the DB is down).
// No provider data at this tier — platform filters are skipped, everything
// else (category, genre, counts) is honored.
const TMDB_GENRE = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action', 10762: 'Kids', 10765: 'Sci-Fi', 10768: 'War',
};
const TMDB_CAT = {
  movie: { hot: '/trending/movie/week', hits: '/movie/popular', most_watched: '/movie/popular', latest: '/movie/now_playing', top_rated: '/movie/top_rated', hidden_gems: '/movie/top_rated' },
  series: { hot: '/trending/tv/week', hits: '/tv/popular', most_watched: '/tv/popular', latest: '/tv/on_the_air', top_rated: '/tv/top_rated', hidden_gems: '/tv/top_rated' },
};

async function tmdbFallbackDeck(type, count, { category, genre }) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const base = 'https://api.themoviedb.org/3';
  const ep = TMDB_CAT[type][category] || TMDB_CAT[type].hits;
  const get = page =>
    fetch(`${base}${ep}?api_key=${key}&language=en-US&page=${page}`, {
      signal: AbortSignal.timeout(5000), next: { revalidate: 1800 },
    }).then(r => r.json()).catch(() => ({}));
  const [p1, p2] = await Promise.all([get(1), get(2)]);
  const offset = type === 'series' ? SERIES_OFFSET : 0;
  let rows = [...(p1.results || []), ...(p2.results || [])]
    .filter(x => x.poster_path && (x.title || x.name))
    .map(x => ({
      id: x.id + offset,
      title: x.title || x.name,
      year: Number(String(x.release_date || x.first_air_date || '').slice(0, 4)) || 0,
      genre: (x.genre_ids || []).map(g => TMDB_GENRE[g]).filter(Boolean).slice(0, 3),
      rating: Math.round((x.vote_average || 0) * 10) / 10,
      poster: `${IMG}${x.poster_path}`,
      posterPath: x.poster_path,
      desc: x.overview || '',
      duration: '', ott: [], type,
      seasons: 0, episodes: 0, status: '', network: '',
      popularity: x.popularity || 0,
    }));
  if (genre && genre !== 'All') {
    const filtered = rows.filter(r => r.genre.includes(genre));
    if (filtered.length >= Math.min(5, count)) rows = filtered; // don't starve the deck
  }
  return rows.slice(0, count);
}

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const type = u.searchParams.get('type') || 'all';
    const rawCat = u.searchParams.get('category') || 'hot';
    const category = LEGACY_CATEGORY[rawCat] || rawCat;
    const genre = u.searchParams.get('genre') || 'All';
    const platforms = u.searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const movieCount = clampCount(u.searchParams.get('movieCount'));
    const seriesCount = clampCount(u.searchParams.get('seriesCount'));

    const hot = category === 'hot' ? await hotIds().catch(() => null) : null;
    const opts = { category, genre, platforms, hot };

    const [movies, series] = await Promise.all([
      type !== 'series' ? buildDeck('movie', movieCount, opts).catch(() => []) : [],
      type !== 'movies' ? buildDeck('series', seriesCount, opts).catch(() => []) : [],
    ]);

    let results = [...movies, ...series].map(toItem);

    // Catalog empty/unreachable → build the deck live from TMDB so rooms
    // still work before seeding.
    if (results.length === 0) {
      const [fm, fs] = await Promise.all([
        type !== 'series' ? tmdbFallbackDeck('movie', movieCount, opts) : [],
        type !== 'movies' ? tmdbFallbackDeck('series', seriesCount, opts) : [],
      ]);
      results = [...fm, ...fs];
    }

    if (type === 'all') results.sort((a, b) => b.popularity - a.popularity);

    if (results.length === 0) {
      return Response.json(
        { error: 'No titles available — seed the catalog (GitHub Action "Refresh catalog" or `npm run seed`) and check /api/health.', results: [] },
        { status: 503 }
      );
    }

    return Response.json({ results, count: results.length });
  } catch (err) {
    console.error('Content error:', err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
