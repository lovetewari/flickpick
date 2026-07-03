// Shared fixtures + network stubbing for E2E. Everything external is
// intercepted, so specs are deterministic and run with zero secrets.

export const ROOM = {
  id: 'r1', code: 'ABC234', host_id: null, host_name: 'Ava', status: 'lobby',
  content_type: 'all', content_category: 'hot', platforms: [], genre_filter: 'All',
  movie_count: 20, series_count: 20, deck: null, created_at: '2026-01-01T00:00:00Z',
};

export const PLAYERS = [
  { id: 'p1', room_id: 'r1', name: 'Ava', avatar: '😎', color: '#FF6B6B', is_host: true, is_done: false, player_order: 0, session_token: 'tok_host' },
  { id: 'p2', room_id: 'r1', name: 'Sam', avatar: '🤩', color: '#4ECDC4', is_host: false, is_done: false, player_order: 1, session_token: 'tok_guest' },
];

export const DECK = [
  { id: 603, title: 'The Matrix', year: 1999, genre: ['Action', 'Sci-Fi'], rating: 8.2, poster: 'https://image.tmdb.org/t/p/w500/m1.jpg', posterPath: '/m1.jpg', desc: 'A hacker discovers reality is a simulation.', duration: '2h 16m', ott: ['Netflix'], type: 'movie', seasons: 0, episodes: 0, status: '', network: '', popularity: 90 },
  { id: 27205, title: 'Inception', year: 2010, genre: ['Sci-Fi', 'Thriller'], rating: 8.4, poster: 'https://image.tmdb.org/t/p/w500/m2.jpg', posterPath: '/m2.jpg', desc: 'Dream heists.', duration: '2h 28m', ott: ['Netflix'], type: 'movie', seasons: 0, episodes: 0, status: '', network: '', popularity: 85 },
  { id: 100001396, title: 'Breaking Bad', year: 2008, genre: ['Drama'], rating: 8.9, poster: 'https://image.tmdb.org/t/p/w500/s1.jpg', posterPath: '/s1.jpg', desc: 'Teacher turns kingpin.', duration: '5 Seasons', ott: ['Netflix'], type: 'series', seasons: 5, episodes: 62, status: 'Ended', network: 'AMC', popularity: 88 },
];

export const RESULTS = {
  room: { ...ROOM, status: 'results', deck: DECK },
  players: PLAYERS,
  matchIds: [603],
  ranked: [
    { contentId: 603, votes: 2, voterIds: ['p1', 'p2'] },
    { contentId: 100001396, votes: 1, voterIds: ['p1'] },
  ],
  individual: { p1: [{ id: 603, type: 'movie' }, { id: 100001396, type: 'series' }], p2: [{ id: 603, type: 'movie' }] },
};

// Block/stub every external call the app can make.
export async function stubExternal(page, { room = ROOM, players = PLAYERS, profile = null } = {}) {
  await page.route('**/auth/v1/**', r => r.fulfill({ json: { user: null, session: null } }));
  await page.route('**/realtime/**', r => r.abort());
  await page.route('**/rest/v1/rooms**', r => r.fulfill({ json: room }));
  await page.route('**/rest/v1/players**', r => r.fulfill({ json: players }));
  await page.route('**/rest/v1/swipes**', r => r.fulfill({ json: [] }));
  await page.route('**/rest/v1/profiles**', r => r.fulfill({ json: profile }));
  await page.route('**/rest/v1/watch_history**', r => r.fulfill({ json: [] }));
  const PIXEL = {
    status: 200, contentType: 'image/png',
    // 1×1 transparent PNG
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
  };
  await page.route('**/image.tmdb.org/**', r => r.fulfill(PIXEL));
  // next/image requests go through the app's optimizer endpoint — stub it so
  // tests never make real outbound image fetches (fixture URLs are fake).
  await page.route('**/_next/image**', r => r.fulfill(PIXEL));
  await page.route('**/api/posters', r => r.fulfill({ json: { posters: [], items: [], wallPosters: [] } }));
  await page.route('**/api/providers', r => r.fulfill({ json: { providers: [] } }));
}

export const TREND_ITEMS = [
  { id: 603, title: 'The Matrix', poster: 'https://image.tmdb.org/t/p/w185/m1.jpg', year: 1999, type: 'movie', rating: 8.2, providers: ['Netflix'], providerLogos: [null], inTheaters: false, detailsUrl: 'https://www.themoviedb.org/movie/603' },
  { id: 100001396, title: 'Breaking Bad', poster: 'https://image.tmdb.org/t/p/w185/s1.jpg', year: 2008, type: 'series', rating: 8.9, providers: ['Prime Video'], providerLogos: [null], inTheaters: false, detailsUrl: 'https://www.themoviedb.org/tv/1396' },
  { id: 27205, title: 'Inception', poster: 'https://image.tmdb.org/t/p/w185/m2.jpg', year: 2010, type: 'movie', rating: 8.4, providers: [], providerLogos: [], inTheaters: true, detailsUrl: 'https://www.themoviedb.org/movie/27205' },
];

export async function seedGuest(page) {
  await page.addInitScript(() => localStorage.setItem('fp_guest', '1'));
}

export async function seedSignedIn(page, {
  id = 'user_123',
  email = 'ava@example.com',
  name = 'Ava',
} = {}) {
  await page.addInitScript(([userId, userEmail, fullName]) => {
    localStorage.removeItem('fp_guest');
    localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: userEmail,
        app_metadata: {},
        user_metadata: { full_name: fullName },
      },
    }));
  }, [id, email, name]);
}

export async function seedSession(page, { code = 'ABC234', host = true, token = 'tok_host' } = {}) {
  await page.addInitScript(([c, h, t]) => {
    localStorage.setItem('fp_room_code', c);
    localStorage.setItem('fp_host', String(h));
    localStorage.setItem('fp_session', t);
  }, [code, host, token]);
}
