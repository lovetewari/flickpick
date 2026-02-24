import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { sessionToken, contentId, contentType, liked } = await req.json();
    const { data: p } = await sb.from('players').select('*').eq('session_token',sessionToken).single();
    if (!p) return Response.json({ error:'Invalid session' }, { status:401 });
    const { error } = await sb.from('swipes').upsert(
      { player_id:p.id, room_id:p.room_id, content_id:contentId, content_type:contentType||'movie', liked },
      { onConflict:'player_id,content_id' }
    );
    if (error) throw error;
    return Response.json({ ok:true });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}

export async function PATCH(req) {
  try {
    const { sessionToken } = await req.json();
    await sb.from('players').update({ is_done:true }).eq('session_token',sessionToken);
    return Response.json({ ok:true });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}
