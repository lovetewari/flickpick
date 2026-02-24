import { createClient } from '@supabase/supabase-js';
import { genToken, AVATARS, COLORS } from '@/lib/constants';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { code, playerName, userId } = await req.json();
    const { data: room } = await sb.from('rooms').select('*').eq('code', code.toUpperCase()).single();
    if (!room) return Response.json({ error:'Room not found' }, { status:404 });
    if (room.status==='results') return Response.json({ error:'Room is already finished' }, { status:400 });

    // If logged-in user already joined this room, return their existing player (prevent duplicates)
    if (userId) {
      const { data: existing } = await sb.from('players').select('*').eq('room_id', room.id).eq('user_id', userId).single();
      if (existing) return Response.json({ room, player: existing, sessionToken: existing.session_token });
    }

    const { count } = await sb.from('players').select('*',{count:'exact',head:true}).eq('room_id',room.id);
    if (count>=12) return Response.json({ error:'Room full (max 12)' }, { status:400 });
    const i = count||0;
    const { data: player, error } = await sb.from('players')
      .insert({ room_id:room.id, user_id:userId||null, name:playerName||`Player ${i+1}`, avatar:AVATARS[i%AVATARS.length], color:COLORS[i%COLORS.length], is_host:false, player_order:i, session_token:genToken() })
      .select().single();
    if (error) throw error;
    return Response.json({ room, player, sessionToken:player.session_token });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}
