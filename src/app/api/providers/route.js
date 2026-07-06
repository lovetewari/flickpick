// Streaming platforms row for the landing — REAL provider logos served from
// TMDB's watch-provider registry (data & logos courtesy of JustWatch via
// TMDB; we render the required attribution next to them in the UI).
import { isValidLogoUrl, normProvider } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const LOGO = 'https://image.tmdb.org/t/p/w92';
const REGION = 'IN';
// Show the household names first, whatever the region ranking says.
const PREFERRED = ['Netflix', 'Prime Video', 'Hotstar', 'Disney+', 'Apple TV+', 'Max', 'JioCinema', 'SonyLIV', 'ZEE5', 'Hulu', 'Paramount+', 'Peacock'];

const TTL = process.env.NODE_ENV === 'test' ? 0 : 24 * 60 * 60 * 1000; // daily
let CACHE = { t: 0, payload: null };

export async function GET() {
  try {
    if (CACHE.payload && Date.now() - CACHE.t < TTL) return Response.json(CACHE.payload);
    const key = process.env.TMDB_API_KEY;
    if (!key) return Response.json({ providers: [], logos: {} });

    const get = url => fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } })
      .then(r => r.json()).catch(() => ({}));
    // Regional list drives the landing row; the regionless movie+tv registry
    // supplies official logos for EVERY brand (Disney+/Max/Hulu aren't listed
    // for IN, so the lobby picker would fall back to letter chips without it).
    const [regional, movieAll, tvAll] = await Promise.all([
      get(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${key}&language=en-US&watch_region=${REGION}`),
      get(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${key}&language=en-US`),
      get(`https://api.themoviedb.org/3/watch/providers/tv?api_key=${key}&language=en-US`),
    ]);
    const seen = new Map();
    for (const p of regional.results || []) {
      const name = normProvider(p.provider_name);
      if (!name || !p.logo_path || seen.has(name)) continue;
      if (/justwatch/i.test(name)) continue; // data aggregator, not a streaming platform
      if (/store|google play|youtube|movies anywhere/i.test(name)) continue; // rent/buy storefronts, not streaming subs
      const logo = `${LOGO}${p.logo_path}`;
      if (!isValidLogoUrl(logo)) continue; // only trusted TMDB CDN logos
      seen.set(name, {
        name,
        logo,
        priority: PREFERRED.indexOf(name) !== -1 ? PREFERRED.indexOf(name) : 100 + (p.display_priorities?.[REGION] ?? p.display_priority ?? 999),
      });
    }
    const providers = [...seen.values()].sort((a, b) => a.priority - b.priority).slice(0, 8)
      .map(({ name, logo }) => ({ name, logo }));
    // name → official logo for every normalized brand in the global registry.
    // Several raw names collapse to one brand ("HBO Max Amazon Channel" →
    // Max); the SHORTEST raw name is the parent brand, so its logo wins —
    // otherwise a channel-bundle mark can hijack the brand's chip.
    const best = new Map();
    for (const p of [...(movieAll.results || []), ...(tvAll.results || [])]) {
      const raw = String(p.provider_name || '').trim();
      const name = normProvider(raw);
      if (!name || !p.logo_path) continue;
      const logo = `${LOGO}${p.logo_path}`;
      if (!isValidLogoUrl(logo)) continue;
      const cur = best.get(name);
      if (!cur || raw.length < cur.rawLen) best.set(name, { logo, rawLen: raw.length });
    }
    const logos = Object.fromEntries([...best.entries()].map(([n, v]) => [n, v.logo]));
    const payload = { providers, logos };
    if (providers.length) CACHE = { t: Date.now(), payload };
    return Response.json(payload);
  } catch {
    return Response.json({ providers: [], logos: {} });
  }
}
