'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, backendReady } from '@/lib/supabase';
import CinematicBG from '@/components/CinematicBG';
import BrandOrbit from '@/components/BrandOrbit';
import { IconGoogle, IconArrowRight } from '@/components/Icons';
import { getTrending } from '@/lib/trending';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    getTrending().then(d => { if (d.posters.length) setPosters(d.posters); }).catch(() => {});
  }, []);

  const googleLogin = async () => {
    if (!backendReady) { setErr('Sign-in needs a Supabase backend. Add your keys to .env.local (see /api/health), then restart.'); return; }
    setLoading(true);
    setErr('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) { setErr(error.message); setLoading(false); }
  };

  // Guest → set the explicit flag and enter the app (NOT back to the landing)
  const continueAsGuest = () => {
    localStorage.setItem('fp_guest', '1');
    router.push('/app');
  };

  return (<><CinematicBG variant="hero" posters={posters} />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8 rise">
          <BrandOrbit className="login-orbit" />
          <h1 className="wordmark text-[42px] text-white mt-5">FlickPick</h1>
          <p className="text-white/55 text-[15px] mt-2">Sign in to save your history</p>
        </div>
        <div className="glass-dark p-6 rise" style={{ animationDelay: '.1s' }}>
          {!backendReady && (
            <div role="alert" className="mb-4 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: 'rgba(255,159,10,.12)', border: '0.5px solid rgba(255,159,10,.3)', color: '#ffd08a' }}>
              <strong className="font-semibold">Backend not configured.</strong> Google sign-in needs your Supabase keys in <code>.env.local</code>. Open <code>/api/health</code> to see what's missing — you can still continue as a guest.
            </div>
          )}
          <button onClick={googleLogin} disabled={loading || !backendReady} className="btn btn-block btn-lg" style={{ background: '#fff', color: '#1d1d1f' }}>
            <IconGoogle size={20} />
            {loading ? 'Connecting…' : 'Continue with Google'}
          </button>
          {err && <p role="alert" className="text-[12px] mt-2.5 text-center" style={{ color: '#ff8f9f' }}>{err}</p>}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.14)' }} />
            <span className="text-white/35 text-xs font-semibold">OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.14)' }} />
          </div>
          <button onClick={continueAsGuest} className="btn btn-block btn-lg" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '0.5px solid rgba(255,255,255,.16)' }}>Continue as guest <IconArrowRight size={18} /></button>
        </div>
      </div>
    </div>
  </>);
}
