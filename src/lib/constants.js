// ═══ Content Type Definitions ═══
export const CONTENT_TYPES = [
  { id: 'movies', label: 'Movies',     desc: 'Feature films only' },
  { id: 'series', label: 'Web Series', desc: 'TV shows & web series' },
  { id: 'all',    label: 'Both',       desc: 'Movies + Web Series' },
];

// ═══ Our own categories — computed from OUR catalog + swipe data ═══
export const CATEGORIES = [
  { id: 'hot',          label: 'Hot on FlickPick', desc: 'What players love right now' },
  { id: 'latest',       label: 'Latest Releases',  desc: 'Fresh out now' },
  { id: 'hits',         label: 'Blockbuster Hits', desc: 'Proven crowd-pleasers' },
  { id: 'most_watched', label: 'Most Watched',     desc: 'Biggest audiences worldwide' },
  { id: 'top_rated',    label: 'Top Rated',        desc: 'Highest rated of all time' },
  { id: 'hidden_gems',  label: 'Hidden Gems',      desc: 'Great finds off the radar' },
];

export function getCategoriesForType() {
  return CATEGORIES;
}

// Old TMDB-era category ids → our ids (keeps existing rooms working)
export const LEGACY_CATEGORY = {
  trending: 'hot', popular: 'most_watched', now_playing: 'latest',
  upcoming: 'latest', airing_today: 'latest', on_the_air: 'latest',
};

// ═══ Deck sizes the host can pick ═══
export const DECK_SIZES = [10, 20, 30, 40, 50];

// Series catalog/swipe ids are tmdb_id + this offset. 100M is far above any
// TMDB id (~2M in 2026), so movie/series ids can never collide.
export const SERIES_OFFSET = 100000000;

// ═══ Platforms ═══
export const OTT_PLATFORMS = [
  { name:'Netflix',     color:'#E50914', bg:'linear-gradient(135deg,#E50914,#B20710)' },
  { name:'Prime Video', color:'#00A8E1', bg:'linear-gradient(135deg,#00A8E1,#0073A8)' },
  { name:'Disney+',     color:'#0063E5', bg:'linear-gradient(135deg,#113CCF,#0050C8)' },
  { name:'HBO Max',     color:'#B535F6', bg:'linear-gradient(135deg,#B535F6,#8B1FCC)' },
  { name:'Apple TV+',   color:'#555',    bg:'linear-gradient(135deg,#555,#333)' },
  { name:'Hulu',        color:'#1CE783', bg:'linear-gradient(135deg,#1CE783,#14B866)' },
];
export const OTT_BG = Object.fromEntries(OTT_PLATFORMS.map(p => [p.name, p.bg]));

// Extra brand colours for providers surfaced by TMDB / iTunes (incl. India).
const OTT_EXTRA = {
  'Max':        'linear-gradient(135deg,#4a5cff,#2222b8)',
  'Hotstar':    'linear-gradient(135deg,#1f80e0,#0b1a5b)',
  'JioCinema':  'linear-gradient(135deg,#c4171c,#7a0e12)',
  'ZEE5':       'linear-gradient(135deg,#8f30c6,#5a1f8f)',
  'SonyLIV':    'linear-gradient(135deg,#0a7cff,#0250b0)',
  'Apple TV':   'linear-gradient(135deg,#4a4a4a,#151515)',
  'Peacock':    'linear-gradient(135deg,#ff5a3c,#8b1fcc)',
  'Paramount+': 'linear-gradient(135deg,#0064ff,#0033a0)',
};
const OTT_BG_ALL = { ...OTT_EXTRA, ...OTT_BG };

// Map TMDB / catalog provider names → the short label we display.
const PROVIDER_ALIAS = {
  'Amazon Prime Video': 'Prime Video', 'Amazon Video': 'Prime Video',
  'Disney Plus': 'Disney+', 'Disney+ Hotstar': 'Hotstar', 'JioHotstar': 'Hotstar',
  'Apple TV Plus': 'Apple TV+', 'Apple TV+': 'Apple TV+',
  'HBO Max': 'Max',
};
export function normProvider(name) {
  const n = String(name || '').trim();
  return PROVIDER_ALIAS[n] || n;
}
// Brand gradient for a provider chip (falls back to a neutral slate).
export function ottBg(name) {
  return OTT_BG_ALL[name] || 'linear-gradient(135deg,#3a3a44,#22222a)';
}

// ═══ Genres ═══
export const GENRES = ['All','Action','Comedy','Drama','Sci-Fi','Horror','Animation','Romance','Thriller','History','Fantasy','Mystery','Adventure','Crime','Documentary'];

// ═══ Misc ═══
export const AVATARS = ['😎','🤩','🥳','😈','🦊','🐻','🦄','🐲','🎃','👻','🤖','👾'];
export const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9','#F0B27A','#82E0AA'];

export function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}
export function genToken() {
  return 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
