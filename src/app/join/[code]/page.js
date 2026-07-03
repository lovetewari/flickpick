'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CinematicBG from '@/components/CinematicBG';
import Toast from '@/components/Toast';
import BrandLoader from '@/components/BrandLoader';
import { IconBrand, IconArrowRight } from '@/components/Icons';

export default function JoinPage() {
  const { code } = useParams();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomStatus, setRoomStatus] = useState('lobby');
  const [userId, setUserId] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [posters, setPosters] = useState([]);
  const [toast, setToast] = useState({ msg: '', v: false });
  const show = m => { setToast({ msg: m, v: true }); setTimeout(() => setToast(t => ({ ...t, v: false })), 2500); };

  useEffect(() => {
    const savedCode = localStorage.getItem('fp_room_code');
    const savedSession = localStorage.getItem('fp_session');
    if (savedCode === code.toUpperCase() && savedSession) {
      setRedirecting(true);
      router.replace(`/room/${code}`);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from('profiles').select('full_name').eq('id', user.id).single()
          .then(({ data }) => { if (data?.full_name) setName(data.full_name); });
      }
    });
    supabase.from('rooms').select('status').eq('code', code.toUpperCase()).single()
      .then(({ data }) => {
        if (data?.status) setRoomStatus(data.status);
        else setNotFound(true); // invalid or expired invite link
      });
    fetch('/api/posters').then(r => r.json()).then(d => { if (d.posters?.length) setPosters(d.posters); }).catch(() => {});
  }, []);

  const join = async () => {
    if (!name.trim()) { show('Enter your name'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerName: name.trim(), userId: userId || null }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      localStorage.setItem('fp_session', d.sessionToken);
      localStorage.setItem('fp_host', 'false');
      localStorage.setItem('fp_room_code', d.room.code);
      router.push(`/room/${d.room.code}`);
    } catch (e) {
      show(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (redirecting) return (<><CinematicBG variant="content" /><div className="relative z-10"><BrandLoader label="Taking you to the room…" /></div></>);

  if (notFound) return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="glass-dark p-8 max-w-[380px] w-full text-center rise">
        <h2 className="text-white text-[19px] font-bold mb-1.5">Invite link not valid</h2>
        <p className="text-white/50 text-[13.5px] mb-5">This room doesn't exist anymore. Ask your host to send a new invite.</p>
        <button onClick={() => router.push('/')} className="btn btn-primary btn-block">Go home</button>
      </div>
    </div>
  </>);

  return (<><CinematicBG variant="hero" posters={posters} />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-7 rise">
          <div className="app-badge floaty mx-auto"><IconBrand size={40} /></div>
          <h1 className="wordmark text-[34px] text-white mt-5">FlickPick</h1>
          <p className="text-white/55 text-sm mt-2">You've been invited to movie night</p>
        </div>
        <div className="glass-dark p-6 rise" style={{ animationDelay: '.1s' }}>
          <div className="text-center mb-5">
            <span className="text-white/40 text-[11px] font-semibold tracking-wide">JOINING ROOM</span>
            <div className="wordmark text-[32px] tracking-[6px] mt-1" style={{ color: '#4aa3ff' }}>{code}</div>
            {roomStatus === 'swiping' && <div className="mt-3 text-[11px] font-semibold rounded-xl px-3 py-2" style={{ background: 'rgba(10,132,255,.18)', color: '#4aa3ff' }}>Game in progress — you'll jump straight in</div>}
          </div>
          <label className="label !text-white/45" htmlFor="joinName">Your name</label>
          <input id="joinName" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && join()} placeholder="Enter your name" className="field-on-dark mb-5" autoComplete="name" />
          <button onClick={join} disabled={loading} className="btn btn-primary btn-block btn-lg">{loading ? <><span className="spinner !w-5 !h-5 !border-2 !border-white/40 !border-t-white" />Joining…</> : <>Join room <IconArrowRight size={18} /></>}</button>
        </div>
      </div>
    </div>
    <Toast msg={toast.msg} visible={toast.v} />
  </>);
}
