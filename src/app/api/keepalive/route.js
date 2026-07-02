// Keep-alive ping — touched daily by Vercel Cron (see vercel.json).
// A single tiny query counts as activity, so the Supabase free-tier
// project never hits the 7-day inactivity pause.
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error } = await sb.from('catalog').select('id', { count: 'exact', head: true }).limit(1);
    if (error) throw error;
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
