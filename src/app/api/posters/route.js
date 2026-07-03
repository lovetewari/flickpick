// Trending titles for the landing (strip + poster-wall backdrop) WITH
// "where to watch" availability — the streaming platform(s) a title is on, or
// an "In Theaters" tag for current theatrical releases.
//
// Source order: OUR catalog (keyless, providers pre-seeded) → live TMDB
// trending + watch-providers (needs TMDB_API_KEY) → keyless iTunes charts.
import { createClient } from '@supabase/supabase-js';
import { normProvider, isValidLogoUrl, SERIES_OFFSET } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const IMG = 'https://image.tmdb.org/t/p/w185'; // smaller posters = much faster load
const LOGO = 'https://image.tmdb.org/t/p/w45'; // official provider logos (tiny)
const CAP = 18;               // titles shown in the strip
const REGION = 'IN';          // watch-provider region (fallback to US)

// ── Server-side response cache ──
// Trending is identical for everyone, so compute the (catalog/TMDB/iTunes +
// provider fan-out) result ONCE and serve it from memory for 30 minutes.
// Cold load does ~20 upstream calls; every request after that is instant.
const TTL = process.env.NODE_ENV === 'test' ? 0 : 30 * 60 * 1000;
let CACHE = { t: 0, payload: null };

function weekInfo(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
  return {
    key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
    start: monday.toISOString(),
  };
}

// Skip the catalog tier instantly when Supabase env is missing/placeholder,
// instead of waiting on a doomed network call.
const supabaseConfigured = () => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return /^https:\/\/.+\.supabase\.co/i.test(u) && !/your-project-id|placeholder|PASTE_|dummy/i.test(u);
};

// The backdrop wall is dimmed + behind a scrim — thumbnail-size images look
// identical there and are ~5-10× smaller than the strip posters.
function toWallPoster(url) {
  return String(url)
    .replace('/t/p/w185/', '/t/p/w92/')                     // TMDB
    .replace(/\/\d+x\d+bb(-\d+)?\.(png|jpg)/, '/150x225bb.jpg'); // mzstatic
}

function tmdbDetailsUrl(type, id) {
  const raw = type === 'series' && Number(id) >= SERIES_OFFSET ? Number(id) - SERIES_OFFSET : Number(id);
  if (!raw) return null;
  return `https://www.themoviedb.org/${type === 'series' ? 'tv' : 'movie'}/${raw}`;
}

function tmdbSearchUrl(title) {
  const q = String(title || '').trim();
  return q ? `https://www.themoviedb.org/search?query=${encodeURIComponent(q)}` : null;
}

function itunesDetailsUrl(entry, title) {
  const links = Array.isArray(entry.link) ? entry.link : (entry.link ? [entry.link] : []);
  const alternate = links.find(l => l?.attributes?.rel === 'alternate' && l?.attributes?.href)?.attributes.href;
  if (alternate) return alternate;
  if (typeof entry.id?.label === 'string' && /^https:\/\//i.test(entry.id.label)) return entry.id.label;
  return tmdbSearchUrl(title);
}

// Dedupe flatrate providers by display name, keeping the first logo for each.
function collectProviders(flatrate = []) {
  const seen = new Map();
  for (const p of flatrate) {
    const name = normProvider(p.provider_name);
    const url = p.logo_path && String(p.logo_path).startsWith('/') ? `${LOGO}${p.logo_path}` : null;
    if (name && !seen.has(name)) seen.set(name, isValidLogoUrl(url) ? url : null);
  }
  const names = [...seen.keys()].slice(0, 3);
  return { providers: names, providerLogos: names.map(n => seen.get(n)) };
}

// A movie with no streaming home yet + a very recent/upcoming release ≈ cinema
const recentRelease = date => {
  if (!date) return false;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return false;
  const days = (Date.now() - t) / 86400000;
  return days <= 120; // released within ~4 months, or still upcoming (negative)
};

function interleave(a, b, cap = CAP) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < cap; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

async function weeklyLikedIds(sb, since) {
  const { data } = await sb
    .from('swipes')
    .select('content_id, content_type, created_at')
    .eq('liked', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);

  const counts = new Map();
  for (const s of data || []) {
    const type = s.content_type === 'series' ? 'series' : 'movie';
    let id = Number(s.content_id);
    if (!id) continue;
    if (type === 'series' && id < SERIES_OFFSET) id = id - 200000 + SERIES_OFFSET;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id]) => id);
}

// ── Catalog (providers already stored by the seeder) ──
async function fromCatalog(weekStart) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [weeklyIds, m, s] = await Promise.all([
    weeklyLikedIds(sb, weekStart).catch(() => []),
    ...['movie', 'series'].map(type =>
    sb.from('catalog').select('id, title, poster_path, year, type, rating, providers, provider_logos, release_date')
      .eq('type', type).order('popularity', { ascending: false }).limit(20)
    ),
  ]);
  const toItem = r => {
    // Pair each stored provider name with its stored logo (aligned arrays)
    const seen = new Map();
    (r.providers || []).forEach((name, i) => {
      const n = normProvider(name);
      const logo = (r.provider_logos || [])[i];
      if (n && !seen.has(n)) seen.set(n, isValidLogoUrl(logo) ? logo : null); // reject junk urls
    });
    const providers = [...seen.keys()].slice(0, 3);
    return {
      id: r.id, title: r.title, poster: `${IMG}${r.poster_path}`, year: r.year || null,
      type: r.type, rating: Number(r.rating) || 0,
      providers,
      providerLogos: providers.map(n => seen.get(n)),
      inTheaters: r.type === 'movie' && providers.length === 0 && recentRelease(r.release_date),
      detailsUrl: tmdbDetailsUrl(r.type, r.id),
    };
  };
  const popular = interleave((m.data || []).map(toItem), (s.data || []).map(toItem), CAP);
  if (!weeklyIds.length) return popular;

  const { data: weeklyRows } = await sb
    .from('catalog')
    .select('id, title, poster_path, year, type, rating, providers, provider_logos, release_date')
    .in('id', weeklyIds.slice(0, CAP * 3));
  const rank = new Map(weeklyIds.map((id, i) => [id, i]));
  const weekly = (weeklyRows || []).map(toItem).sort((a, b) => rank.get(a.id) - rank.get(b.id));
  const seen = new Set(weekly.map(i => i.id));
  return [...weekly, ...popular.filter(i => !seen.has(i.id))].slice(0, CAP);
}

// ── TMDB trending + watch providers ──
async function fromTmdb() {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const base = 'https://api.themoviedb.org/3';
  const tget = path => fetch(`${base}${path}${path.includes('?') ? '&' : '?'}api_key=${key}&language=en-US`,
    { signal: AbortSignal.timeout(4000), next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({}));

  const [m, t] = await Promise.all([tget('/trending/movie/week'), tget('/trending/tv/week')]);
  const map = (arr, type) => (arr || [])
    .filter(x => x.poster_path && (x.title || x.name))
    .map(x => ({
      id: x.id, title: x.title || x.name, poster: `${IMG}${x.poster_path}`,
      releaseDate: x.release_date || x.first_air_date || '',
      year: Number(String(x.release_date || x.first_air_date || '').slice(0, 4)) || null,
      type, rating: Math.round((x.vote_average || 0) * 10) / 10,
      detailsUrl: tmdbDetailsUrl(type, x.id),
    }));
  const items = interleave(map(m.results, 'movie'), map(t.results, 'series'));

  // Enrich only the shown titles with real streaming availability
  await Promise.all(items.map(async it => {
    const d = await tget(`/${it.type === 'series' ? 'tv' : 'movie'}/${it.id}/watch/providers`);
    const region = d.results?.[REGION] || d.results?.US || {};
    const { providers, providerLogos } = collectProviders(region.flatrate);
    it.providers = providers;
    it.providerLogos = providerLogos;                 // real TMDB logos
    it.inTheaters = it.type === 'movie' && providers.length === 0 && recentRelease(it.releaseDate);
    delete it.releaseDate;
  }));
  return items;
}

// ── Keyless iTunes charts (Apple TV store) ──
async function fromItunes() {
  const feeds = [
    ['https://itunes.apple.com/us/rss/topmovies/limit=25/json', 'movie'],
    ['https://itunes.apple.com/us/rss/toptvseasons/limit=25/json', 'series'],
  ];
  const [m, t] = await Promise.all(feeds.map(([u]) =>
    fetch(u, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }).then(r => r.json()).catch(() => null)
  ));
  const map = (feed, type) => (feed?.feed?.entry || []).map(e => {
    const art = e['im:image']?.[2]?.label || '';
    const title = (e['im:name']?.label || '').trim();
    return {
      id: Number(e.id?.attributes?.['im:id']) || 0,
      title,
      // .jpg is dramatically smaller than Apple's default PNG artwork
      poster: art.replace(/\/\d+x\d+bb(-\d+)?\.(png|jpg)/, '/300x450bb.jpg'),
      year: Number(String(e['im:releaseDate']?.label || '').slice(0, 4)) || null,
      type, rating: 0,
      // iTunes is only the chart source here. It is not reliable availability,
      // so do not label every fallback title as Apple TV+.
      providers: [],
      providerLogos: [],
      inTheaters: false,
      detailsUrl: itunesDetailsUrl(e, title),
    };
  }).filter(x => x.title && x.poster);
  return interleave(map(m, 'movie'), map(t, 'series'));
}

export async function GET() {
  try {
    const week = weekInfo();
    if (CACHE.payload && CACHE.payload.week === week.key && Date.now() - CACHE.t < TTL) {
      return Response.json(CACHE.payload);
    }
    let items = supabaseConfigured() ? await fromCatalog(week.start).catch(() => []) : [];
    if (items.length === 0) items = await fromTmdb().catch(() => []);
    if (items.length === 0) items = await fromItunes().catch(() => []);
    items = items.map((item, i) => ({ ...item, rank: i + 1 }));
    const payload = {
      week: week.key,
      generatedAt: new Date().toISOString(),
      items,
      posters: items.map(i => i.poster),
      wallPosters: items.slice(0, 24).map(i => toWallPoster(i.poster)),
    };
    if (items.length) CACHE = { t: Date.now(), payload };
    return Response.json(payload);
  } catch {
    return Response.json({ items: [], posters: [], wallPosters: [] });
  }
}
