// ═══════════════════════════════════════════════════
//  TMDB API Integration — Server-side only
//  Free: themoviedb.org → Settings → API → v3 key
// ═══════════════════════════════════════════════════

const BASE = 'https://api.themoviedb.org/3';
const IMG  = 'https://image.tmdb.org/t/p/w500';

function key() {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error('Missing TMDB_API_KEY');
  return k;
}

async function tmdb(path, params = {}) {
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set('api_key', key());
  u.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`TMDB ${r.status}: ${path}`);
  return r.json();
}

// ── Genre ID → Name ──
const GENRE = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
  27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
  53:'Thriller',10752:'War',37:'Western',
  10759:'Action',10762:'Kids',10765:'Sci-Fi',10768:'War',
};

// ── Provider ID → Platform name ──
const PROV = {
  8:'Netflix',9:'Prime Video',119:'Prime Video',337:'Disney+',
  384:'HBO Max',1899:'HBO Max',350:'Apple TV+',2:'Apple TV+',
  15:'Hulu',
};

// ═══ Fetch watch providers for a title ═══
async function getProviders(id, type) {
  try {
    const d = await tmdb(`/${type}/${id}/watch/providers`);
    const r = d.results?.IN || d.results?.US || {};
    return (r.flatrate || []).map(p => PROV[p.provider_id]).filter(Boolean);
  } catch { return []; }
}

// ═══ Get movie details (runtime) ═══
async function movieDetails(id) {
  try {
    const d = await tmdb(`/movie/${id}`);
    const m = d.runtime || 0;
    return { duration: m > 0 ? `${Math.floor(m/60)}h ${m%60}m` : '' };
  } catch { return { duration: '' }; }
}

// ═══ Get series details (seasons, episodes, status, network) ═══
async function seriesDetails(id) {
  try {
    const d = await tmdb(`/tv/${id}`);
    return {
      seasons: d.number_of_seasons || 0,
      episodes: d.number_of_episodes || 0,
      status: d.status || '',           // "Returning Series", "Ended", "Canceled"
      network: d.networks?.[0]?.name || '',
      lastAir: d.last_air_date || '',
      duration: `${d.number_of_seasons || '?'} Season${(d.number_of_seasons||0) !== 1 ? 's' : ''}`,
    };
  } catch { return { seasons:0, episodes:0, status:'', network:'', lastAir:'', duration:'' }; }
}

// ═══ Normalize a raw TMDB movie ═══
function normMovie(m) {
  if (!m.poster_path || !m.title) return null;
  return {
    id: m.id,
    title: m.title,
    year: m.release_date ? new Date(m.release_date).getFullYear() : 0,
    genre: (m.genre_ids||[]).map(g => GENRE[g]).filter(Boolean).slice(0,3),
    rating: Math.round((m.vote_average||0)*10)/10,
    poster: `${IMG}${m.poster_path}`,
    posterPath: m.poster_path,
    desc: m.overview || '',
    duration: '', ott: [],
    type: 'movie',
    popularity: m.popularity || 0,
  };
}

// ═══ Normalize a raw TMDB series ═══
function normSeries(s) {
  if (!s.poster_path || !s.name) return null;
  return {
    id: s.id + 200000,   // offset to avoid movie ID collision
    tmdbId: s.id,
    title: s.name,
    year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 0,
    genre: (s.genre_ids||[]).map(g => GENRE[g]).filter(Boolean).slice(0,3),
    rating: Math.round((s.vote_average||0)*10)/10,
    poster: `${IMG}${s.poster_path}`,
    posterPath: s.poster_path,
    desc: s.overview || '',
    duration: '', ott: [],
    type: 'series',
    seasons: 0, episodes: 0, status: '', network: '',
    popularity: s.popularity || 0,
  };
}

// ═══ Enrich item with providers + details ═══
async function enrich(item) {
  try {
    const tmdbType = item.type === 'movie' ? 'movie' : 'tv';
    const realId = item.type === 'series' ? (item.tmdbId || item.id - 200000) : item.id;
    const [provs, details] = await Promise.all([
      getProviders(realId, tmdbType),
      item.type === 'movie' ? movieDetails(realId) : seriesDetails(realId),
    ]);
    return {
      ...item,
      ott: provs,
      duration: details.duration || item.duration,
      seasons: details.seasons ?? item.seasons,
      episodes: details.episodes ?? item.episodes,
      status: details.status || item.status,
      network: details.network || item.network,
    };
  } catch { return item; }
}

// ═══════════════════════════════════════════════════
//  PUBLIC: fetchContent — main entry point
// ═══════════════════════════════════════════════════
export async function fetchContent({ contentType, category, platforms = [], genre = 'All' }) {
  let movies = [], series = [];

  // ── Fetch MOVIES (if type is 'movies' or 'all') ──
  if (contentType !== 'series') {
    const endpoints = {
      trending:    '/trending/movie/week',
      popular:     '/movie/popular',
      top_rated:   '/movie/top_rated',
      now_playing: '/movie/now_playing',
      upcoming:    '/movie/upcoming',
    };
    const ep = endpoints[category] || endpoints.trending;
    // Fetch 2 pages for more variety
    const [p1, p2] = await Promise.all([
      tmdb(ep, { page: '1' }),
      tmdb(ep, { page: '2' }),
    ]);
    movies = [...(p1.results||[]), ...(p2.results||[])]
      .map(normMovie).filter(Boolean);
  }

  // ── Fetch SERIES (if type is 'series' or 'all') ──
  if (contentType !== 'movies') {
    const endpoints = {
      trending:     '/trending/tv/week',
      popular:      '/tv/popular',
      top_rated:    '/tv/top_rated',
      airing_today: '/tv/airing_today',
      on_the_air:   '/tv/on_the_air',
    };
    // Map movie-only categories to series equivalents
    const catMap = { now_playing: 'airing_today', upcoming: 'on_the_air' };
    const cat = catMap[category] || category;
    const ep = endpoints[cat] || endpoints.trending;
    const [p1, p2] = await Promise.all([
      tmdb(ep, { page: '1' }),
      tmdb(ep, { page: '2' }),
    ]);
    series = [...(p1.results||[]), ...(p2.results||[])]
      .map(normSeries).filter(Boolean);
  }

  let all = [...movies, ...series];

  // ── Deduplicate ──
  const seen = new Set();
  all = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });

  // ── Genre filter ──
  if (genre && genre !== 'All') {
    all = all.filter(c => c.genre.includes(genre));
  }

  // ── Sort by popularity ──
  all.sort((a, b) => b.popularity - a.popularity);

  // ── Enrich top 40 with providers + details (parallel, capped) ──
  const top = all.slice(0, 40);
  const enriched = await Promise.all(top.map(enrich));

  // ── Platform filter (after enrichment since we need ott data) ──
  let result = enriched;
  if (platforms.length > 0) {
    result = enriched.filter(c => c.ott.some(o => platforms.includes(o)));
  }

  // ── If platform filter killed too many, fall back to unfiltered ──
  if (result.length < 5 && platforms.length > 0) {
    result = enriched; // show all with a note
  }

  return result;
}
