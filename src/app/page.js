'use client';
// Marketing landing (industry-standard split): this page sells the product;
// "Get started" launches the actual app at /app. Signed-in visitors go
// straight to their dashboard.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';
import PosterWall from '@/components/PosterWall';
import Modal from '@/components/Modal';
import TrendingStrip from '@/components/TrendingStrip';
import BrandOrbit from '@/components/BrandOrbit';
import { getTrending } from '@/lib/trending';
import { IconBrand, BrandLogo, IconHeart, IconUsers, IconTrophy, IconArrowRight, IconGoogle } from '@/components/Icons';

const FEATURES = [
  { Ic: IconUsers, glyph: '#4aa3ff', title: 'Host a room', desc: 'Create a room, share one link — friends join from any device in seconds.' },
  { Ic: IconHeart, glyph: '#ff8fbf', title: 'Swipe together', desc: 'Everyone swipes the same deck of trending movies and series.' },
  { Ic: IconTrophy, glyph: '#ffd66b', title: 'Match instantly', desc: 'The moment everyone agrees, you have your pick. No more debates.' },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [previewDash, setPreviewDash] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [trend, setTrend] = useState({ state: 'loading', items: [], posters: [] });
  const [platforms, setPlatforms] = useState([]);

  const loadTrending = async (force = false) => {
    setTrend(t => ({ ...t, state: 'loading' }));
    try {
      const d = await getTrending(force);
      setTrend({ state: d.items.length ? 'ready' : 'empty', items: d.items, posters: d.posters });
    } catch {
      setTrend(t => ({ ...t, state: 'error' }));
    }
  };

  useEffect(() => {
    setPreviewDash(new URLSearchParams(window.location.search).get('view') === 'dashboard');
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        setProfile(p);
      }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setUser(s?.user || null);
      if (s?.user) supabase.from('profiles').select('*').eq('id', s.user.id).single().then(({ data }) => setProfile(data));
    });
    // Trending titles + poster backdrop (single fetch, session-cached)
    loadTrending();
    // Real streaming-platform logos for the "watch on" row (daily-cached)
    fetch('/api/providers').then(r => r.json()).then(d => setPlatforms(d.providers || [])).catch(() => {});
    return () => subscription.unsubscribe();
  }, []);

  // Get started opens an explicit choice — never auto-routes into guest mode
  const openStart = () => setStartOpen(true);
  const continueAsGuest = () => {
    localStorage.setItem('fp_guest', '1');
    router.push('/app');
  };
  const scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

  // Signed-in → straight to the working app
  if (user || previewDash) return <Dashboard profile={profile} userId={user?.id} />;

  // Signed-out → marketing landing
  return (
    <div className="landing">
      {/* Movie frames behind the hero, revealed as the cluster forms */}
      <div className="landing-cinema">
        <PosterWall posters={trend.posters} />
        <div className="landing-scrim" />
      </div>

      <header className="nav-land">
        <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBrand size={24} />
            <span className="text-[17px] font-semibold text-white tracking-tight">FlickPick</span>
          </div>
          <button onClick={() => router.push('/login')} className="text-white/70 hover:text-white text-[14px] font-medium transition px-2 py-2">Sign in</button>
        </div>
      </header>

      {/* ── Hero: logo first, then the cluster pops in ── */}
      <section className="relative z-10 min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-6 text-center">
        <BrandOrbit />

        <h1 className="hero-title mt-9 rise" style={{ animationDelay: '.38s' }}>FlickPick</h1>
        <button onClick={openStart} className="pill-white mt-7 rise" style={{ animationDelay: '.55s' }}>Get started</button>
        <p className="hero-sub mt-9 max-w-[660px] rise" style={{ animationDelay: '.72s' }}>Watch together. Pick together.</p>

        <button onClick={scrollToFeatures} aria-label="Scroll down" className="mt-14 text-white/30 hover:text-white/60 transition fade" style={{ animationDelay: '3.2s' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5 5 5-5" /></svg>
        </button>
      </section>

      {/* ── How it works ── */}
      <section id="features" className="relative z-10 max-w-content mx-auto px-6 py-16 sm:py-24">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5"><BrandLogo height={72} /></div>
          <h2 className="text-white text-[30px] sm:text-[40px] font-bold tracking-tight">Movie night, decided.</h2>
          <p className="text-white/50 text-[15px] sm:text-[17px] mt-2">One room, 2–12 friends, one perfect match.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 max-w-[900px] mx-auto">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-dark p-6 text-center">
              <span className="app-tile mx-auto mb-4" style={{ '--glyph': f.glyph, '--ts': '56px' }}><f.Ic size={26} /></span>
              <h3 className="text-white text-[17px] font-semibold">{f.title}</h3>
              <p className="text-white/50 text-[13.5px] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-[12px] mt-10 text-center">Movies & series · 2–12 friends · No downloads</p>

        {/* ── Watch on the platforms you already have ── */}
        {platforms.length > 0 && (
          <div className="mt-14 text-center" aria-label="Supported streaming platforms">
            <p className="text-white/40 text-[13px] font-semibold tracking-wide uppercase mb-5">Find where to watch — across your platforms</p>
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap max-w-[760px] mx-auto">
              {platforms.map(p => (
                <img key={p.name} src={p.logo} alt={p.name} title={p.name} loading="lazy"
                  onError={e => { e.currentTarget.style.display = 'none'; }} // broken logo → drop, never a broken-image box
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-[12px] object-cover ring-1 ring-white/10 shadow-lg platform-logo" />
              ))}
              <span title="IMAX theatrical releases" aria-label="IMAX"
                className="h-11 sm:h-12 px-3 rounded-[12px] grid place-items-center ring-1 ring-white/10 shadow-lg platform-logo font-black italic tracking-tight text-white text-[15px]"
                style={{ background: '#0a3d91' }}>
                IMAX
              </span>
            </div>
            <p className="text-white/25 text-[11px] mt-5 max-w-[560px] mx-auto leading-relaxed">
              Streaming availability data and platform logos courtesy of <a href="https://www.justwatch.com" target="_blank" rel="noreferrer" className="underline hover:text-white/50">JustWatch</a>, via <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-white/50">TMDB</a>.
              All platform names and logos are trademarks of their respective owners; FlickPick is not affiliated with or endorsed by them.
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        )}
      </section>

      {/* ── Trending this week ── */}
      <TrendingStrip state={trend.state} items={trend.items} onRetry={() => loadTrending(true)} />

      {/* ── Get started: explicit choice, never auto-guest ── */}
      <Modal open={startOpen} onClose={() => setStartOpen(false)} label="Get started">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3"><IconBrand size={40} /></div>
          <h3 className="text-white text-[19px] font-semibold">How do you want to start?</h3>
          <p className="text-white/50 text-[13px] mt-1">Sign in to keep your history — or jump straight in.</p>
        </div>
        <button onClick={() => router.push('/login')} className="btn btn-primary btn-block btn-lg mb-2.5">
          <IconGoogle size={17} /> Sign in / Create account
        </button>
        <button onClick={continueAsGuest} className="btn btn-block btn-lg" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>
          Continue as guest <IconArrowRight size={17} />
        </button>
        <button onClick={() => setStartOpen(false)} className="btn btn-ghost btn-sm btn-block mt-2">Cancel</button>
      </Modal>
    </div>
  );
}
