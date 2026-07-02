// Client-side trending fetch with a short session cache, so navigating
// between landing/dashboard/login doesn't refetch the same data.
const KEY = 'fp_trending_v7';
const TTL = 10 * 60 * 1000;

export async function getTrending(force = false) {
  if (!force && typeof sessionStorage !== 'undefined') {
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY));
      if (c && Date.now() - c.t < TTL) return c.d;
    } catch { /* cache miss */ }
  }
  const r = await fetch('/api/posters');
  if (!r.ok) throw new Error('Trending service unavailable');
  const d = await r.json();
  // Never cache an empty result — a transient blank must not stick for TTL
  if (d.items?.length) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch { /* quota */ }
  }
  // Wall gets thumbnail-size images (dimmed backdrop → indistinguishable, far lighter)
  return { posters: d.wallPosters?.length ? d.wallPosters : (d.posters || []), items: d.items || [] };
}
