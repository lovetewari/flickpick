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

    const hot = category === 'hot' ? await hotIds() : null;
    const opts = { category, genre, platforms, hot };

    const [movies, series] = await Promise.all([
      type !== 'series' ? buildDeck('movie', movieCount, opts) : [],
      type !== 'movies' ? buildDeck('series', seriesCount, opts) : [],
    ]);

    let results = [...movies, ...series].map(toItem);
    if (type === 'all') results.sort((a, b) => b.popularity - a.popularity);

    if (results.length === 0) {
      const { count } = await sb.from('catalog').select('*', { count: 'exact', head: true });
      if (!count) {
        return Response.json(
          { error: 'Catalog is empty — run `node scripts/seed-catalog.mjs` once (see README).', results: [] },
          { status: 503 }
        );
      }
    }

    return Response.json({ results, count: results.length });
  } catch (err) {
    console.error('Content error:', err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
