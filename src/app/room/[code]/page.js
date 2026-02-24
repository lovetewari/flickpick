'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { OTT_PLATFORMS, OTT_BG, GENRES, CONTENT_TYPES, getCategoriesForType, COLORS } from '@/lib/constants';
import StarBG from '@/components/StarBG';
import Toast from '@/components/Toast';
import SwipeCard from '@/components/SwipeCard';

export default function RoomPage() {
  const { code } = useParams();
  const router = useRouter();

  // ── Core ──
  const [screen, setScreen] = useState('loading');
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [myToken, setMyToken] = useState('');   // this device's session token
  const [toast, setToast] = useState({msg:'',v:false});
  const show = m => { setToast({msg:m,v:true}); setTimeout(()=>setToast(t=>({...t,v:false})),2500); };

  // ── Lobby ──
  const [contentType, setContentType] = useState('all');
  const [category, setCategory] = useState('trending');
  const [platforms, setPlatforms] = useState([]);
  const [genre, setGenre] = useState('All');
  const [addName, setAddName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // ── Content ──
  const [content, setContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  // ── Swiping ──
  const [movieIdx, setMovieIdx] = useState(0);

  // ── Results ──
  const [resultTab, setResultTab] = useState('matches');
  const [resultData, setResultData] = useState(null);
  const [showConf, setShowConf] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);

  // ── When content type changes, reset category ──
  useEffect(() => {
    const cats = getCategoriesForType(contentType);
    if (!cats.find(c => c.id === category)) setCategory(cats[0].id);
    setContentLoaded(false);
    setContent([]);
  }, [contentType]);

  useEffect(() => { setContentLoaded(false); }, [category, genre, platforms]);

  // ── Fetch content using room params ──
  const fetchContentForRoom = useCallback(async (type, cat, gen, plats) => {
    setContentLoading(true);
    try {
      const params = new URLSearchParams({ type, category: cat, genre: gen, platforms: (plats||[]).join(',') });
      const r = await fetch(`/api/tmdb?${params}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setContent(d.results || []);
      setContentLoaded(true);
    } catch (err) { show('Failed to load content'); }
    setContentLoading(false);
  }, []);

  // ── Init ──
  useEffect(() => {
    (async () => {
      const host = localStorage.getItem('fp_host') === 'true';
      const token = localStorage.getItem('fp_session') || '';
      setIsHost(host);
      setMyToken(token);

      const { data: r } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).single();
      if (!r) { router.push('/'); return; }
      setRoom(r);
      if (r.platforms?.length) setPlatforms(r.platforms);
      if (r.genre_filter) setGenre(r.genre_filter);
      if (r.content_type) setContentType(r.content_type);
      if (r.content_category) setCategory(r.content_category);

      const { data: ps } = await supabase.from('players').select('*').eq('room_id', r.id).order('player_order');
      setPlayers(ps || []);

      if (r.status === 'lobby') {
        setScreen(host ? 'lobby' : 'waiting');
      } else if (r.status === 'results') {
        // Load content first so match posters render correctly
        await fetchContentForRoom(r.content_type||'all', r.content_category||'trending', r.genre_filter||'All', r.platforms||[]);
        fetchResults();
        setScreen('results');
      } else if (r.status === 'swiping') {
        // Rejoining a game in progress — load content and go to swiping
        await fetchContentForRoom(r.content_type||'all', r.content_category||'trending', r.genre_filter||'All', r.platforms||[]);
        setMovieIdx(0);
        setScreen('swiping');
      }
    })();
  }, [code, router]);

  // ── React to room status changes (for non-hosts waiting) ──
  useEffect(() => {
    if (!room || isHost) return;
    if (room.status === 'swiping' && screen === 'waiting') {
      (async () => {
        await fetchContentForRoom(
          room.content_type||'all',
          room.content_category||'trending',
          room.genre_filter||'All',
          room.platforms||[]
        );
        setMovieIdx(0);
        setScreen('swiping');
      })();
    }
    if (room.status === 'results' && screen !== 'results') {
      (async () => {
        // Load content so match posters render correctly
        if (content.length === 0) {
          await fetchContentForRoom(room.content_type||'all', room.content_category||'trending', room.genre_filter||'All', room.platforms||[]);
        }
        await fetchResults();
        setScreen('results');
        setShowConf(true);
      })();
    }
  }, [room?.status]);

  // ── Realtime ──
  useEffect(() => {
    if (!room) return;
    const ch = supabase.channel(`room-${room.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'players', filter:`room_id=eq.${room.id}` }, p => {
        if (p.eventType==='INSERT') {
          setPlayers(prev => [...prev.filter(x=>x.id!==p.new.id), p.new].sort((a,b)=>a.player_order-b.player_order));
          show(`${p.new.name} joined! ${p.new.avatar}`);
        } else if (p.eventType==='UPDATE') {
          setPlayers(prev => prev.map(x=>x.id===p.new.id?p.new:x));
        }
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'rooms', filter:`id=eq.${room.id}` }, p => {
        setRoom(p.new); // triggers the useEffect above for screen transitions
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [room]);

  // ── Load content (lobby) ──
  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const params = new URLSearchParams({ type:contentType, category, genre, platforms:platforms.join(',') });
      const r = await fetch(`/api/tmdb?${params}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setContent(d.results || []);
      setContentLoaded(true);
      const mc = (d.results||[]).filter(c=>c.type==='movie').length;
      const sc = (d.results||[]).filter(c=>c.type==='series').length;
      if (contentType==='movies') show(`✓ ${mc} movies loaded`);
      else if (contentType==='series') show(`✓ ${sc} web series loaded`);
      else show(`✓ ${mc} movies + ${sc} series loaded`);
    } catch (err) { show('Failed: ' + err.message); setContent([]); }
    setContentLoading(false);
  }, [contentType, category, genre, platforms]);

  const fetchResults = async () => {
    try { const r = await fetch(`/api/results/${code}`); const d = await r.json(); setResultData(d); return d; } catch { return null; }
  };

  // ── Invite ──
  const inviteLink = typeof window!=='undefined'?`${window.location.origin}/join/${code}`:'';
  const copyInvite = () => { navigator.clipboard?.writeText(`🎬 Join my FlickPick room!\nCode: ${code}\n${inviteLink}`).then(()=>show('Copied! 📋')).catch(()=>show(`Code: ${code}`)); };
  const shareInvite = async () => { if(navigator.share) try{await navigator.share({title:'FlickPick',text:`Join room ${code}`,url:inviteLink});}catch{copyInvite();}else copyInvite(); };

  // ── Add friend ──
  const addFriend = async n => {
    try {
      const r = await fetch('/api/join-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,playerName:n})});
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setAddName(''); setShowAdd(false);
    } catch(e){show(e.message);}
  };

  // ── Start swiping (host only) ──
  const startSwiping = async () => {
    if(content.length===0){show('Load content first');return;}
    await fetch(`/api/results/${code}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'swiping',platforms,genre_filter:genre,content_type:contentType,content_category:category})});
    setMovieIdx(0);
    setScreen('swiping');
  };

  // ── Swipe handler — each device swipes as its own player ──
  const handleSwipe = dir => {
    const item = content[movieIdx]; if (!item) return;
    const token = myToken || localStorage.getItem('fp_session') || '';
    // Fire-and-forget — don't await, keeps swiping instant
    fetch('/api/swipe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:token,contentId:item.id,contentType:item.type,liked:dir==='right'})});
    if (movieIdx + 1 < content.length) {
      setMovieIdx(p => p + 1);
    } else {
      // Mark this player as done
      fetch('/api/swipe',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:token})});
      setScreen('orgReveal');
    }
  };

  // ── Reveal results (host only) ──
  const revealResults = async () => {
    if (revealLoading) return;
    setRevealLoading(true);
    try {
      // First fetch current results so matchIds are populated for history
      const rRes = await fetch(`/api/results/${code}`);
      const rData = await rRes.json();
      setResultData(rData);

      const { data:{user} } = await supabase.auth.getUser();
      let historyEntries = [];
      if (user) {
        const matchSet = new Set(rData.matchIds||[]);
        for (const item of content) {
          historyEntries.push({
            user_id: user.id, room_code: code, content_id: item.id,
            content_type: item.type, title: item.title,
            poster_path: item.posterPath || '', was_match: matchSet.has(item.id),
          });
        }
      }
      await fetch(`/api/results/${code}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'results',historyEntries})});
      setShowConf(true);
      setScreen('results');
    } finally {
      setRevealLoading(false);
    }
  };

  const myPlayer = players.find(p => p.session_token === myToken) || players[0];
  const progress = content.length>0?(movieIdx/content.length)*100:0;
  const movieCount = content.filter(c=>c.type==='movie').length;
  const seriesCount = content.filter(c=>c.type==='series').length;
  const canStart = platforms.length>0 && players.length>=2 && content.length>0 && contentLoaded;
  const categories = getCategoriesForType(contentType);

  // ═══════════════════════════════════════
  //  SCREENS
  // ═══════════════════════════════════════

  if (screen==='loading') return <><StarBG/><div className="relative z-10 min-h-screen flex items-center justify-center"><div className="spinner"/></div></>;

  // ── WAITING (non-host) ──
  if (screen==='waiting') return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 max-w-[480px] mx-auto text-center" style={{animation:'slideUp .6s ease'}}>
      <div className="w-20 h-20 rounded-3xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-[40px] mb-5" style={{animation:'pulseGlow 2.5s ease-in-out infinite'}}>⏳</div>
      <h2 className="text-2xl font-black mb-2" style={{fontFamily:"'Playfair Display',serif"}}>You're in!</h2>
      <div className="glass !rounded-full px-5 py-2.5 inline-block mb-4"><span className="text-white/35 text-[11px] font-semibold tracking-wide">ROOM </span><span className="text-gold text-xl font-black tracking-[3px]" style={{fontFamily:"'Bebas Neue'"}}>{code}</span></div>
      <p className="text-white/35 text-sm mb-2">Waiting for the host to start...</p>
      <div className="flex gap-2 mt-4 flex-wrap justify-center">{players.map(p=>(
        <div key={p.id} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:`${p.color}22`,border:`2px solid ${p.color}44`}}>{p.avatar}</div><span className="text-white/30 text-[10px]">{p.name.slice(0,8)}</span></div>
      ))}</div>
    </div>
  </>);

  // ── CONTENT LOADING (for non-hosts transitioning to swiping) ──
  if (contentLoading) return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="spinner"/>
      <p className="text-white/40 text-sm">Loading content...</p>
    </div>
  </>);

  // ═══════════════════════════════════════
  //  LOBBY — The main config screen
  // ═══════════════════════════════════════
  if (screen==='lobby') return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-5 pb-10 max-w-[480px] mx-auto">

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-5" style={{animation:'slideUp .4s ease'}}>
        <button onClick={()=>router.push('/')} className="text-white/40 text-xl">←</button>
        <div className="glass !rounded-full px-4 py-2 flex items-center gap-2"><span className="text-white/30 text-[10px] font-bold tracking-[1.5px]">ROOM</span><span className="text-gold text-lg font-black tracking-[3px]" style={{fontFamily:"'Bebas Neue'"}}>{code}</span></div>
      </div>

      {/* ── 1. INVITE ── */}
      <div className="glass p-5 w-full mb-4" style={{borderColor:'rgba(212,168,67,.15)',background:'linear-gradient(135deg,rgba(212,168,67,.05),rgba(212,168,67,.01))',animation:'slideUp .5s ease .08s both'}}>
        <div className="flex items-center gap-2.5 mb-3"><span className="text-lg">📨</span><h3 className="text-[16px] font-extrabold text-gold" style={{fontFamily:"'Playfair Display',serif"}}>Invite Friends</h3></div>
        <div className="bg-black/30 rounded-xl px-3.5 py-2.5 mb-3 border border-white/[.06]"><span className="text-white/40 text-[11px] font-mono truncate block">{inviteLink}</span></div>
        <div className="flex gap-2"><button onClick={shareInvite} className="btn-gold !p-3 !text-[12px] flex-1">Share ↗</button><button onClick={copyInvite} className="btn-glass !p-3 !text-[12px] flex-1">Copy 📋</button></div>
      </div>

      {/* ── 2. MEMBERS ── */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .12s both'}}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-[16px] font-extrabold" style={{fontFamily:"'Playfair Display',serif"}}>Members ({players.length})</h3><span className="text-white/20 text-[11px]">{players.length}/12</span></div>
        <div className="flex flex-col gap-2">{players.map(p=>(
          <div key={p.id} className="glass !p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{background:`${p.color}22`,border:`2px solid ${p.color}44`}}>{p.avatar}</div>
            <span className="text-white text-[15px] font-bold flex-1">{p.name}</span>
            {p.is_host&&<span className="text-gold text-[10px] font-bold bg-gold/15 px-2 py-0.5 rounded-md">HOST</span>}
          </div>
        ))}</div>
        {showAdd
          ? <div className="flex gap-2 mt-2.5"><input autoFocus value={addName} onChange={e=>setAddName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addName&&addFriend(addName)} placeholder="Friend's name" className="inp !p-3 !text-sm flex-1"/><button onClick={()=>addName&&addFriend(addName)} className="bg-gradient-to-r from-gold to-gold-light text-surface font-extrabold rounded-xl px-4 text-sm">Add</button><button onClick={()=>{setShowAdd(false);setAddName('');}} className="btn-glass !w-auto !p-3 !text-sm">✕</button></div>
          : <button onClick={()=>setShowAdd(true)} className="btn-glass mt-2.5 flex items-center justify-center gap-2 !p-3"><span className="text-lg leading-none">+</span> Add Friend</button>
        }
      </div>

      {/* ═══ 3. WHAT TO WATCH ═══ */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .16s both'}}>
        <h3 className="text-[17px] font-extrabold mb-1" style={{fontFamily:"'Playfair Display',serif"}}>What does your group want?</h3>
        <p className="text-white/25 text-[12px] mb-3">Choose whether you're picking a movie, a web series, or both</p>
        <div className="flex flex-col gap-2">
          {CONTENT_TYPES.map(t => {
            const sel = contentType === t.id;
            const colors = { movies:'from-gold/20 to-gold/5 border-gold/40', series:'from-purple-500/20 to-purple-500/5 border-purple-500/40', all:'from-blue-500/20 to-blue-500/5 border-blue-500/40' };
            const icons = { movies:'🍿', series:'📺', all:'🎬' };
            return (
              <button key={t.id} onClick={()=>setContentType(t.id)}
                className={`w-full rounded-2xl p-4 text-left transition-all ${sel?`bg-gradient-to-r ${colors[t.id]} border`:'bg-white/[.02] border border-white/[.06] hover:bg-white/[.04]'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icons[t.id]}</span>
                  <div className="flex-1">
                    <div className={`text-[15px] font-bold ${sel?'text-white':'text-white/50'}`}>{t.label}</div>
                    <div className={`text-[12px] ${sel?'text-white/50':'text-white/25'}`}>{t.desc}</div>
                  </div>
                  {sel && <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm">✓</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 4. CATEGORY ═══ */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .2s both'}}>
        <h3 className="text-[16px] font-extrabold mb-1" style={{fontFamily:"'Playfair Display',serif"}}>
          {contentType==='movies'?'Movie Category':contentType==='series'?'Series Category':'Category'}
        </h3>
        <p className="text-white/25 text-[12px] mb-3">
          {contentType==='movies'?'What kind of movies?':contentType==='series'?'What kind of web series?':'What kind of content?'}
        </p>
        <div className="flex flex-col gap-1.5">
          {categories.map(c => {
            const sel = category === c.id;
            return (
              <button key={c.id} onClick={()=>setCategory(c.id)}
                className={`w-full rounded-xl px-4 py-3 text-left flex items-center gap-3 transition-all ${sel?'bg-gold/15 border border-gold/30':'bg-white/[.02] border border-white/[.06] hover:bg-white/[.04]'}`}>
                <span className="text-lg">{c.label.split(' ')[0]}</span>
                <div className="flex-1">
                  <span className={`text-[13px] font-bold ${sel?'text-gold':'text-white/40'}`}>{c.label.split(' ').slice(1).join(' ')}</span>
                  <span className={`text-[11px] ml-2 ${sel?'text-gold/50':'text-white/20'}`}>{c.desc}</span>
                </div>
                {sel && <span className="text-gold text-sm">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. PLATFORMS ── */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .24s both'}}>
        <h3 className="text-[16px] font-extrabold mb-3" style={{fontFamily:"'Playfair Display',serif"}}>Streaming Platforms</h3>
        <div className="grid grid-cols-3 gap-2">{OTT_PLATFORMS.map(p=>{const sel=platforms.includes(p.name);return(
          <button key={p.name} onClick={()=>setPlatforms(prev=>prev.includes(p.name)?prev.filter(x=>x!==p.name):[...prev,p.name])}
            className="rounded-2xl py-3.5 px-2 flex flex-col items-center gap-1 transition-all"
            style={{background:sel?p.bg:'rgba(255,255,255,.03)',border:sel?'2px solid transparent':'1px solid rgba(255,255,255,.08)',transform:sel?'scale(1.03)':'scale(1)',boxShadow:sel?`0 6px 24px ${p.color}25`:'none'}}>
            <span className={`text-[11px] font-extrabold text-center leading-tight ${sel?'text-white':'text-white/40'}`}>{p.name}</span>
            {sel&&<span className="text-sm">✓</span>}
          </button>
        );})}</div>
      </div>

      {/* ── 6. GENRE FILTER ── */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .28s both'}}>
        <h3 className="text-[15px] font-bold text-white/50 mb-2" style={{fontFamily:"'Playfair Display',serif"}}>Genre Filter</h3>
        <div className="flex gap-1.5 flex-wrap">{GENRES.map(g=>(
          <button key={g} onClick={()=>setGenre(g)} className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${genre===g?'bg-gold/20 border border-gold/50 text-gold':'bg-white/[.04] border border-white/[.06] text-white/30'}`}>{g}</button>
        ))}</div>
      </div>

      {/* ═══ 7. LOAD & PREVIEW ═══ */}
      <div className="w-full mb-5" style={{animation:'slideUp .5s ease .32s both'}}>
        <button onClick={loadContent} disabled={contentLoading||platforms.length===0} className="btn-glass flex items-center justify-center gap-2">
          {contentLoading
            ? <><div className="spinner !w-5 !h-5 !border-2"/>Loading from TMDB...</>
            : `🔍 Load ${contentType==='movies'?'Movies':contentType==='series'?'Web Series':'Movies & Series'}`}
        </button>

        {contentLoaded && content.length > 0 && (
          <div className="mt-4 glass p-4" style={{animation:'slideUp .4s ease'}}>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-green-500 text-[13px] font-bold">✓ {content.length} titles ready</span>
              {movieCount > 0 && <span className="type-badge-movie text-[10px] font-bold px-2 py-0.5 rounded-md">🍿 {movieCount} Movie{movieCount!==1?'s':''}</span>}
              {seriesCount > 0 && <span className="type-badge-series text-[10px] font-bold px-2 py-0.5 rounded-md">📺 {seriesCount} Series</span>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollSnapType:'x mandatory'}}>
              {content.slice(0,10).map(c=>(
                <div key={c.id} className="shrink-0 w-[72px]" style={{scrollSnapAlign:'start'}}>
                  <div className="relative">
                    <img src={c.poster} alt="" className="w-[72px] h-[104px] rounded-lg object-cover border border-white/[.06]"/>
                    <div className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold ${c.type==='series'?'type-badge-series':'type-badge-movie'}`}>
                      {c.type==='series'?'📺':'🍿'}
                    </div>
                  </div>
                  <p className="text-white/30 text-[9px] mt-1 truncate font-medium">{c.title}</p>
                  {c.type==='series' && c.seasons>0 && <p className="text-purple-400/60 text-[8px]">{c.seasons}S · {c.episodes||'?'}Ep</p>}
                  {c.type==='movie' && c.duration && <p className="text-gold/50 text-[8px]">{c.duration}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 8. START BUTTON ═══ */}
      <div className="w-full pb-4" style={{animation:'slideUp .5s ease .36s both'}}>
        <button onClick={startSwiping} disabled={!canStart} className="btn-gold">
          {contentType==='movies' ? `Start Swiping · ${movieCount} Movies 🍿`
           : contentType==='series' ? `Start Swiping · ${seriesCount} Series 📺`
           : `Start Swiping · ${content.length} Titles 🎬`}
        </button>
        {!canStart && <p className="text-white/20 text-[11px] text-center mt-2">
          {platforms.length===0?'Select at least one platform':players.length<2?'Add at least 2 players':!contentLoaded?'Load content first':''}
        </p>}
      </div>
    </div>
    <Toast msg={toast.msg} visible={toast.v}/>
  </>);

  // ── SWIPING ──
  if (screen==='swiping') {
    return (<><StarBG/><div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-5 max-w-[480px] mx-auto">
      <div className="w-full flex items-center justify-between mb-1.5" style={{animation:'fadeIn .4s ease'}}>
        <div className="flex items-center gap-2.5">
          {myPlayer && <>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{background:`${myPlayer.color}22`,border:`2px solid ${myPlayer.color}44`}}>{myPlayer.avatar}</div>
            <div><div className="text-white text-sm font-bold">{myPlayer.name}</div><div className="text-white/30 text-[11px]">{content.length-movieIdx} left</div></div>
          </>}
        </div>
        <div className="flex items-center gap-1.5">{players.map(p=>(
          <div key={p.id} className="w-1.5 h-1.5 rounded-full" style={{background:p.session_token===myToken?'#D4A843':'rgba(255,255,255,.1)'}}/>
        ))}</div>
      </div>
      <div className="w-full h-[3px] bg-white/[.05] rounded mb-3 overflow-hidden"><div className="h-full rounded transition-all duration-300" style={{width:`${progress}%`,background:'linear-gradient(90deg,#D4A843,#E8C76A)'}}/></div>
      <div className="relative w-full flex justify-center" style={{height:570}}>
        {content.slice(movieIdx,movieIdx+2).reverse().map((item,i,arr)=>(
          <SwipeCard key={`${item.id}`} item={item} isTop={i===arr.length-1} onSwipe={handleSwipe}/>
        ))}
        {movieIdx>=content.length && <div className="text-center mt-16" style={{animation:'slideUp .6s ease'}}><span className="text-[60px]">✅</span><h3 className="text-white text-xl font-black mt-4" style={{fontFamily:"'Playfair Display',serif"}}>All done!</h3></div>}
      </div>
    </div></>);
  }

  // ── DONE / WAITING FOR REVEAL ──
  if (screen==='orgReveal') return (<><StarBG/><div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 max-w-[340px] mx-auto text-center" style={{animation:'slideUp .8s ease'}}>
    {isHost ? (<>
      <div className="text-[64px] mb-4" style={{animation:'float 3s ease-in-out infinite'}}>🥁</div>
      <h2 className="text-3xl font-black mb-2.5" style={{fontFamily:"'Playfair Display',serif"}}>All Done!</h2>
      <p className="text-white/40 text-sm mb-5">You swiped {content.length} titles</p>
      <div className="flex justify-center gap-2 mb-8 flex-wrap">{players.map(p=>(
        <div key={p.id} className="flex flex-col items-center gap-1"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{background:`${p.color}22`,border:'2px solid rgba(52,199,89,.4)'}}>{p.avatar}</div><span className="text-white/35 text-[10px] font-semibold">{p.name.slice(0,8)}</span></div>
      ))}</div>
      <button onClick={revealResults} disabled={revealLoading} className="btn-gold max-w-[320px]" style={{animation:revealLoading?'none':'pulseGlow 2s ease-in-out infinite'}}>{revealLoading?'Calculating...':'✦ Reveal Results ✦'}</button>
    </>) : (<>
      <div className="text-[64px] mb-4" style={{animation:'float 3s ease-in-out infinite'}}>✅</div>
      <h2 className="text-3xl font-black mb-2.5" style={{fontFamily:"'Playfair Display',serif"}}>You're Done!</h2>
      <p className="text-white/40 text-sm mb-2">Waiting for the host to reveal results...</p>
      <div className="w-20 h-1 bg-gold/30 rounded-full mx-auto mt-4 overflow-hidden"><div className="h-full bg-gold rounded-full" style={{animation:'slideRight 1.5s ease-in-out infinite'}}/></div>
    </>)}
  </div></>);

  // ═══════════════════════════════════════
  //  RESULTS
  // ═══════════════════════════════════════
  if (screen==='results' && resultData) {
    const { matchIds, ranked, individual } = resultData;
    const rPlayers = resultData.players || players;
    const matchItems = content.filter(c=>(matchIds||[]).map(Number).includes(Number(c.id)));

    return (<><StarBG/>
      {showConf&&<div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">{COLORS.flatMap((c,ci)=>Array.from({length:5},(_,i)=>(
        <div key={`${ci}-${i}`} className="absolute" style={{width:6+i*2,height:6+i*2,background:c,borderRadius:i%2?'50%':'2px',left:`${(ci*8+i*15)%100}%`,top:-20,animation:`confetti ${2+i*.5}s ease-in forwards`,animationDelay:`${ci*.15+i*.2}s`,opacity:.85}}/>
      )))}</div>}

      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-5 pb-12 max-w-[480px] mx-auto" style={{animation:'slideUp .6s ease'}}>
        <h2 className="text-[32px] font-black text-center mt-3 mb-1" style={{fontFamily:"'Playfair Display',serif",background:'linear-gradient(135deg,#fff,#D4A843,#E8C76A)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Results 🎉</h2>
        <p className="text-white/30 text-[13px] text-center mb-6">{rPlayers.length} players · {content.length} titles</p>

        <div className="flex gap-1 bg-white/[.03] rounded-2xl p-1 mb-6 w-full border border-white/[.06]">
          {[{id:'matches',l:'🤝 Matches'},{id:'ranked',l:'🏆 Top Picks'},{id:'individual',l:'👥 Everyone'}].map(t=>(
            <button key={t.id} onClick={()=>setResultTab(t.id)} className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${resultTab===t.id?'bg-gold/20 border border-gold/30 text-gold':'text-white/35 border border-transparent'}`}>{t.l}</button>
          ))}
        </div>

        {/* ── MATCHES ── */}
        {resultTab==='matches'&&(<div className="w-full">
          {matchItems.length>0 ? <div className="flex flex-col gap-2.5">
            <p className="text-green-500 text-[13px] font-bold text-center mb-2">🎉 {matchItems.length} perfect match{matchItems.length>1?'es':''}!</p>
            {matchItems.map((m,i)=>(
              <div key={m.id} className="glass !p-0 overflow-hidden" style={{borderColor:'rgba(52,199,89,.2)',background:'linear-gradient(135deg,rgba(52,199,89,.06),rgba(52,199,89,.01))',animation:`slideUp .5s ease ${i*.08}s both`}}>
                <div className="flex gap-3.5 p-3.5 items-center">
                  <div className="relative shrink-0">
                    <img src={m.poster} alt="" className="w-16 h-24 rounded-xl object-cover shadow-lg"/>
                    <div className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold ${m.type==='series'?'type-badge-series':'type-badge-movie'}`}>{m.type==='series'?'📺':'🍿'}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-base font-extrabold leading-tight" style={{fontFamily:"'Playfair Display',serif"}}>{m.title}</div>
                    <div className="text-white/40 text-xs mt-0.5">{m.year} · ★ {m.rating}{m.duration?` · ${m.duration}`:''}</div>
                    {m.type==='series'&&m.seasons>0&&<div className="text-purple-400 text-[10px] font-bold mt-0.5">📺 {m.seasons}S · {m.episodes||'?'}Ep {m.status==='Returning Series'?'· 🟢 Ongoing':m.status==='Ended'?'· 🔴 Ended':''}</div>}
                    <div className="flex gap-1 mt-1.5 flex-wrap">{(m.ott||[]).map(o=><span key={o} className="ott" style={{background:OTT_BG[o]||'#555'}}>{o}</span>)}</div>
                  </div>
                  <div className="bg-green-500/15 rounded-2xl px-3 py-2 text-green-500 text-[10px] font-extrabold text-center shrink-0"><div className="text-lg mb-0.5">💚</div>ALL</div>
                </div>
              </div>
            ))}
          </div> : <div className="glass text-center py-10 px-6" style={{borderColor:'rgba(212,168,67,.1)',background:'rgba(212,168,67,.02)'}}><span className="text-[44px]">😅</span><p className="text-white/50 text-[15px] mt-3.5">No perfect matches</p><p className="text-white/30 text-[13px] mt-1.5">Check "Top Picks"!</p></div>}
        </div>)}

        {/* ── RANKED ── */}
        {resultTab==='ranked'&&(<div className="flex flex-col gap-2 w-full">
          {(ranked||[]).slice(0,20).map((r,i)=>{
            const item=content.find(c=>c.id===Number(r.contentId)); if(!item)return null;
            const pct=(r.votes/rPlayers.length)*100;
            const med=['🥇','🥈','🥉'];
            return(<div key={r.contentId} className="glass !p-3 flex items-center gap-2.5" style={{animation:`slideUp .4s ease ${i*.05}s both`}}>
              {i<3?<span className="text-xl w-8 text-center shrink-0">{med[i]}</span>:<div className="w-8 h-8 rounded-lg bg-white/[.04] flex items-center justify-center text-[13px] font-extrabold text-white/30 shrink-0">{i+1}</div>}
              <div className="relative shrink-0">
                <img src={item.poster} alt="" className="w-11 h-16 rounded-lg object-cover shadow"/>
                <div className={`absolute top-0.5 left-0.5 rounded px-0.5 py-0 text-[6px] font-bold ${item.type==='series'?'type-badge-series':'type-badge-movie'}`}>{item.type==='series'?'📺':'🍿'}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">{item.title}</div>
                <div className="text-white/30 text-[11px] mt-0.5">★ {item.rating} · {item.year}{item.type==='series'&&item.seasons>0?` · ${item.seasons}S`:''}{item.type==='movie'&&item.duration?` · ${item.duration}`:''}</div>
                <div className="flex gap-1 mt-1">{(r.voterIds||[]).map(vid=>{const v=rPlayers.find(p=>p.id===vid);return v?<div key={vid} className="w-5 h-5 rounded-md flex items-center justify-center text-[9px]" style={{background:`${v.color}33`,border:`1px solid ${v.color}55`}}>{v.avatar}</div>:null;})}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[15px] font-extrabold ${pct===100?'text-green-500':pct>=50?'text-gold':'text-white/30'}`}>{r.votes}/{rPlayers.length}</div>
                <div className="w-12 h-1 bg-white/[.05] rounded mt-1 overflow-hidden"><div className="h-full rounded" style={{width:`${pct}%`,background:pct===100?'#34C759':pct>=50?'linear-gradient(90deg,#D4A843,#E8C76A)':'rgba(255,255,255,.15)'}}/></div>
              </div>
            </div>);
          })}
        </div>)}

        {/* ── INDIVIDUAL ── */}
        {resultTab==='individual'&&(<div className="w-full">
          {rPlayers.map((p,pi)=>{
            const likes=((individual||{})[p.id]||[]).map(l=>content.find(c=>c.id===Number(l.id))).filter(Boolean);
            return(<div key={p.id} className="mb-5" style={{animation:`slideUp .5s ease ${pi*.1}s both`}}>
              <div className="flex items-center gap-2.5 mb-2.5"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{background:`${p.color}22`,border:`2px solid ${p.color}44`}}>{p.avatar}</div><span className="text-white text-[15px] font-bold">{p.name}</span><span className="text-white/20 text-xs">liked {likes.length}</span></div>
              {likes.length>0
                ? <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollSnapType:'x mandatory'}}>{likes.map(m=>(
                    <div key={m.id} className="shrink-0" style={{minWidth:100,scrollSnapAlign:'start'}}>
                      <div className="relative">
                        <img src={m.poster} alt="" className="w-[100px] h-[148px] rounded-xl object-cover border border-white/[.08] shadow-lg"/>
                        <div className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold ${m.type==='series'?'type-badge-series':'type-badge-movie'}`}>{m.type==='series'?'📺':'🍿'}</div>
                      </div>
                      <div className="text-white/60 text-[11px] font-semibold mt-1.5 truncate w-[100px]">{m.title}</div>
                      <div className="text-white/30 text-[10px]">★ {m.rating}{m.type==='series'&&m.seasons>0?` · ${m.seasons}S`:''}</div>
                    </div>
                  ))}</div>
                : <p className="text-white/15 text-xs italic pl-1">Didn't like anything</p>}
            </div>);
          })}
        </div>)}

        <div className="flex gap-2.5 mt-8 w-full" style={{animation:'slideUp .6s ease .6s both'}}>
          <button onClick={()=>router.push('/')} className="btn-glass flex-1">New Room</button>
          <button onClick={()=>window.location.reload()} className="btn-gold flex-1">Play Again ↻</button>
        </div>
      </div>
      <Toast msg={toast.msg} visible={toast.v}/>
    </>);
  }

  // Fallback
  return <><StarBG/><div className="relative z-10 min-h-screen flex items-center justify-center"><div className="spinner"/></div></>;
}
