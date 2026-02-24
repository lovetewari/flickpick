'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StarBG from '@/components/StarBG';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState('history');

  useEffect(() => {
    (async () => {
      const { data:{user:u} } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);
      const { data:p } = await supabase.from('profiles').select('*').eq('id',u.id).single();
      setProfile(p);
      const { data:h } = await supabase.from('watch_history').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(60);
      setHistory(h||[]);
      const { data:r } = await supabase.from('rooms').select('*').eq('host_id',u.id).order('created_at',{ascending:false}).limit(30);
      setRooms(r||[]);
    })();
  }, [router]);

  if (!user) return <><StarBG/><div className="relative z-10 min-h-screen flex items-center justify-center"><div className="spinner"/></div></>;
  const matches = history.filter(h=>h.was_match);

  return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-6 max-w-[480px] mx-auto">
      <div className="w-full flex items-center justify-between mb-6">
        <button onClick={()=>router.push('/')} className="text-white/40 text-xl">←</button>
        <h2 className="text-lg font-bold" style={{fontFamily:"'Playfair Display',serif"}}>Profile</h2>
        <button onClick={async()=>{await supabase.auth.signOut();router.push('/login');}} className="text-red-400/60 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-400/20">Sign Out</button>
      </div>

      {/* Profile card */}
      <div className="glass p-6 w-full mb-5 text-center" style={{animation:'slideUp .5s ease'}}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-3 border-2 border-gold/30"/>
          : <div className="w-16 h-16 rounded-2xl mx-auto mb-3 bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-3xl">😎</div>}
        <h3 className="text-xl font-extrabold" style={{fontFamily:"'Playfair Display',serif"}}>{profile?.full_name||'User'}</h3>
        <p className="text-white/30 text-sm mt-1">{profile?.email}</p>
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center"><div className="text-gold text-xl font-black">{rooms.length}</div><div className="text-white/30 text-[11px] font-semibold">Rooms</div></div>
          <div className="text-center"><div className="text-green-500 text-xl font-black">{matches.length}</div><div className="text-white/30 text-[11px] font-semibold">Matches</div></div>
          <div className="text-center"><div className="text-purple-400 text-xl font-black">{history.length}</div><div className="text-white/30 text-[11px] font-semibold">Swiped</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[.03] rounded-2xl p-1 mb-5 w-full border border-white/[.06]">
        {[{id:'history',l:'🕐 History'},{id:'matches',l:'💚 Matches'},{id:'rooms',l:'🏠 Rooms'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${tab===t.id?'bg-gold/20 border border-gold/30 text-gold':'text-white/35 border border-transparent'}`}>{t.l}</button>
        ))}
      </div>

      {/* Content */}
      {tab==='history' && (history.length > 0
        ? <div className="flex flex-wrap gap-2.5 w-full">{history.map((h,i)=>(
            <div key={h.id} className="w-[calc(33.33%-7px)]" style={{animation:`slideUp .4s ease ${i*.03}s both`}}>
              <div className="relative">
                {h.poster_path && <img src={`https://image.tmdb.org/t/p/w200${h.poster_path}`} alt="" className="w-full aspect-[2/3] rounded-xl object-cover border border-white/[.06]"/>}
                {h.was_match && <div className="absolute top-1 right-1 bg-green-500/80 rounded-md px-1.5 py-0.5 text-[8px] font-bold">MATCH</div>}
                <div className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[8px] font-bold ${h.content_type==='series'?'type-badge-series':'type-badge-movie'}`}>
                  {h.content_type==='series'?'📺':'🍿'}
                </div>
              </div>
              <p className="text-white/50 text-[10px] font-semibold mt-1.5 truncate">{h.title}</p>
            </div>
          ))}</div>
        : <div className="glass text-center py-12 w-full"><span className="text-3xl">📭</span><p className="text-white/30 mt-3 text-sm">No history yet</p></div>
      )}

      {tab==='matches' && (matches.length > 0
        ? <div className="flex flex-wrap gap-2.5 w-full">{matches.map((h,i)=>(
            <div key={h.id} className="w-[calc(33.33%-7px)]" style={{animation:`slideUp .4s ease ${i*.03}s both`}}>
              {h.poster_path && <img src={`https://image.tmdb.org/t/p/w200${h.poster_path}`} alt="" className="w-full aspect-[2/3] rounded-xl object-cover border border-green-500/20"/>}
              <p className="text-white/50 text-[10px] font-semibold mt-1.5 truncate">{h.title}</p>
            </div>
          ))}</div>
        : <div className="glass text-center py-12 w-full"><span className="text-3xl">💚</span><p className="text-white/30 mt-3 text-sm">No matches yet</p></div>
      )}

      {tab==='rooms' && (rooms.length > 0
        ? <div className="flex flex-col gap-2.5 w-full">{rooms.map((r,i)=>(
            <div key={r.id} className="glass !p-4 flex items-center justify-between" style={{animation:`slideUp .4s ease ${i*.05}s both`}}>
              <div>
                <span className="text-gold font-black tracking-[2px] text-sm" style={{fontFamily:"'Bebas Neue'"}}>{r.code}</span>
                <div className="flex gap-2 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.content_type==='series'?'type-badge-series':r.content_type==='movies'?'type-badge-movie':'bg-white/5 text-white/30 border border-white/10'}`}>
                    {r.content_type==='series'?'📺 Series':r.content_type==='movies'?'🍿 Movies':'🎬 Both'}
                  </span>
                  <span className="text-white/20 text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${r.status==='results'?'bg-green-500/15 text-green-500':'bg-gold/15 text-gold'}`}>{r.status}</span>
            </div>
          ))}</div>
        : <div className="glass text-center py-12 w-full"><span className="text-3xl">🏠</span><p className="text-white/30 mt-3 text-sm">No rooms yet</p></div>
      )}
    </div>
  </>);
}
