'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StarBG from '@/components/StarBG';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const googleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) { alert(error.message); setLoading(false); }
  };

  return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 max-w-[420px] mx-auto">
      <div className="text-center mb-10" style={{animation:'slideUp .7s ease'}}>
        <div className="text-[56px] mb-3" style={{animation:'float 4s ease-in-out infinite',filter:'drop-shadow(0 0 30px rgba(212,168,67,.3))'}}>🎬</div>
        <h1 className="text-[42px] font-black leading-none mb-2" style={{fontFamily:"'Playfair Display',serif",background:'linear-gradient(135deg,#fff 0%,#D4A843 50%,#E8C76A 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>FlickPick</h1>
        <p className="text-white/40 text-[15px]">Sign in to save your history</p>
      </div>
      <div className="glass p-7 w-full" style={{animation:'slideUp .7s ease .15s both'}}>
        <button onClick={googleLogin} disabled={loading} className="google-btn mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {loading?'Connecting...':'Continue with Google'}
        </button>
        <div className="flex items-center gap-4 my-4"><div className="flex-1 h-px bg-white/[.08]"/><span className="text-white/20 text-xs font-semibold">OR</span><div className="flex-1 h-px bg-white/[.08]"/></div>
        <button onClick={()=>router.push('/')} className="btn-glass !text-white/50">Continue as Guest →</button>
      </div>
    </div>
  </>);
}
