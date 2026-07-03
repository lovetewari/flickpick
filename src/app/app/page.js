'use client';
// The app itself — the working dashboard. Signed-in users land here directly;
// guests only after EXPLICITLY choosing "Continue as guest" on the landing
// (never by accident — anyone else is sent back to the landing page).
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';
import BrandLoader from '@/components/BrandLoader';

export default function AppHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      let u = null;
      try {
        // Local session read — no network round-trip, so a broken/offline
        // backend can never trap guests on the loading spinner.
        const { data: { session } } = await supabase.auth.getSession();
        u = session?.user || null;
        if (u) {
          localStorage.removeItem('fp_guest'); // guest flag never overrides a real session
          setUser(u);
          const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
          setProfile(p);
        }
      } catch { /* treated as signed-out below */ }
      if (!u && localStorage.getItem('fp_guest') !== '1') {
        router.replace('/'); // no session + no explicit guest choice → landing
        return;
      }
      setReady(true);
    })();
  }, [router]);

  if (!ready) return <BrandLoader label="Opening FlickPick…" />;

  return <Dashboard profile={profile} userId={user?.id} />;
}
