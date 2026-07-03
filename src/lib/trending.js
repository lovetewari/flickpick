// Client-side trending fetch with a short session cache, so navigating
// between landing/dashboard/login doesn't refetch the same data.
const KEY_PREFIX = 'fp_trending_v10';
const TTL = 10 * 60 * 1000;

function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function getTrending(force = false) {
  const key = `${KEY_PREFIX}_${weekKey()}`;
  if (!force && typeof sessionStorage !== 'undefined') {
    try {
      const c = JSON.parse(sessionStorage.getItem(key));
      if (c && Date.now() - c.t < TTL) return c.d;
    } catch { /* cache miss */ }
  }
  const r = await fetch('/api/posters');
  if (!r.ok) throw new Error('Trending service unavailable');
  const d = await r.json();
  // Never cache an empty result — a transient blank must not stick for TTL
  if (d.items?.length) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch { /* quota */ }
  }
  // Wall gets thumbnail-size images (dimmed backdrop → indistinguishable, far lighter)
  return { posters: d.wallPosters?.length ? d.wallPosters : (d.posters || []), items: d.items || [], week: d.week };
}
