'use client';
// OAuth return handler — runs in the BROWSER, where the PKCE code-verifier and
// session storage live. The previous server route couldn't complete the
// exchange (no verifier server-side), which caused the sign-in loop.
//
// Flow: Supabase redirects here with ?code=… . The browser client
// (detectSessionInUrl) exchanges it for a session; we wait for that session
// and then continue into the app. Explicit exchange is a hard fallback.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CinematicBG from '@/components/CinematicBG';
import BrandLoader from '@/components/BrandLoader';

export default function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = path => { if (!done) { done = true; router.replace(path); } };
    const fail = () => { if (!done) { done = true; setFailed(true); } };

    const params = new URLSearchParams(window.location.search);
    // Provider denied / errored (user cancelled, etc.)
    if (params.get('error')) { window.location.replace('/login?error=oauth'); return; }

    // 1) Session may already exist (detectSessionInUrl ran on client init)
    supabase.auth.getSession().then(({ data }) => { if (data?.session) finish('/app'); });

    // 2) Normal case: the exchange completes and fires SIGNED_IN
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish('/app');
    });

    // 3) Hard fallback after a beat: exchange the code ourselves, then re-check
    const t = setTimeout(async () => {
      if (done) return;
      const code = params.get('code');
      if (code) {
        try {
          const { data } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session) return finish('/app');
        } catch { /* code may already be consumed — re-check below */ }
      }
      const { data } = await supabase.auth.getSession();
      data?.session ? finish('/app') : fail();
    }, 2500);

    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  if (!failed) return <BrandLoader label="Signing you in…" />;

  return (<><CinematicBG variant="hero" posters={[]} />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5 text-center">
      <div className="glass-dark p-7 max-w-[360px] w-full rise">
        <h1 className="text-white text-[19px] font-bold mb-1.5">Sign-in didn't complete</h1>
        <p className="text-white/55 text-[13.5px] mb-5">The link may have expired. Please try again.</p>
        <button onClick={() => window.location.replace('/login')} className="btn btn-primary btn-block">Back to sign in</button>
      </div>
    </div>
  </>);
}
