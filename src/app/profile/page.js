'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CinematicBG from '@/components/CinematicBG';
import BrandLoader from '@/components/BrandLoader';
import { IconChevronLeft, IconClock, IconHeart, IconHome, IconFilm, IconTv, IconUsers } from '@/components/Icons';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState('history');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    router.prefetch('/'); // "back" destination
    router.prefetch('/app');
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
      const { data: h } = await supabase.from('watch_history').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(60);
      setHistory(h || []);
      const { data: r } = await supabase.from('rooms').select('*').eq('host_id', u.id).order('created_at', { ascending: false }).limit(30);
      setRooms(r || []);
    })();
  }, [router]);

  if (!user) return <BrandLoader label="Loading profile…" />;
  const matches = history.filter(h => h.was_match);

  return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh]">
      <header className="sticky top-0 z-20 nav-blur">
        <div className="max-w-[760px] mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="btn btn-secondary btn-sm !w-auto !px-2.5" aria-label="Back"><IconChevronLeft size={18} /></button>
          <h2 className="text-[16px] font-semibold text-ink">Profile</h2>
          <button onClick={async () => { setSigningOut(true); await supabase.auth.signOut(); router.push('/login'); }} disabled={signingOut} aria-busy={signingOut} className="btn btn-danger btn-sm !w-auto">{signingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-5 pb-16 pt-2">
        {/* Profile card */}
        <div className="card p-6 text-center rise">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-3xl mx-auto mb-3 object-cover" />
            : <div className="w-20 h-20 rounded-3xl mx-auto mb-3 grid place-items-center text-accent" style={{ background: 'var(--accent-soft)' }}><IconUsers size={30} /></div>}
          <h3 className="text-[22px] font-bold text-ink">{profile?.full_name || 'User'}</h3>
          <p className="text-ink-3 text-sm mt-1">{profile?.email}</p>
          <div className="flex justify-center gap-8 mt-5">
            <div><div className="text-accent text-2xl font-bold">{rooms.length}</div><div className="text-ink-3 text-[11px] font-semibold">Rooms</div></div>
            <div><div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{matches.length}</div><div className="text-ink-3 text-[11px] font-semibold">Matches</div></div>
            <div><div className="text-2xl font-bold" style={{ color: 'var(--series)' }}>{history.length}</div><div className="text-ink-3 text-[11px] font-semibold">Swiped</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="segmented my-5">
          {[{ id: 'history', l: 'History', Ic: IconClock }, { id: 'matches', l: 'Matches', Ic: IconHeart }, { id: 'rooms', l: 'Rooms', Ic: IconHome }].map(t => (
            <button key={t.id} data-active={tab === t.id} onClick={() => setTab(t.id)} className="flex items-center justify-center gap-1.5"><t.Ic size={14} />{t.l}</button>
          ))}
        </div>

        {/* History */}
        {tab === 'history' && (history.length > 0
          ? <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{history.map((h, i) => (
              <div key={h.id} className="rise" style={{ animationDelay: `${i * 0.02}s` }}>
                <div className="relative">
                  {h.poster_path && <img src={`https://image.tmdb.org/t/p/w200${h.poster_path}`} alt="" className="w-full aspect-[2/3] rounded-xl object-cover border border-hair" />}
                  {h.was_match && <span className="badge badge-success absolute top-1 right-1">MATCH</span>}
                  <span className={`badge absolute bottom-1 left-1 ${h.content_type === 'series' ? 'badge-series' : 'badge-movie'}`}>{h.content_type === 'series' ? <IconTv size={10} /> : <IconFilm size={10} />}</span>
                </div>
                <p className="text-ink-2 text-[10px] font-medium mt-1.5 truncate">{h.title}</p>
              </div>
            ))}</div>
          : <Empty Ic={IconClock} text="No history yet" />
        )}

        {/* Matches */}
        {tab === 'matches' && (matches.length > 0
          ? <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{matches.map((h, i) => (
              <div key={h.id} className="rise" style={{ animationDelay: `${i * 0.02}s` }}>
                {h.poster_path && <img src={`https://image.tmdb.org/t/p/w200${h.poster_path}`} alt="" className="w-full aspect-[2/3] rounded-xl object-cover" style={{ border: '1px solid var(--success)' }} />}
                <p className="text-ink-2 text-[10px] font-medium mt-1.5 truncate">{h.title}</p>
              </div>
            ))}</div>
          : <Empty Ic={IconHeart} text="No matches yet" />
        )}

        {/* Rooms */}
        {tab === 'rooms' && (rooms.length > 0
          ? <div className="grid gap-2.5 sm:grid-cols-2">{rooms.map((r, i) => (
              <div key={r.id} className="card !p-4 flex items-center justify-between rise" style={{ animationDelay: `${i * 0.04}s` }}>
                <div>
                  <span className="wordmark text-accent tracking-[2px] text-[15px]">{r.code}</span>
                  <div className="flex gap-2 mt-1 items-center">
                    <span className={`badge ${r.content_type === 'series' ? 'badge-series' : 'badge-movie'}`}>
                      {r.content_type === 'series' ? <><IconTv size={10} />Series</> : r.content_type === 'movies' ? <><IconFilm size={10} />Movies</> : <><IconFilm size={10} />Both</>}
                    </span>
                    <span className="text-ink-3 text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`badge ${r.status === 'results' ? 'badge-success' : 'badge-movie'}`}>{r.status}</span>
              </div>
            ))}</div>
          : <Empty Ic={IconHome} text="No rooms yet" />
        )}
      </main>
    </div>
  </>);
}

function Empty({ Ic, text }) {
  return (
    <div className="card text-center py-14">
      <span className="tile tile-accent mx-auto mb-3 !w-12 !h-12"><Ic size={22} /></span>
      <p className="text-ink-3 text-sm">{text}</p>
    </div>
  );
}
