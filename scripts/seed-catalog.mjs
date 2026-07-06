// ═══════════════════════════════════════════════════════════════
//  FlickPick catalog seeder
//  Pulls top movies + series from TMDB into OUR OWN Supabase
//  catalog table. After this runs, the app never calls TMDB at
//  runtime — decks, filters, and recommendations are served from
//  our database.
//
//  Usage:
//    TMDB_API_KEY=xxx \
//    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
//    SUPABASE_SERVICE_ROLE_KEY=xxx \
//    node scripts/seed-catalog.mjs
//
//  Runs weekly via .github/workflows/refresh-catalog.yml (free).
// ═══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const TMDB_KEY = process.env.TMDB_API_KEY;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_KEY || !SB_URL || !SB_KEY) {
  console.error('Missing env. Need: TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  if (process.env.GITHUB_ACTIONS) {
    console.error('');
    console.error('This is running in GitHub Actions — Vercel env vars are NOT available here.');
    console.error('Add the three values as GitHub repo secrets:');
    console.error('  GitHub repo → Settings → Secrets and variables → Actions → "New repository secret"');
  } else {
    console.error('Locally: put them in .env.local and run `npm run seed` (which sources it).');
  }
  process.exit(1);
}

const sb = createClient(SB_URL, SB_KEY);
const BASE = 'https://api.themoviedb.org/3';
// Series ids are offset to avoid colliding with movie ids — must match
// src/lib/constants.js SERIES_OFFSET. 100M is far above any TMDB id.
const SERIES_OFFSET = 100000000;

const GENRE = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
  27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
  53:'Thriller',10752:'War',37:'Western',
  10762:'Kids',10768:'War',
};
// TMDB's TV taxonomy uses COMBO genres — store both halves so "Fantasy" or
// "Adventure" filters can actually match series.
const GENRE_MULTI = { 10759:['Action','Adventure'], 10765:['Sci-Fi','Fantasy'] };
const mapGenres = ids => [...new Set((ids || []).flatMap(g => GENRE_MULTI[g] || (GENRE[g] ? [GENRE[g]] : [])))];
const PROV = {
  8:'Netflix',9:'Prime Video',119:'Prime Video',337:'Disney+',
  384:'HBO Max',1899:'HBO Max',350:'Apple TV+',2:'Apple TV+',15:'Hulu',
};
const LOGO = 'https://image.tmdb.org/t/p/w45';

// Canonical brand names — mirrors normProvider in src/lib/constants.js so
// catalog rows store the same names the app filters/displays with.
const ALIAS = {
  'Amazon Prime Video': 'Prime Video', 'Amazon Video': 'Prime Video',
  'Disney Plus': 'Disney+', 'Disney+ Hotstar': 'Hotstar', 'JioHotstar': 'Hotstar',
  'Apple TV Plus': 'Apple TV+', 'Apple TV': 'Apple TV+',
  'HBO Max': 'Max',
};
function normProvider(name) {
  let n = String(name || '').trim()
    .replace(/\s+(Amazon|Apple TV|Roku Premium)\s+Channel$/i, '')
    .replace(/\s+(basic\s+)?with\s+ads$/i, '')
    .replace(/\s+(standard|premium)$/i, '');
  return ALIAS[n] || n;
}

// Collect flatrate providers (canonical name + official logo url), deduped.
function collectProv(region) {
  const seen = new Map();
  for (const p of region.flatrate || []) {
    const name = normProvider(PROV[p.provider_id] || p.provider_name);
    if (name && !seen.has(name)) seen.set(name, p.logo_path ? `${LOGO}${p.logo_path}` : '');
  }
  return { providers: [...seen.keys()], provider_logos: [...seen.values()] };
}

// [endpoint, pages] — breadth across lists gives the catalog range
// (recent + all-time + currently airing), dedupe collapses overlap.
const MOVIE_LISTS = [
  ['/movie/popular', 8], ['/movie/top_rated', 5], ['/trending/movie/week', 3],
  ['/movie/now_playing', 3], ['/movie/upcoming', 2],
];
const TV_LISTS = [
  ['/tv/popular', 8], ['/tv/top_rated', 5], ['/trending/tv/week', 3],
  ['/tv/on_the_air', 3], ['/tv/airing_today', 2],
];

async function tmdb(path, params = {}, attempt = 1) {
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set('api_key', TMDB_KEY);
  u.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u);
  if (r.status === 429 && attempt <= 4) {
    await new Promise(res => setTimeout(res, attempt * 1500));
    return tmdb(path, params, attempt + 1);
  }
  if (!r.ok) throw new Error(`TMDB ${r.status}: ${path}`);
  return r.json();
}

async function collect(lists) {
  const map = new Map();
  for (const [ep, pages] of lists) {
    for (let p = 1; p <= pages; p++) {
      try {
        const d = await tmdb(ep, { page: String(p) });
        for (const raw of d.results || []) {
          if (raw.poster_path && (raw.title || raw.name)) map.set(raw.id, raw);
        }
      } catch (e) { console.warn(`  skip ${ep} p${p}: ${e.message}`); }
    }
  }
  return [...map.values()];
}

// Run fn over items with bounded concurrency
async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]).catch(() => null);
    }
  }));
  return out;
}

const yearOf = d => (d ? Number(String(d).slice(0, 4)) || null : null);
const hitScore = (rating, votes) => Math.round(rating * Math.log10(votes + 1) * 100) / 100;

async function enrichMovie(raw) {
  const [det, prov] = await Promise.all([
    tmdb(`/movie/${raw.id}`).catch(() => ({})),
    tmdb(`/movie/${raw.id}/watch/providers`).catch(() => ({})),
  ]);
  const region = prov.results?.IN || prov.results?.US || {};
  const mins = det.runtime || 0;
  return {
    id: raw.id, tmdb_id: raw.id, type: 'movie',
    title: raw.title,
    year: yearOf(raw.release_date),
    release_date: raw.release_date || null,
    genres: mapGenres(raw.genre_ids),
    rating: Math.round((raw.vote_average || 0) * 10) / 10,
    votes: raw.vote_count || 0,
    popularity: raw.popularity || 0,
    hit_score: hitScore(raw.vote_average || 0, raw.vote_count || 0),
    poster_path: raw.poster_path,
    overview: raw.overview || '',
    duration: mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '',
    seasons: 0, episodes: 0, status: '', network: '',
    ...collectProv(region),
    updated_at: new Date().toISOString(),
  };
}

async function enrichSeries(raw) {
  const [det, prov] = await Promise.all([
    tmdb(`/tv/${raw.id}`).catch(() => ({})),
    tmdb(`/tv/${raw.id}/watch/providers`).catch(() => ({})),
  ]);
  const region = prov.results?.IN || prov.results?.US || {};
  const seasons = det.number_of_seasons || 0;
  return {
    id: raw.id + SERIES_OFFSET, tmdb_id: raw.id, type: 'series',
    title: raw.name,
    year: yearOf(raw.first_air_date),
    release_date: raw.first_air_date || null,
    genres: mapGenres(raw.genre_ids),
    rating: Math.round((raw.vote_average || 0) * 10) / 10,
    votes: raw.vote_count || 0,
    popularity: raw.popularity || 0,
    hit_score: hitScore(raw.vote_average || 0, raw.vote_count || 0),
    poster_path: raw.poster_path,
    overview: raw.overview || '',
    duration: seasons > 0 ? `${seasons} Season${seasons !== 1 ? 's' : ''}` : '',
    seasons,
    episodes: det.number_of_episodes || 0,
    status: det.status || '',
    network: det.networks?.[0]?.name || '',
    ...collectProv(region),
    updated_at: new Date().toISOString(),
  };
}

let logosSupported = true; // flips off if the DB predates the provider_logos column

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 100) {
    let batch = rows.slice(i, i + 100);
    if (!logosSupported) batch = batch.map(({ provider_logos, ...r }) => r);
    let { error } = await sb.from('catalog').upsert(batch, { onConflict: 'id' });
    // Database created from an older schema → retry without the new column
    // so seeding still succeeds, and tell the user the one-liner to add it.
    if (error && logosSupported && /provider_logos/i.test(error.message)) {
      logosSupported = false;
      console.warn('⚠ catalog.provider_logos column missing — seeding without logos.');
      console.warn('  To store real provider logos, run this once in the Supabase SQL editor:');
      console.warn("  alter table catalog add column if not exists provider_logos text[] not null default '{}';");
      console.warn('  …then re-run `npm run seed`.');
      batch = batch.map(({ provider_logos, ...r }) => r);
      ({ error } = await sb.from('catalog').upsert(batch, { onConflict: 'id' }));
    }
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

(async () => {
  console.log('▶ Collecting movie lists…');
  const movies = await collect(MOVIE_LISTS);
  console.log(`  ${movies.length} unique movies`);

  console.log('▶ Collecting series lists…');
  const series = await collect(TV_LISTS);
  console.log(`  ${series.length} unique series`);

  console.log('▶ Enriching movies (details + providers)…');
  const movieRows = (await pool(movies, 8, enrichMovie)).filter(Boolean);

  console.log('▶ Enriching series (details + providers)…');
  const seriesRows = (await pool(series, 8, enrichSeries)).filter(Boolean);

  console.log(`▶ Upserting ${movieRows.length + seriesRows.length} rows into catalog…`);
  await upsert(movieRows);
  await upsert(seriesRows);

  const { count } = await sb.from('catalog').select('*', { count: 'exact', head: true });
  console.log(`✔ Done. Catalog now holds ${count} titles (${movieRows.length} movies, ${seriesRows.length} series refreshed).`);
  process.exit(0);
})().catch(e => { console.error('✖ Seed failed:', e.message); process.exit(1); });
