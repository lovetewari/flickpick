import { createClient } from '@supabase/supabase-js';
import { genCode, genToken } from '@/lib/constants';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { hostName, userId } = await req.json();
    const code = genCode();
    const sessionToken = genToken();
    const { data: room, error: e1 } = await sb.from('rooms')
      .insert({ code, host_id: userId||null, host_name: hostName||'Host', status:'lobby' })
      .select().single();
    if (e1) throw e1;
    const { data: player, error: e2 } = await sb.from('players')
      .insert({ room_id:room.id, user_id:userId||null, name:hostName||'Host', avatar:'😎', color:'#FF6B6B', is_host:true, player_order:0, session_token:sessionToken })
      .select().single();
    if (e2) throw e2;
    return Response.json({ room, player, sessionToken });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
