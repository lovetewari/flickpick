// ═══ Content Type Definitions ═══
export const CONTENT_TYPES = [
  { id: 'movies', label: '🍿 Movies',      desc: 'Feature films only' },
  { id: 'series', label: '📺 Web Series',  desc: 'TV shows & web series' },
  { id: 'all',    label: '🎬 Both',        desc: 'Movies + Web Series' },
];

// ═══ Category options change per content type ═══
export const MOVIE_CATEGORIES = [
  { id: 'trending',    label: '🔥 Trending Now',    desc: 'Hot this week' },
  { id: 'popular',     label: '⭐ Most Popular',     desc: 'All-time crowd favorites' },
  { id: 'top_rated',   label: '🏆 Top Rated',        desc: 'Highest TMDB ratings' },
  { id: 'now_playing', label: '🎬 In Theaters Now',  desc: 'Currently showing' },
  { id: 'upcoming',    label: '🔮 Coming Soon',      desc: 'Upcoming releases' },
];

export const SERIES_CATEGORIES = [
  { id: 'trending',      label: '🔥 Trending Now',      desc: 'Hot this week' },
  { id: 'popular',       label: '👑 Most Watched',       desc: 'Most popular series ever' },
  { id: 'top_rated',     label: '🏆 Top Rated',          desc: 'Highest rated shows' },
  { id: 'airing_today',  label: '📡 Airing Today',       desc: 'New episodes today' },
  { id: 'on_the_air',    label: '🆕 New Seasons',        desc: 'Currently airing new seasons' },
];

export const BOTH_CATEGORIES = [
  { id: 'trending',  label: '🔥 Trending Now',  desc: 'Hot movies & series' },
  { id: 'popular',   label: '⭐ Most Popular',   desc: 'Top picks across both' },
  { id: 'top_rated', label: '🏆 Top Rated',      desc: 'Highest rated content' },
];

export function getCategoriesForType(type) {
  if (type === 'movies') return MOVIE_CATEGORIES;
  if (type === 'series') return SERIES_CATEGORIES;
  return BOTH_CATEGORIES;
}

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
