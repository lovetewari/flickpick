'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { OTT_PLATFORMS, OTT_BG, GENRES, CONTENT_TYPES, getCategoriesForType, COLORS, DECK_SIZES, LEGACY_CATEGORY, CATEGORIES } from '@/lib/constants';
import CinematicBG from '@/components/CinematicBG';
import Toast from '@/components/Toast';
import SwipeCard from '@/components/SwipeCard';
import BrandLoader from '@/components/BrandLoader';
import {
  IconFilm, IconTv, IconSparkles, IconStar, IconUsers, IconTrophy, IconHeart, IconPlay,
  IconClock, IconCheck, IconShare, IconCopy, IconPlus, IconClose, IconChevronLeft, IconArrowRight,
} from '@/components/Icons';

const CT_ICON = { movies: IconFilm, series: IconTv, all: IconSparkles };
const CAT_ICON = { hot: IconSparkles, latest: IconClock, hits: IconTrophy, most_watched: IconPlay, top_rated: IconStar, hidden_gems: IconHeart };

export default function RoomPage() {
  const { code } = useParams();
  const router = useRouter();

  const [screen, setScreen] = useState('loading');
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [myToken, setMyToken] = useState('');
  const [toast, setToast] = useState({ msg: '', v: false });
  const show = m => { setToast({ msg: m, v: true }); setTimeout(() => setToast(t => ({ ...t, v: false })), 2500); };

  const [contentType, setContentType] = useState('all');
  const [category, setCategory] = useState('hot');
  const [platforms, setPlatforms] = useState([]);
  const [genre, setGenre] = useState('All');
  const [deckMovies, setDeckMovies] = useState(20);   // host-picked deck sizes
  const [deckSeries, setDeckSeries] = useState(20);
  const [addName, setAddName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [content, setContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  const [movieIdx, setMovieIdx] = useState(0);

  const [resultTab, setResultTab] = useState('matches');
  const [resultData, setResultData] = useState(null);
  const [showConf, setShowConf] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);

  useEffect(() => {
    const cats = getCategoriesForType(contentType);
    if (!cats.find(c => c.id === category)) setCategory(cats[0].id);
    setContentLoaded(false);
    setContent([]);
  }, [contentType]);

  useEffect(() => { setContentLoaded(false); }, [category, genre, platforms, deckMovies, deckSeries]);

  const fetchContentForRoom = useCallback(async (type, cat, gen, plats, mCount, sCount) => {
    setContentLoading(true);
    try {
      const params = new URLSearchParams({
        type, category: cat, genre: gen, platforms: (plats || []).join(','),
        movieCount: String(mCount || 20), seriesCount: String(sCount || 20),
      });
      const r = await fetch(`/api/content?${params}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setContent(d.results || []);
      setContentLoaded(true);
      setContentLoading(false);
      return d.results || [];
    } catch (err) {
      show('Failed to load content');
      setContentLoading(false);
      return null;
    }
  }, []);

  // The single source of truth for a running game's deck: the frozen copy on
  // the room row. Only legacy rooms (no frozen deck) fall back to a rebuild.
  const resolveDeck = useCallback(async (r) => {
    if (Array.isArray(r.deck) && r.deck.length > 0) {
      setContent(r.deck);
      setContentLoaded(true);
      return r.deck;
    }
    return fetchContentForRoom(r.content_type || 'all', r.content_category || 'hot', r.genre_filter || 'All', r.platforms || [], r.movie_count, r.series_count);
  }, [fetchContentForRoom]);

  // Resume where this player left off: skip cards already swiped server-side.
  const restoreProgress = useCallback(async (deck, playerList, token) => {
    try {
      const me = (playerList || []).find(p => p.session_token === token);
      if (!me) return 0;
      const { data } = await supabase.from('swipes').select('content_id').eq('player_id', me.id);
      const swiped = new Set((data || []).map(s => s.content_id));
      if (swiped.size === 0) return 0;
      const idx = deck.findIndex(it => !swiped.has(it.id));
      return idx === -1 ? deck.length : idx;
    } catch { return 0; }
  }, []);

  useEffect(() => {
    (async () => {
      const host = localStorage.getItem('fp_host') === 'true';
      const token = localStorage.getItem('fp_session') || '';
      setIsHost(host);
      setMyToken(token);

      const { data: r } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).single();
      if (!r) { setScreen('notFound'); return; }
      setRoom(r);
      if (r.platforms?.length) setPlatforms(r.platforms);
      if (r.genre_filter) setGenre(r.genre_filter);
      if (r.content_type) setContentType(r.content_type);
      if (r.content_category) {
        const cat = LEGACY_CATEGORY[r.content_category] || r.content_category;
        setCategory(CATEGORIES.some(c => c.id === cat) ? cat : 'hot');
      }
      if (r.movie_count) setDeckMovies(r.movie_count);
      if (r.series_count) setDeckSeries(r.series_count);

      const { data: ps } = await supabase.from('players').select('*').eq('room_id', r.id).order('player_order');
      setPlayers(ps || []);

      if (r.status === 'lobby') {
        setScreen(host ? 'lobby' : 'waiting');
      } else if (r.status === 'results') {
        const deck = await resolveDeck(r);
        if (!deck) { setScreen('loadError'); return; }
        fetchResults();
        setScreen('results');
      } else if (r.status === 'swiping') {
        const deck = await resolveDeck(r);
        if (!deck) { setScreen('loadError'); return; }
        const idx = await restoreProgress(deck, ps || [], token);
        setMovieIdx(idx);
        setScreen(idx >= deck.length ? 'orgReveal' : 'swiping');
      }
    })();
  }, [code, router]);

  useEffect(() => {
    if (!room || isHost) return;
    if (room.status === 'swiping' && screen === 'waiting') {
      (async () => {
        const deck = await resolveDeck(room);
        if (!deck) { setScreen('loadError'); return; }
        const idx = await restoreProgress(deck, players, myToken);
        setMovieIdx(idx);
        setScreen(idx >= deck.length ? 'orgReveal' : 'swiping');
      })();
    }
    if (room.status === 'results' && screen !== 'results') {
      (async () => {
        if (content.length === 0) {
          const deck = await resolveDeck(room);
          if (!deck) { setScreen('loadError'); return; }
        }
        await fetchResults();
        setScreen('results');
        setShowConf(true);
      })();
    }
  }, [room?.status, screen]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase.channel(`room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, p => {
        if (p.eventType === 'INSERT') {
          setPlayers(prev => [...prev.filter(x => x.id !== p.new.id), p.new].sort((a, b) => a.player_order - b.player_order));
          show(`${p.new.name} joined! ${p.new.avatar}`);
        } else if (p.eventType === 'UPDATE') {
          setPlayers(prev => prev.map(x => x.id === p.new.id ? p.new : x));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, p => {
        setRoom(p.new);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
    // Depend on the id, NOT the room object — every rooms UPDATE replaces the
    // object, and depending on it tore down + recreated the channel on each
    // event (dropped events, reconnect storms — the main instability source).
  }, [room?.id]);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const params = new URLSearchParams({
        type: contentType, category, genre, platforms: platforms.join(','),
        movieCount: String(deckMovies), seriesCount: String(deckSeries),
      });
      const r = await fetch(`/api/content?${params}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setContent(d.results || []);
      setContentLoaded(true);
      const mc = (d.results || []).filter(c => c.type === 'movie').length;
      const sc = (d.results || []).filter(c => c.type === 'series').length;
      if (contentType === 'movies') show(`${mc} movies loaded`);
      else if (contentType === 'series') show(`${sc} web series loaded`);
      else show(`${mc} movies + ${sc} series loaded`);
    } catch (err) { show('Failed: ' + err.message); setContent([]); }
    setContentLoading(false);
  }, [contentType, category, genre, platforms, deckMovies, deckSeries]);

  const fetchResults = async () => {
    try {
      const r = await fetch(`/api/results/${code}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResultData(d);
      return d;
    } catch { return null; }
  };

  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : '';
  const copyInvite = () => { navigator.clipboard?.writeText(`Join my FlickPick room!\nCode: ${code}\n${inviteLink}`).then(() => show('Invite copied')).catch(() => show(`Code: ${code}`)); };
  const shareInvite = async () => { if (navigator.share) try { await navigator.share({ title: 'FlickPick', text: `Join room ${code}`, url: inviteLink }); } catch { copyInvite(); } else copyInvite(); };

  const addFriend = async n => {
    try {
      const r = await fetch('/api/join-room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, playerName: n }) });
      const d = await r.json(); if (d.error) throw new Error(d.error);
      setAddName(''); setShowAdd(false);
    } catch (e) { show(e.message); }
  };

  const startSwiping = async () => {
    if (content.length === 0) { show('Load content first'); return; }
    try {
      // Freeze the deck on the room so EVERY player gets this exact deck —
      // rejoins and results reloads read it back instead of rebuilding.
      const r = await fetch(`/api/results/${code}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'swiping', platforms, genre_filter: genre, content_type: contentType, content_category: category, movie_count: deckMovies, series_count: deckSeries, deck: content }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMovieIdx(0);
      setScreen('swiping');
    } catch (e) { show('Could not start: ' + e.message); }
  };

  // Mark this player done — with retries, so the host isn't left waiting on a
  // player whose final PATCH was dropped by a flaky connection.
  const markDone = async token => {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch('/api/swipe', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken: token }) });
        if (r.ok) return;
      } catch { /* retry */ }
      await new Promise(res => setTimeout(res, 700 * (i + 1)));
    }
    show('Could not sync your finish status');
  };

  const handleSwipe = dir => {
    const item = content[movieIdx]; if (!item) return;
    const token = myToken || localStorage.getItem('fp_session') || '';
    // Optimistic — the UI advances immediately, but failures surface a toast
    // instead of silently losing the vote.
    fetch('/api/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken: token, contentId: item.id, contentType: item.type, liked: dir === 'right' }) })
      .then(r => r.json())
      .then(d => { if (d?.error) show('Swipe failed to save'); })
      .catch(() => show('Swipe failed to save — check connection'));
    if (movieIdx + 1 < content.length) {
      setMovieIdx(p => p + 1);
    } else {
      markDone(token);
      setScreen('orgReveal');
    }
  };

  const revealResults = async () => {
    if (revealLoading) return;
    setRevealLoading(true);
    try {
      const rRes = await fetch(`/api/results/${code}`);
      const rData = await rRes.json();
      setResultData(rData);

      const { data: { user } } = await supabase.auth.getUser();
      let historyEntries = [];
      if (user) {
        const matchSet = new Set(rData.matchIds || []);
        for (const item of content) {
          historyEntries.push({
            user_id: user.id, room_code: code, content_id: item.id,
            content_type: item.type, title: item.title,
            poster_path: item.posterPath || '', was_match: matchSet.has(item.id),
          });
        }
      }
      await fetch(`/api/results/${code}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'results', historyEntries }) });
      setShowConf(true);
      setScreen('results');
    } finally {
      setRevealLoading(false);
    }
  };

  const myPlayer = players.find(p => p.session_token === myToken) || players[0];
  const progress = content.length > 0 ? (movieIdx / content.length) * 100 : 0;
  const movieCount = content.filter(c => c.type === 'movie').length;
  const seriesCount = content.filter(c => c.type === 'series').length;
  const canStart = platforms.length > 0 && players.length >= 2 && content.length > 0 && contentLoaded;
  const categories = getCategoriesForType(contentType);

  const CodePill = () => (
    <div className="flex items-center gap-2 rounded-full border border-hair bg-elevated px-3.5 py-1.5">
      <span className="text-ink-3 text-[10px] font-bold tracking-[1.5px]">ROOM</span>
      <span className="wordmark text-accent text-[16px] tracking-[2px]">{code}</span>
    </div>
  );
  const Avatar = ({ p, size = 40, ring }) => (
    <div className="rounded-xl grid place-items-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.44, background: `${p.color}22`, border: `2px solid ${ring || p.color + '55'}` }}>{p.avatar}</div>
  );
  const TypeBadge = ({ type, size = 11 }) => (
    <span className={`badge ${type === 'series' ? 'badge-series' : 'badge-movie'}`}>{type === 'series' ? <IconTv size={size} /> : <IconFilm size={size} />}</span>
  );

  // ═══════════════════════════════════════
  if (screen === 'loading') return (<><CinematicBG variant="content" /><div className="relative z-10"><BrandLoader label="Loading room…" /></div></>);

  // ── WAITING ──
  if (screen === 'waiting') return (<><CinematicBG variant="charcoal" />
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 max-w-[460px] mx-auto text-center rise">
      <div className="app-badge floaty mb-6"><IconClock size={40} /></div>
      <h2 className="text-[26px] font-bold text-white mb-2">You're in!</h2>
      <div className="mb-4"><CodePill /></div>
      <p className="text-white/50 text-sm mb-6">Waiting for the host to start…</p>
      <div className="flex gap-3 flex-wrap justify-center">{players.map(p => (
        <div key={p.id} className="flex flex-col items-center gap-1.5"><Avatar p={p} /><span className="text-white/40 text-[10px]">{p.name.slice(0, 8)}</span></div>
      ))}</div>
    </div>
  </>);

  if (contentLoading) return (<><CinematicBG variant="content" /><div className="relative z-10"><BrandLoader label="Loading content…" /></div></>);

  // ── ROOM NOT FOUND (invalid or expired link) ──
  if (screen === 'notFound') return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="card p-8 max-w-[380px] w-full text-center rise">
        <span className="tile tile-accent mx-auto mb-4 !w-12 !h-12"><IconClose size={22} /></span>
        <h2 className="text-ink text-[19px] font-bold mb-1.5">Room not found</h2>
        <p className="text-ink-3 text-[13.5px] mb-5">This link is invalid or the room no longer exists. Ask your host for a fresh invite.</p>
        <button onClick={() => router.push('/')} className="btn btn-primary btn-block">Go home</button>
      </div>
    </div>
  </>);

  // ── LOAD ERROR (deck could not be resolved on rejoin) ──
  if (screen === 'loadError') return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="card p-8 max-w-[380px] w-full text-center rise">
        <span className="tile tile-accent mx-auto mb-4 !w-12 !h-12"><IconClose size={22} /></span>
        <h2 className="text-ink text-[19px] font-bold mb-1.5">Couldn't load the game</h2>
        <p className="text-ink-3 text-[13.5px] mb-5">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary btn-block">Try again</button>
      </div>
    </div>
  </>);

  // ═══════════════════════════════════════
  //  LOBBY
  // ═══════════════════════════════════════
  if (screen === 'lobby') return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh]">
      <header className="sticky top-0 z-20 nav-blur">
        <div className="max-w-content mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="btn btn-secondary btn-sm !w-auto !px-2.5" aria-label="Back"><IconChevronLeft size={18} /></button>
          <span className="wordmark text-ink text-[17px] hidden sm:block">FlickPick</span>
          <CodePill />
        </div>
      </header>

      <main className="max-w-content mx-auto px-5 pb-28 lg:pb-16 pt-4">
        <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-7 lg:items-start">

          {/* LEFT */}
          <div className="lg:sticky lg:top-20 flex flex-col gap-4 mb-6 lg:mb-0">
            <div className="card p-5 rise">
              <div className="flex items-center gap-2.5 mb-3"><span className="tile tile-accent !w-8 !h-8 !rounded-[10px]"><IconShare size={16} /></span><h3 className="text-[16px] font-semibold text-ink">Invite friends</h3></div>
              <div className="rounded-xl px-3.5 py-2.5 mb-3 border border-hair" style={{ background: 'var(--surface-2)' }}><span className="text-ink-2 text-[12px] font-mono truncate block">{inviteLink}</span></div>
              <div className="flex gap-2">
                <button onClick={shareInvite} className="btn btn-primary btn-sm flex-1"><IconShare size={16} />Share</button>
                <button onClick={copyInvite} className="btn btn-secondary btn-sm flex-1"><IconCopy size={16} />Copy</button>
              </div>
            </div>

            <div className="card p-5 rise" style={{ animationDelay: '.05s' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-semibold text-ink">Members</h3>
                <span className="badge badge-movie">{players.length}/12</span>
              </div>
              <div className="flex flex-col gap-2">{players.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2" style={{ background: 'var(--surface-2)' }}>
                  <Avatar p={p} size={36} />
                  <span className="text-ink text-[14px] font-semibold flex-1 truncate">{p.name}</span>
                  {p.is_host && <span className="badge badge-movie">HOST</span>}
                </div>
              ))}</div>
              {showAdd
                ? <div className="flex gap-2 mt-3"><input autoFocus value={addName} onChange={e => setAddName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addName && addFriend(addName)} placeholder="Friend's name" className="field !h-11 flex-1" /><button onClick={() => addName && addFriend(addName)} className="btn btn-primary btn-sm !w-auto">Add</button><button onClick={() => { setShowAdd(false); setAddName(''); }} className="btn btn-secondary btn-sm !w-auto !px-2.5"><IconClose size={16} /></button></div>
                : <button onClick={() => setShowAdd(true)} className="btn btn-secondary btn-sm btn-block mt-3"><IconPlus size={16} />Add friend</button>
              }
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-7">
            {/* 1. What to watch */}
            <section className="rise">
              <h3 className="text-[19px] font-bold text-ink mb-1">What does your group want?</h3>
              <p className="text-ink-3 text-[13px] mb-3">Pick a movie, a web series, or both.</p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {CONTENT_TYPES.map(t => {
                  const sel = contentType === t.id; const Ic = CT_ICON[t.id] || IconFilm;
                  return (
                    <button key={t.id} onClick={() => setContentType(t.id)} className="text-left rounded-2xl p-4 border transition-all"
                      style={{ borderColor: sel ? 'var(--accent)' : 'var(--border)', background: sel ? 'var(--accent-soft)' : 'var(--bg-elevated)', boxShadow: sel ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
                      <span className="tile mb-3" style={{ background: sel ? 'rgba(10,132,255,.2)' : 'var(--surface-2)', color: sel ? '#4aa3ff' : 'var(--text-secondary)' }}><Ic size={20} /></span>
                      <div className="text-[14px] font-semibold text-ink">{t.label}</div>
                      <div className="text-[11px] text-ink-3 mt-0.5">{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Category */}
            <section className="rise" style={{ animationDelay: '.05s' }}>
              <h3 className="text-[17px] font-bold text-ink mb-1">{contentType === 'movies' ? 'Movie category' : contentType === 'series' ? 'Series category' : 'Category'}</h3>
              <p className="text-ink-3 text-[13px] mb-3">{contentType === 'movies' ? 'What kind of movies?' : contentType === 'series' ? 'What kind of web series?' : 'What kind of content?'}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map(c => {
                  const sel = category === c.id; const Ic = CAT_ICON[c.id] || IconSparkles;
                  return (
                    <button key={c.id} onClick={() => setCategory(c.id)} className="rounded-xl px-3.5 py-3 text-left flex items-center gap-3 border transition-all"
                      style={{ borderColor: sel ? 'var(--accent)' : 'var(--border)', background: sel ? 'var(--accent-soft)' : 'var(--bg-elevated)' }}>
                      <span className="w-9 h-9 rounded-[11px] grid place-items-center shrink-0" style={{ background: sel ? 'rgba(10,132,255,.2)' : 'var(--surface-2)', color: sel ? '#4aa3ff' : 'var(--text-secondary)' }}><Ic size={17} /></span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-semibold ${sel ? 'text-accent' : 'text-ink'}`}>{c.label}</div>
                        <div className="text-[11px] text-ink-3 truncate">{c.desc}</div>
                      </div>
                      {sel && <IconCheck size={16} />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Deck size */}
            <section className="rise" style={{ animationDelay: '.08s' }}>
              <h3 className="text-[17px] font-bold text-ink mb-1">Deck size</h3>
              <p className="text-ink-3 text-[13px] mb-3">How many titles your group swipes through</p>
              {contentType !== 'series' && (
                <div className={contentType === 'all' ? 'mb-3' : ''}>
                  {contentType === 'all' && <span className="label">Movies</span>}
                  <div className="flex gap-2 flex-wrap">{DECK_SIZES.map(n => (
                    <button key={n} onClick={() => setDeckMovies(n)} className="chip" data-active={deckMovies === n}>{n}</button>
                  ))}</div>
                </div>
              )}
              {contentType !== 'movies' && (
                <div>
                  {contentType === 'all' && <span className="label">Web series</span>}
                  <div className="flex gap-2 flex-wrap">{DECK_SIZES.map(n => (
                    <button key={n} onClick={() => setDeckSeries(n)} className="chip" data-active={deckSeries === n}>{n}</button>
                  ))}</div>
                </div>
              )}
            </section>

            {/* 4. Platforms */}
            <section className="rise" style={{ animationDelay: '.1s' }}>
              <h3 className="text-[17px] font-bold text-ink mb-3">Streaming platforms</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{OTT_PLATFORMS.map(p => { const sel = platforms.includes(p.name); return (
                <button key={p.name} onClick={() => setPlatforms(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])}
                  className="rounded-2xl py-3.5 px-2 flex flex-col items-center gap-1 transition-all border"
                  style={{ background: sel ? p.bg : 'var(--bg-elevated)', borderColor: sel ? 'transparent' : 'var(--border)', transform: sel ? 'scale(1.02)' : 'none', boxShadow: sel ? `0 6px 22px ${p.color}44` : 'none' }}>
                  <span className={`text-[11px] font-bold text-center leading-tight ${sel ? 'text-white' : 'text-ink-2'}`}>{p.name}</span>
                  {sel && <IconCheck size={14} />}
                </button>
              ); })}</div>
            </section>

            {/* 4. Genre */}
            <section className="rise" style={{ animationDelay: '.15s' }}>
              <h3 className="text-[15px] font-bold text-ink-2 mb-2.5">Genre filter</h3>
              <div className="flex gap-2 flex-wrap">{GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)} className="chip" data-active={genre === g}>{g}</button>
              ))}</div>
            </section>

            {/* 5. Load + preview */}
            <section className="rise" style={{ animationDelay: '.2s' }}>
              <button onClick={loadContent} disabled={contentLoading || platforms.length === 0} className="btn btn-secondary btn-block btn-lg">
                {contentLoading ? <><span className="spinner !w-5 !h-5 !border-2" />Loading from TMDB…</> : <><IconSparkles size={18} />Load {contentType === 'movies' ? 'movies' : contentType === 'series' ? 'web series' : 'movies & series'}</>}
              </button>

              {contentLoaded && content.length > 0 && (
                <div className="mt-4 card p-4 rise">
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <span className="badge badge-success"><IconCheck size={11} />{content.length} titles ready</span>
                    {movieCount > 0 && <span className="badge badge-movie"><IconFilm size={11} />{movieCount} Movie{movieCount !== 1 ? 's' : ''}</span>}
                    {seriesCount > 0 && <span className="badge badge-series"><IconTv size={11} />{seriesCount} Series</span>}
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollSnapType: 'x mandatory' }}>
                    {content.slice(0, 12).map(c => (
                      <div key={c.id} className="shrink-0 w-[76px]" style={{ scrollSnapAlign: 'start' }}>
                        <div className="relative">
                          <img src={c.poster} alt="" className="w-[76px] h-[110px] rounded-lg object-cover border border-hair" />
                          <span className={`badge absolute top-1 left-1 !h-auto !px-1 !py-0.5 ${c.type === 'series' ? 'badge-series' : 'badge-movie'}`}>{c.type === 'series' ? <IconTv size={9} /> : <IconFilm size={9} />}</span>
                        </div>
                        <p className="text-ink-3 text-[9px] mt-1 truncate font-medium">{c.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Sticky start bar */}
      <div className="sticky bottom-0 z-20 pt-2">
        <div className="max-w-content mx-auto px-5 pb-5">
          <div className="glass p-3 rounded-2xl">
            <button onClick={startSwiping} disabled={!canStart} className="btn btn-primary btn-block btn-lg">
              <IconPlay size={18} />{contentType === 'movies' ? `Start swiping · ${movieCount} movies` : contentType === 'series' ? `Start swiping · ${seriesCount} series` : `Start swiping · ${content.length} titles`}
            </button>
            {!canStart && <p className="text-ink-3 text-[11px] text-center mt-2">{platforms.length === 0 ? 'Select at least one platform' : players.length < 2 ? 'Add at least 2 players' : !contentLoaded ? 'Load content first' : ''}</p>}
          </div>
        </div>
      </div>
    </div>
    <Toast msg={toast.msg} visible={toast.v} />
  </>);

  // ── SWIPING ──
  if (screen === 'swiping') return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center px-4 py-4 max-w-[460px] mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-2 fade">
        <div className="flex items-center gap-2.5">
          {myPlayer && <>
            <Avatar p={myPlayer} size={38} />
            <div><div className="text-ink text-sm font-semibold">{myPlayer.name}</div><div className="text-ink-3 text-[11px]">{content.length - movieIdx} left</div></div>
          </>}
        </div>
        <div className="flex items-center gap-1.5">{players.map(p => (
          <div key={p.id} className="w-1.5 h-1.5 rounded-full" style={{ background: p.session_token === myToken ? 'var(--accent)' : 'var(--border-strong)' }} />
        ))}</div>
      </div>
      <div className="w-full h-[4px] rounded-full mb-4 overflow-hidden" style={{ background: 'var(--surface-2)' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--accent)' }} /></div>
      <div className="relative w-full flex justify-center" style={{ height: 'clamp(560px, 82vh, 660px)' }}>
        {content.slice(movieIdx, movieIdx + 2).reverse().map((item, i, arr) => (
          <SwipeCard key={`${item.id}`} item={item} isTop={i === arr.length - 1} onSwipe={handleSwipe} />
        ))}
        {movieIdx >= content.length && <div className="text-center mt-16 rise"><span className="app-badge mx-auto"><IconCheck size={40} /></span><h3 className="text-ink text-xl font-bold mt-4">All done!</h3></div>}
      </div>
    </div>
  </>);

  // ── DONE / WAITING FOR REVEAL ──
  if (screen === 'orgReveal') return (<><CinematicBG variant="charcoal" />
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 max-w-[380px] mx-auto text-center rise">
      {isHost ? (<>
        <div className="app-badge floaty mb-6"><IconSparkles size={42} /></div>
        <h2 className="text-[30px] font-bold text-white mb-2">All done!</h2>
        <p className="text-white/50 text-sm mb-6">You swiped {content.length} titles</p>
        <div className="flex justify-center gap-3 mb-8 flex-wrap">{players.map(p => (
          <div key={p.id} className="flex flex-col items-center gap-1.5"><Avatar p={p} size={44} ring="var(--success)" /><span className="text-white/50 text-[10px] font-semibold">{p.name.slice(0, 8)}</span></div>
        ))}</div>
        <button onClick={revealResults} disabled={revealLoading} className="btn btn-primary btn-lg btn-block" style={{ animation: revealLoading ? 'none' : 'pulsering 2s ease-in-out infinite' }}>{revealLoading ? 'Calculating…' : <><IconTrophy size={19} />Reveal results</>}</button>
      </>) : (<>
        <div className="app-badge floaty mb-6"><IconCheck size={42} /></div>
        <h2 className="text-[30px] font-bold text-white mb-2">You're done!</h2>
        <p className="text-white/50 text-sm mb-5">Waiting for the host to reveal results…</p>
        <div className="w-40 h-1.5 rounded-full mx-auto overflow-hidden" style={{ background: 'rgba(255,255,255,.14)' }}><div className="h-full w-1/3 rounded-full" style={{ background: 'var(--accent)', animation: 'indeterminate 1.4s ease-in-out infinite' }} /></div>
      </>)}
    </div>
  </>);

  // ═══════════════════════════════════════
  //  RESULTS
  // ═══════════════════════════════════════
  if (screen === 'results' && resultData) {
    const { matchIds, ranked, individual } = resultData;
    const rPlayers = resultData.players || players;
    const matchItems = content.filter(c => (matchIds || []).map(Number).includes(Number(c.id)));

    return (<><CinematicBG variant="content" />
      {showConf && <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">{COLORS.flatMap((c, ci) => Array.from({ length: 5 }, (_, i) => (
        <div key={`${ci}-${i}`} className="absolute" style={{ width: 6 + i * 2, height: 6 + i * 2, background: c, borderRadius: i % 2 ? '50%' : '2px', left: `${(ci * 8 + i * 15) % 100}%`, top: -20, animation: `confetti ${2 + i * 0.5}s ease-in forwards`, animationDelay: `${ci * 0.15 + i * 0.2}s`, opacity: 0.85 }} />
      )))}</div>}

      <div className="relative z-10 min-h-[100dvh] max-w-content mx-auto px-5 py-6 pb-16 rise">
        <div className="text-center mb-6">
          <span className="app-badge mx-auto mb-4"><IconTrophy size={40} /></span>
          <h2 className="wordmark text-[34px] text-ink">Results</h2>
          <p className="text-ink-3 text-[13px] mt-1">{rPlayers.length} players · {content.length} titles</p>
        </div>

        <div className="segmented max-w-[520px] mx-auto mb-7">
          {[{ id: 'matches', l: 'Matches', Ic: IconHeart }, { id: 'ranked', l: 'Top Picks', Ic: IconTrophy }, { id: 'individual', l: 'Everyone', Ic: IconUsers }].map(t => (
            <button key={t.id} data-active={resultTab === t.id} onClick={() => setResultTab(t.id)} className="flex items-center justify-center gap-1.5"><t.Ic size={14} />{t.l}</button>
          ))}
        </div>

        {/* MATCHES */}
        {resultTab === 'matches' && (<div className="max-w-[720px] mx-auto">
          {matchItems.length > 0 ? <>
            <p className="text-success text-[13px] font-semibold text-center mb-4 flex items-center justify-center gap-1.5"><IconHeart size={15} filled />{matchItems.length} perfect match{matchItems.length > 1 ? 'es' : ''}!</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {matchItems.map((m, i) => (
                <div key={m.id} className="card !p-0 overflow-hidden rise" style={{ borderColor: 'var(--success)', animationDelay: `${i * 0.06}s` }}>
                  <div className="flex gap-3.5 p-3.5 items-center">
                    <div className="relative shrink-0">
                      <img src={m.poster} alt="" className="w-16 h-24 rounded-xl object-cover" />
                      <span className={`badge absolute top-1 left-1 !h-auto !px-1 !py-0.5 ${m.type === 'series' ? 'badge-series' : 'badge-movie'}`}>{m.type === 'series' ? <IconTv size={9} /> : <IconFilm size={9} />}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-ink text-[15px] font-bold leading-tight">{m.title}</div>
                      <div className="text-ink-2 text-xs mt-0.5">{m.year} · ★ {m.rating}{m.duration ? ` · ${m.duration}` : ''}</div>
                      {m.type === 'series' && m.seasons > 0 && <div className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--series)' }}>{m.seasons}S · {m.episodes || '?'}Ep {m.status === 'Returning Series' ? '· Ongoing' : m.status === 'Ended' ? '· Ended' : ''}</div>}
                      <div className="flex gap-1 mt-1.5 flex-wrap">{(m.ott || []).map(o => <span key={o} className="ott" style={{ background: OTT_BG[o] || '#555' }}>{o}</span>)}</div>
                    </div>
                    <span className="badge badge-success !h-auto !py-2 !px-2.5 flex-col shrink-0"><IconHeart size={16} filled />ALL</span>
                  </div>
                </div>
              ))}
            </div>
          </> : <div className="card text-center py-12 px-6 max-w-[420px] mx-auto"><span className="tile tile-accent mx-auto mb-3 !w-12 !h-12"><IconHeart size={22} /></span><p className="text-ink text-[15px] font-medium">No perfect matches</p><p className="text-ink-3 text-[13px] mt-1.5">Check "Top Picks" for the crowd favorites.</p></div>}
        </div>)}

        {/* RANKED */}
        {resultTab === 'ranked' && (<div className="grid gap-2.5 sm:grid-cols-2 max-w-[760px] mx-auto">
          {(ranked || []).slice(0, 20).map((r, i) => {
            const item = content.find(c => c.id === Number(r.contentId)); if (!item) return null;
            const pct = (r.votes / rPlayers.length) * 100;
            return (<div key={r.contentId} className="card !p-3 flex items-center gap-2.5 rise" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="w-8 text-center shrink-0">{i < 3 ? <IconTrophy size={20} /> : <span className="text-[13px] font-bold text-ink-3">{i + 1}</span>}</div>
              <div className="relative shrink-0">
                <img src={item.poster} alt="" className="w-11 h-16 rounded-lg object-cover" />
                <span className={`badge absolute top-0.5 left-0.5 !h-auto !px-1 !py-0 ${item.type === 'series' ? 'badge-series' : 'badge-movie'}`}>{item.type === 'series' ? <IconTv size={8} /> : <IconFilm size={8} />}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-ink text-sm font-semibold truncate">{item.title}</div>
                <div className="text-ink-3 text-[11px] mt-0.5">★ {item.rating} · {item.year}{item.type === 'series' && item.seasons > 0 ? ` · ${item.seasons}S` : ''}{item.type === 'movie' && item.duration ? ` · ${item.duration}` : ''}</div>
                <div className="flex gap-1 mt-1.5">{(r.voterIds || []).map(vid => { const v = rPlayers.find(p => p.id === vid); return v ? <span key={vid} className="w-5 h-5 rounded-md grid place-items-center text-[9px]" style={{ background: `${v.color}33`, border: `1px solid ${v.color}55` }}>{v.avatar}</span> : null; })}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[15px] font-bold ${pct === 100 ? 'text-success' : pct >= 50 ? 'text-accent' : 'text-ink-3'}`}>{r.votes}/{rPlayers.length}</div>
                <div className="w-12 h-1.5 rounded mt-1 overflow-hidden" style={{ background: 'var(--surface-2)' }}><div className="h-full rounded" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }} /></div>
              </div>
            </div>);
          })}
        </div>)}

        {/* INDIVIDUAL */}
        {resultTab === 'individual' && (<div className="max-w-[820px] mx-auto">
          {rPlayers.map((p, pi) => {
            const likes = ((individual || {})[p.id] || []).map(l => content.find(c => c.id === Number(l.id))).filter(Boolean);
            return (<div key={p.id} className="mb-6 rise" style={{ animationDelay: `${pi * 0.08}s` }}>
              <div className="flex items-center gap-2.5 mb-3"><Avatar p={p} size={34} /><span className="text-ink text-[15px] font-semibold">{p.name}</span><span className="text-ink-3 text-xs">liked {likes.length}</span></div>
              {likes.length > 0
                ? <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>{likes.map(m => (
                    <div key={m.id} className="shrink-0" style={{ width: 104, scrollSnapAlign: 'start' }}>
                      <div className="relative">
                        <img src={m.poster} alt="" className="w-[104px] h-[152px] rounded-xl object-cover border border-hair" />
                        <span className={`badge absolute top-1 left-1 !h-auto !px-1 !py-0.5 ${m.type === 'series' ? 'badge-series' : 'badge-movie'}`}>{m.type === 'series' ? <IconTv size={9} /> : <IconFilm size={9} />}</span>
                      </div>
                      <div className="text-ink-2 text-[11px] font-semibold mt-1.5 truncate w-[104px]">{m.title}</div>
                      <div className="text-ink-3 text-[10px]">★ {m.rating}{m.type === 'series' && m.seasons > 0 ? ` · ${m.seasons}S` : ''}</div>
                    </div>
                  ))}</div>
                : <p className="text-ink-3 text-xs italic pl-1">Didn't like anything</p>}
            </div>);
          })}
        </div>)}

        <div className="flex gap-2.5 mt-8 max-w-[420px] mx-auto">
          <button onClick={() => router.push('/')} className="btn btn-secondary flex-1">New room</button>
          <button onClick={() => window.location.reload()} className="btn btn-primary flex-1">Play again</button>
        </div>
      </div>
      <Toast msg={toast.msg} visible={toast.v} />
    </>);
  }

  // ── RESULTS FAILED TO LOAD (no more dead-end spinner) ──
  if (screen === 'results' && !resultData) return (<><CinematicBG variant="content" />
    <div className="relative z-10 min-h-[100dvh] grid place-items-center px-5">
      <div className="card p-8 max-w-[380px] w-full text-center rise">
        <span className="tile tile-accent mx-auto mb-4 !w-12 !h-12"><IconTrophy size={22} /></span>
        <h2 className="text-ink text-[19px] font-bold mb-1.5">Couldn't load results</h2>
        <p className="text-ink-3 text-[13.5px] mb-5">The connection hiccuped. Give it another go.</p>
        <button onClick={async () => { const d = await fetchResults(); if (!d) show('Still unreachable — try again'); }} className="btn btn-primary btn-block">Retry</button>
      </div>
    </div>
  </>);

  return (<><CinematicBG variant="content" /><div className="relative z-10"><BrandLoader label="Loading FlickPick…" /></div></>);
}
