import { createClient } from '@supabase/supabase-js';
import { genCode, genToken } from '@/lib/constants';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const hostName = String(body.hostName || '').trim().slice(0, 40) || 'Host';
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const sessionToken = genToken();

    // Retry on the (rare) room-code collision instead of failing the request
    let room = null, lastErr = null;
    for (let attempt = 0; attempt < 3 && !room; attempt++) {
      const { data, error } = await sb.from('rooms')
        .insert({ code: genCode(), host_id: userId, host_name: hostName, status: 'lobby' })
        .select().single();
      if (!error) { room = data; break; }
      lastErr = error;
      if (error.code !== '23505') break; // only retry unique-violation
    }
    if (!room) throw lastErr || new Error('Could not create room');

    const { data: player, error: e2 } = await sb.from('players')
      .insert({ room_id: room.id, user_id: userId, name: hostName, avatar: '😎', color: '#FF6B6B', is_host: true, player_order: 0, session_token: sessionToken })
      .select().single();
    if (e2) {
      // Don't leave an orphaned room behind
      await sb.from('rooms').delete().eq('id', room.id);
      throw e2;
    }
    return Response.json({ room, player, sessionToken });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
