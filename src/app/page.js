'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StarBG from '@/components/StarBG';
import Toast from '@/components/Toast';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState({msg:'',v:false});
  const show = m => { setToast({msg:m,v:true}); setTimeout(()=>setToast(t=>({...t,v:false})),2500); };

  useEffect(()=>{
    (async()=>{
      const {data:{user:u}} = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const {data:p} = await supabase.from('profiles').select('*').eq('id',u.id).single();
        setProfile(p);
        setHostName(p?.full_name||'');
        setJoinName(p?.full_name||'');
      }
      setReady(true);
    })();
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,s) => {
      setUser(s?.user||null);
      if (s?.user) supabase.from('profiles').select('*').eq('id',s.user.id).single().then(({data})=>{
        setProfile(data); setHostName(data?.full_name||''); setJoinName(data?.full_name||'');
      });
    });
    return () => subscription.unsubscribe();
  },[]);

  const create = async () => {
    if(!hostName.trim()){show('Enter your name');return;}
    setLoading(true);
    try {
      const r = await fetch('/api/create-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hostName:hostName.trim(),userId:user?.id||null})});
      const d = await r.json(); if(d.error) throw new Error(d.error);
      localStorage.setItem('fp_session',d.sessionToken); localStorage.setItem('fp_host','true');
      router.push(`/room/${d.room.code}`);
    } catch(e){show(e.message);}
    setLoading(false);
  };

  const join = async () => {
    if(joinCode.length<4){show('Enter a valid code');return;}
    if(!joinName.trim()){show('Enter your name');return;}
    setLoading(true);
    try {
      const r = await fetch('/api/join-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:joinCode.trim(),playerName:joinName.trim(),userId:user?.id||null})});
      const d = await r.json(); if(d.error) throw new Error(d.error);
      localStorage.setItem('fp_session',d.sessionToken); localStorage.setItem('fp_host','false');
      router.push(`/room/${d.room.code}`);
    } catch(e){show(e.message);}
    setLoading(false);
  };

  const googleLogin = async () => {
    await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`}});
  };

  if(!ready) return <><StarBG/><div className="relative z-10 min-h-screen flex items-center justify-center"><div className="spinner"/></div></>;

  return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-6 max-w-[480px] mx-auto">
      {/* Top bar */}
      <div className="w-full flex justify-end mb-2" style={{animation:'fadeIn .5s ease'}}>
        {user
          ? <button onClick={()=>router.push('/profile')} className="flex items-center gap-2 glass !rounded-full !p-1.5 !pr-4 cursor-pointer hover:bg-white/[.06] transition">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full border border-gold/30"/> : <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-sm">😎</div>}
              <span className="text-white/70 text-[13px] font-semibold">{profile?.full_name?.split(' ')[0]||'Profile'}</span>
            </button>
          : <button onClick={googleLogin} className="glass !rounded-full !px-4 !py-2 text-gold text-[12px] font-bold cursor-pointer hover:bg-white/[.06] transition">Sign In</button>
        }
      </div>

      {/* Hero */}
      <div className="text-center mt-[3vh]" style={{animation:'slideUp .8s ease'}}>
        <div className="text-[52px] mb-3" style={{animation:'float 4s ease-in-out infinite',filter:'drop-shadow(0 0 30px rgba(212,168,67,.3))'}}>🎬</div>
        <h1 className="text-[40px] font-black leading-none mb-2" style={{fontFamily:"'Playfair Display',serif",background:'linear-gradient(135deg,#fff 0%,#D4A843 50%,#E8C76A 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>FlickPick</h1>
        <p className="text-white/35 text-[15px]">Swipe. Match. Watch together.</p>
        <p className="text-white/20 text-[11px] mt-1">Movies • Web Series • Both — Powered by TMDB</p>
      </div>

      {/* Create */}
      <div className="glass p-6 w-full mt-8" style={{animation:'slideUp .7s ease .1s both'}}>
        <div className="flex items-center gap-2.5 mb-4"><span className="text-xl">🎬</span><h3 className="text-[17px] font-extrabold" style={{fontFamily:"'Playfair Display',serif"}}>Host a Room</h3></div>
        <label className="text-white/35 text-[11px] font-bold tracking-[1.5px] uppercase mb-2 block">Your name</label>
        <input value={hostName} onChange={e=>setHostName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} placeholder="Enter your name" className="inp mb-4"/>
        <button onClick={create} disabled={loading} className="btn-gold">{loading?'Creating...':'Create Room ✦'}</button>
      </div>

      <div className="flex items-center gap-4 my-4 w-full" style={{animation:'fadeIn .7s ease .3s both'}}><div className="flex-1 h-px bg-white/[.06]"/><span className="text-white/15 text-xs font-semibold">OR</span><div className="flex-1 h-px bg-white/[.06]"/></div>

      {/* Join */}
      <div className="glass p-6 w-full" style={{animation:'slideUp .7s ease .3s both'}}>
        <div className="flex items-center gap-2.5 mb-4"><span className="text-xl">🎟️</span><h3 className="text-[17px] font-extrabold" style={{fontFamily:"'Playfair Display',serif"}}>Join a Room</h3></div>
        <label className="text-white/35 text-[11px] font-bold tracking-[1.5px] uppercase mb-2 block">Room code</label>
        <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="inp mb-3 text-center text-xl font-bold tracking-[6px] uppercase" style={{fontFamily:"'Bebas Neue'"}}/>
        <label className="text-white/35 text-[11px] font-bold tracking-[1.5px] uppercase mb-2 block">Your name</label>
        <input value={joinName} onChange={e=>setJoinName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} placeholder="Enter your name" className="inp mb-4"/>
        <button onClick={join} disabled={loading} className="btn-glass">{loading?'Joining...':'Join Room →'}</button>
      </div>

      {!user && <button onClick={googleLogin} className="glass !p-4 w-full mt-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/[.06] transition" style={{animation:'slideUp .7s ease .5s both'}}>
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span className="text-white/50 text-[13px] font-semibold">Sign in with Google to save your history</span>
      </button>}

      <p className="text-white/10 text-[11px] mt-6 text-center pb-4" style={{animation:'fadeIn 1s ease .6s both'}}>2–12 friends · Live TMDB data · 100% free</p>
    </div>
    <Toast msg={toast.msg} visible={toast.v}/>
  </>);
}
