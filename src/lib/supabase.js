import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Is the backend actually configured, or is .env.local still on placeholders?
// (Used to show a clear setup notice instead of failing silently / hanging.)
export const backendReady =
  !!url && !!key &&
  /^https:\/\/.+\.supabase\.co/i.test(url) &&
  !/your-project-id|PASTE_|placeholder|example\.com/i.test(url) &&
  !/PASTE_|placeholder/i.test(key);

// Fall back to a harmless local URL when unconfigured so createClient() never
// throws and the marketing/trending pages still render.
export const supabase = createClient(
  backendReady ? url : 'https://placeholder.supabase.co',
  backendReady ? key : 'placeholder-anon-key',
  {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { autoRefreshToken: backendReady, persistSession: true, detectSessionInUrl: backendReady },
  }
);
