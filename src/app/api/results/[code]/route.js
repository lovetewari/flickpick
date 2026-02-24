import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET(req, { params }) {
  try {
    const { code } = await params;
    const { data: room } = await sb.from('rooms').select('*').eq('code',code.toUpperCase()).single();
    if (!room) return Response.json({ error:'Room not found' }, { status:404 });
    const { data: players } = await sb.from('players').select('*').eq('room_id',room.id).order('player_order');
    const { data: swipes } = await sb.from('swipes').select('*').eq('room_id',room.id);
    const likes={}, likedBy={}, indiv={};
    for (const s of (swipes||[])) {
      if (s.liked) {
        likes[s.content_id]=(likes[s.content_id]||0)+1;
        if(!likedBy[s.content_id])likedBy[s.content_id]=[];
        likedBy[s.content_id].push(s.player_id);
      }
      if(!indiv[s.player_id])indiv[s.player_id]=[];
      if(s.liked)indiv[s.player_id].push({id:s.content_id,type:s.content_type});
    }
    const tot=(players||[]).length;
    const matchIds=Object.entries(likes).filter(([,c])=>c===tot).map(([id])=>parseInt(id));
    const ranked=Object.entries(likes).sort((a,b)=>b[1]-a[1]).map(([id,v])=>({contentId:parseInt(id),votes:v,voterIds:likedBy[id]||[]}));
    return Response.json({ room, players:players||[], matchIds, ranked, individual:indiv });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}

export async function PATCH(req, { params }) {
  try {
    const { code } = await params;
    const body = await req.json();
    const u = {};
    if(body.status)u.status=body.status;
    if(body.platforms)u.platforms=body.platforms;
    if(body.genre_filter)u.genre_filter=body.genre_filter;
    if(body.content_type)u.content_type=body.content_type;
    if(body.content_category)u.content_category=body.content_category;
    const { data, error } = await sb.from('rooms').update(u).eq('code',code.toUpperCase()).select().single();
    if (error) throw error;

    // Save watch history for logged-in users
    if (body.status==='results' && body.historyEntries?.length > 0) {
      await sb.from('watch_history').insert(body.historyEntries);
    }
    return Response.json({ room: data });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}
