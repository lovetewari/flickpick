'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, backendReady } from '@/lib/supabase';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PosterWall from '@/components/PosterWall';
import { planFor } from '@/lib/plans';
import { getTrending } from '@/lib/trending';
import { IconBrand, IconFilm, IconTicket, IconClock, IconHeart, IconHome, IconUsers, IconArrowRight, IconClose } from '@/components/Icons';

function PersonGlyph({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(255,255,255,.9)">
      <circle cx="12" cy="9" r="4" />
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5Z" />
    </svg>
  );
}

export default function Dashboard({ profile, userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [hostOpen, setHostOpen] = useState(false);
  const [hostName, setHostName] = useState('');
  const [signInOpen, setSignInOpen] = useState(false);
  const [posters, setPosters] = useState([]);
  const [stats, setStats] = useState({ rooms: 0, matches: 0, swiped: 0 });

  useEffect(() => {
    getTrending().then(d => { if (d.posters.length) setPosters(d.posters); }).catch(() => {});
  }, []);
  const [toast, setToast] = useState({ msg: '', v: false });
  const show = m => { setToast({ msg: m, v: true }); setTimeout(() => setToast(t => ({ ...t, v: false })), 2500); };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ count: rooms }, { data: hist }] = await Promise.all([
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('host_id', userId),
        supabase.from('watch_history').select('was_match').eq('user_id', userId).limit(1000),
      ]);
      setStats({ rooms: rooms || 0, swiped: (hist || []).length, matches: (hist || []).filter(h => h.was_match).length });
    })();
  }, [userId]);

  const host = async (name) => {
    if (!backendReady) { show('Add your Supabase keys to .env.local to host rooms (see /api/health)'); setHostOpen(false); return; }
    setLoading('host');
    localStorage.removeItem('fp_room_code');
    try {
      const r = await fetch('/api/create-room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostName: name || profile?.full_name || 'Host', userId: userId || null }) });
      const d = await r.json(); if (d.error) throw new Error(d.error);
      localStorage.setItem('fp_session', d.sessionToken); localStorage.setItem('fp_host', 'true'); localStorage.setItem('fp_room_code', d.room.code);
      router.push(`/room/${d.room.code}`);
    } catch (e) { show(e.message); setLoading(''); }
  };

  // Signed-in users have a name on file — create straight away.
  // Guests get asked once, in a modal.
  const hostClick = () => {
    if (profile?.full_name) host(profile.full_name);
    else setHostOpen(true);
  };

  const doJoin = async () => {
    if (!backendReady) { show('Add your Supabase keys to .env.local to join rooms (see /api/health)'); return; }
    if (joinCode.length < 4) { show('Enter a valid code'); return; }
    setLoading('join');
    try {
      const r = await fetch('/api/join-room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.trim(), playerName: profile?.full_name || 'Player', userId: userId || null }) });
      const d = await r.json(); if (d.error) throw new Error(d.error);
      localStorage.setItem('fp_session', d.sessionToken); localStorage.setItem('fp_host', 'false'); localStorage.setItem('fp_room_code', d.room.code);
      router.push(`/room/${d.room.code}`);
    } catch (e) { show(e.message); setLoading(''); }
  };

  // Tiles that need an account are visible for guests but locked — clicking
  // them opens the sign-in-required modal instead of dead-ending on /login.
  const APPS = [
    { label: 'Host a room', bg: 'linear-gradient(160deg,#ff9f0a,#ff375f)', Ic: IconFilm, on: hostClick },
    { label: 'Join a room', bg: 'linear-gradient(160deg,#c98bff,#7b2ff7)', Ic: IconTicket, on: () => setJoinOpen(true) },
    { label: 'History', bg: 'linear-gradient(160deg,#5de0e6,#1fb6c9)', Ic: IconClock, on: () => router.push('/profile'), needsAuth: true },
    { label: 'Matches', bg: 'linear-gradient(160deg,#ff8fbf,#ff2d78)', Ic: IconHeart, on: () => router.push('/profile'), needsAuth: true },
    { label: 'My rooms', bg: 'linear-gradient(160deg,#ffd66b,#f5a623)', Ic: IconHome, on: () => router.push('/profile'), needsAuth: true },
    { label: 'Profile', bg: 'linear-gradient(160deg,#4be08b,#12b56a)', Ic: IconUsers, on: () => router.push('/profile'), needsAuth: true },
  ];
  const isLocked = a => a.needsAuth && !userId;

  return (
    <div className="dash">
      {/* Dim movie wall behind the app — it's a movie night app, after all */}
      <div className="landing-cinema" style={{ opacity: 0.45 }} aria-hidden="true">
        <PosterWall posters={posters} />
        <div className="landing-scrim" />
      </div>

      {/* Nav */}
      <header className="relative z-10">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[7px] grid place-items-center text-white" style={{ background: 'rgba(255,255,255,.16)' }}><IconBrand size={14} /></span>
            <span className="text-[17px] font-semibold text-white tracking-tight">FlickPick</span>
          </div>
          {userId ? (
            <button onClick={() => router.push('/profile')} aria-label="Profile" className="w-8 h-8 rounded-full overflow-hidden grid place-items-center" style={{ background: 'rgba(255,255,255,.16)' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <PersonGlyph size={20} />}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-white/45 text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'rgba(255,255,255,.08)' }}>Guest</span>
              <button onClick={() => router.push('/login')} className="text-white/80 hover:text-white text-[14px] font-medium transition">Sign in</button>
            </div>
          )}
        </div>
      </header>

      {!backendReady && (
        <div role="alert" className="relative z-10 max-w-[1080px] mx-auto px-6 pt-1">
          <div className="rounded-xl px-4 py-2.5 text-[12.5px] flex items-center gap-2" style={{ background: 'rgba(255,159,10,.12)', border: '0.5px solid rgba(255,159,10,.3)', color: '#ffd08a' }}>
            <span className="font-semibold">Backend not configured.</span>
            <span className="text-white/60">Browse freely — hosting &amp; joining need Supabase keys in <code>.env.local</code>. Open <a href="/api/health" className="underline">/api/health</a>.</span>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-[1080px] mx-auto px-6 pb-16 pt-3">
        <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
          {/* Profile card */}
          <div className="dash-card p-6 rise">
            <div className="w-24 h-24 rounded-full overflow-hidden grid place-items-center mb-4" style={{ background: 'var(--brand-grad)', boxShadow: '0 12px 32px -10px var(--brand-glow)' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <PersonGlyph size={54} />}
            </div>
            <h2 className="text-white text-[26px] font-bold leading-none">{profile?.full_name || 'Guest'}</h2>
            <p className="text-white/55 text-[14px] mt-1.5">{profile?.email || 'Sign in to sync'}</p>
            <p className="text-white font-semibold text-[15px] mt-4">{planFor(profile).label}</p>
          </div>

          {/* App tiles */}
          <div className="dash-card p-6 sm:p-7 rise" style={{ animationDelay: '.05s' }}>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-6 gap-x-3">
              {APPS.map((a, i) => (
                <button key={i} onClick={() => (isLocked(a) ? setSignInOpen(true) : a.on())} disabled={!!loading}
                  aria-disabled={isLocked(a)} title={isLocked(a) ? 'Sign in required' : undefined}
                  className="dash-app tile-lockable flex flex-col items-center gap-2 disabled:opacity-60">
                  <span className="dash-tile" style={{ background: a.bg }}>
                    {loading === 'host' && a.label === 'Host a room' ? <span className="spinner !w-5 !h-5 !border-2 !border-white/40 !border-t-white" /> : <a.Ic size={28} />}
                  </span>
                  <span className="text-white text-[12px] font-medium text-center">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {[{ l: 'Your rooms', v: stats.rooms }, { l: 'Your matches', v: stats.matches }, { l: 'Watch history', v: stats.swiped }].map((s, i) => (
            <button key={i} onClick={() => (userId ? router.push('/profile') : setSignInOpen(true))} className="text-left">
              <div className="flex items-center gap-1.5 text-white text-[22px] font-bold">{s.l}<IconArrowRight size={18} /></div>
              <div className="text-white/60 text-[15px] font-semibold mt-1">{s.v} total</div>
            </button>
          ))}
        </div>
      </main>

      {/* Guest host modal — asks the name once, then creates the room */}
      {hostOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center px-5" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }} onClick={() => setHostOpen(false)}>
          <div className="dash-card p-6 w-full max-w-[360px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-[18px] font-semibold">Host a room</h3>
              <button onClick={() => setHostOpen(false)} aria-label="Close" className="text-white/60 hover:text-white"><IconClose size={18} /></button>
            </div>
            <label className="label !text-white/45" htmlFor="hostName">Your name</label>
            <input id="hostName" autoFocus value={hostName} onChange={e => setHostName(e.target.value)} onKeyDown={e => e.key === 'Enter' && hostName.trim() && host(hostName.trim())} placeholder="Enter your name" className="field-on-dark mb-4" autoComplete="name" />
            <button onClick={() => hostName.trim() && host(hostName.trim())} disabled={loading === 'host' || !hostName.trim()} className="btn btn-primary btn-block btn-lg">
              {loading === 'host' ? 'Creating…' : <>Create room <IconArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Sign-in required (guest tried a locked feature) */}
      <Modal open={signInOpen} onClose={() => setSignInOpen(false)} label="Sign in required">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-white text-[18px] font-semibold">Sign in required</h3>
          <button onClick={() => setSignInOpen(false)} aria-label="Close" className="text-white/60 hover:text-white p-1 -m-1"><IconClose size={18} /></button>
        </div>
        <p className="text-white/55 text-[13.5px] leading-relaxed mb-5">History, matches and your rooms are saved to your account. Sign in to unlock them — your guest games stay on this device.</p>
        <button onClick={() => router.push('/login')} className="btn btn-primary btn-block btn-lg mb-2">Sign in <IconArrowRight size={17} /></button>
        <button onClick={() => setSignInOpen(false)} className="btn btn-ghost btn-sm btn-block">Maybe later</button>
      </Modal>

      {/* Join modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center px-5" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }} onClick={() => setJoinOpen(false)}>
          <div className="dash-card p-6 w-full max-w-[360px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-[18px] font-semibold">Join a room</h3>
              <button onClick={() => setJoinOpen(false)} className="text-white/60 hover:text-white"><IconClose size={18} /></button>
            </div>
            <input autoFocus value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && doJoin()} placeholder="ABC123" maxLength={6} autoCapitalize="characters" className="field-on-dark mb-4 text-center !text-[22px] font-bold tracking-[8px]" style={{ fontFamily: 'var(--font-display)' }} />
            <button onClick={doJoin} disabled={loading === 'join'} className="btn btn-primary btn-block btn-lg">{loading === 'join' ? 'Joining…' : <>Join room <IconArrowRight size={18} /></>}</button>
          </div>
        </div>
      )}
      <Toast msg={toast.msg} visible={toast.v} />
    </div>
  );
}
