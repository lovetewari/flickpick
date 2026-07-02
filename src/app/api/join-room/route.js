import { createClient } from '@supabase/supabase-js';
import { genToken, AVATARS, COLORS } from '@/lib/constants';
import { PLANS } from '@/lib/plans';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || '').trim().toUpperCase();
    const playerName = String(body.playerName || '').trim().slice(0, 40);
    const userId = typeof body.userId === 'string' ? body.userId : null;
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return Response.json({ error: 'Invalid room code' }, { status: 400 });
    const { data: room } = await sb.from('rooms').select('*').eq('code', code).single();
    if (!room) return Response.json({ error:'Room not found' }, { status:404 });
    if (room.status==='results') return Response.json({ error:'Room is already finished' }, { status:400 });

    // If logged-in user already joined this room, return their existing player (prevent duplicates)
    if (userId) {
      const { data: existing } = await sb.from('players').select('*').eq('room_id', room.id).eq('user_id', userId).single();
      if (existing) return Response.json({ room, player: existing, sessionToken: existing.session_token });
    }

    // Player cap comes from the plan config (host's plan gates the room later;
    // everyone is on 'free' until a billing integration sets profiles.plan)
    const maxPlayers = PLANS.free.maxPlayers;
    const { count } = await sb.from('players').select('*',{count:'exact',head:true}).eq('room_id',room.id);
    if (count>=maxPlayers) return Response.json({ error:`Room full (max ${maxPlayers})` }, { status:400 });
    const i = count||0;
    const { data: player, error } = await sb.from('players')
      .insert({ room_id:room.id, user_id:userId||null, name:playerName||`Player ${i+1}`, avatar:AVATARS[i%AVATARS.length], color:COLORS[i%COLORS.length], is_host:false, player_order:i, session_token:genToken() })
      .select().single();
    if (error) throw error;
    return Response.json({ room, player, sessionToken:player.session_token });
  } catch (err) { return Response.json({ error:err.message }, { status:500 }); }
}
