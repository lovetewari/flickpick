import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Fetch ALL swipes for a room, paging past PostgREST's max-rows cap (default
// 1000). A full room can produce 12 players × 100 cards = 1200 rows — without
// paging, matches would be silently undercounted.
async function allSwipes(roomId) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('swipes')
      .select('player_id, content_id, content_type, liked')
      .eq('room_id', roomId)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function GET(req, { params }) {
  try {
    const { code } = await params;
    const { data: room } = await sb.from('rooms').select('*').eq('code', code.toUpperCase()).single();
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });
    const { data: players } = await sb.from('players').select('*').eq('room_id', room.id).order('player_order');
    const swipes = await allSwipes(room.id);

    const likes = {}, likedBy = {}, indiv = {};
    for (const s of swipes) {
      if (s.liked) {
        likes[s.content_id] = (likes[s.content_id] || 0) + 1;
        if (!likedBy[s.content_id]) likedBy[s.content_id] = [];
        likedBy[s.content_id].push(s.player_id);
      }
      if (!indiv[s.player_id]) indiv[s.player_id] = [];
      if (s.liked) indiv[s.player_id].push({ id: s.content_id, type: s.content_type });
    }
    const tot = (players || []).length;
    const matchIds = Object.entries(likes).filter(([, c]) => c === tot).map(([id]) => parseInt(id));
    const ranked = Object.entries(likes).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ contentId: parseInt(id), votes: v, voterIds: likedBy[id] || [] }));
    return Response.json({ room, players: players || [], matchIds, ranked, individual: indiv });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}

export async function PATCH(req, { params }) {
  try {
    const { code } = await params;
    const body = await req.json();
    const u = {};
    if (body.status && ['lobby', 'swiping', 'results'].includes(body.status)) u.status = body.status;
    if (Array.isArray(body.platforms)) u.platforms = body.platforms.slice(0, 12).map(String);
    if (body.genre_filter) u.genre_filter = String(body.genre_filter).slice(0, 30);
    if (body.content_type && ['movies', 'series', 'all'].includes(body.content_type)) u.content_type = body.content_type;
    if (body.content_category) u.content_category = String(body.content_category).slice(0, 30);
    if (Number.isInteger(body.movie_count) && body.movie_count >= 1 && body.movie_count <= 50) u.movie_count = body.movie_count;
    if (Number.isInteger(body.series_count) && body.series_count >= 1 && body.series_count <= 50) u.series_count = body.series_count;
    // The frozen deck: array of content items, persisted once at game start so
    // every player swipes the identical deck (and results reload never drifts).
    if (Array.isArray(body.deck) && body.deck.length > 0 && body.deck.length <= 120 &&
        body.deck.every(it => it && Number.isInteger(it.id) && typeof it.title === 'string')) {
      u.deck = body.deck;
    }
    if (Object.keys(u).length === 0) return Response.json({ error: 'No valid fields' }, { status: 400 });

    const { data, error } = await sb.from('rooms').update(u).eq('code', code.toUpperCase()).select().single();
    if (error) throw error;

    // Save watch history for logged-in users
    if (body.status === 'results' && Array.isArray(body.historyEntries) && body.historyEntries.length > 0) {
      await sb.from('watch_history').insert(body.historyEntries.slice(0, 120));
    }
    return Response.json({ room: data });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
