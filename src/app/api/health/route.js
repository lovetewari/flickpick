// Self-diagnosis — open /api/health in the browser and it tells you exactly
// what is (and isn't) configured. No secrets are ever echoed back.
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const tmdb = process.env.TMDB_API_KEY || '';

  const checks = {
    supabase_url: !url ? '❌ missing'
      : /YOUR-PROJECT-ID|dummy|PASTE_/i.test(url) ? '❌ still a placeholder — paste your real project URL in .env.local and restart'
      : '✅ set',
    supabase_anon_key: !anon ? '❌ missing'
      : /PASTE_|dummy|test_anon/i.test(anon) ? '❌ still a placeholder — paste your real anon key in .env.local and restart'
      : '✅ set',
    tmdb_key: !tmdb ? 'ℹ️ not set (only needed for poster fallback + seeding)'
      : /PASTE_/i.test(tmdb) ? '❌ still a placeholder'
      : '✅ set',
    database: '…',
    catalog: '…',
  };

  if (checks.supabase_url === '✅ set' && checks.supabase_anon_key === '✅ set') {
    try {
      const sb = createClient(url, anon);
      const { count, error } = await sb.from('catalog').select('*', { count: 'exact', head: true });
      if (error) {
        checks.database = '✅ reachable';
        checks.catalog = /relation .* does not exist|schema cache/i.test(error.message)
          ? '❌ catalog table missing — run supabase-schema.sql in the SQL Editor'
          : `❌ query failed: ${error.message}`;
      } else {
        checks.database = '✅ reachable';
        checks.catalog = count > 0
          ? `✅ seeded (${count} titles)`
          : '⚠️ empty — run `npm run seed` (posters fall back to TMDB if the key is set)';
      }
    } catch (e) {
      checks.database = `❌ unreachable: ${e.message}`;
      checks.catalog = 'blocked by database';
    }
  } else {
    checks.database = 'blocked — fix the env values above first';
    checks.catalog = 'blocked — fix the env values above first';
  }

  const ready = Object.values(checks).every(v => String(v).startsWith('✅') || String(v).startsWith('ℹ️'));
  return Response.json({ ready, checks }, { status: ready ? 200 : 503 });
}
