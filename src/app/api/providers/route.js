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
    if (!key) return Response.json({ providers: [] });

    const r = await fetch(
      `https://api.themoviedb.org/3/watch/providers/movie?api_key=${key}&language=en-US&watch_region=${REGION}`,
      { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } }
    );
    const d = await r.json();
    const seen = new Map();
    for (const p of d.results || []) {
      const name = normProvider(p.provider_name);
      if (!name || !p.logo_path || seen.has(name)) continue;
      if (/justwatch/i.test(name)) continue; // data aggregator, not a streaming platform
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
    const payload = { providers };
    if (providers.length) CACHE = { t: Date.now(), payload };
    return Response.json(payload);
  } catch {
    return Response.json({ providers: [] });
  }
}
