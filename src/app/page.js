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
import { getTrending } from '@/lib/trending';
import { IconBrand, BrandLogo, IconFilm, IconTv, IconTicket, IconPlay, IconStar, IconHeart, IconSparkles, IconUsers, IconTrophy, IconArrowRight, IconGoogle } from '@/components/Icons';

// iCloud-style cluster: dark circular badges with colored glyphs, hugging the
// center circle — some slightly overlapping its ring (z above/below center).
// a = angle from 12 o'clock cw · rf = ring distance · sf = badge size (× width)
// Delays start ~1.95s — AFTER the standalone-logo moment (see centerSeq).
const SATS = [
  { a: '-48deg',  rf: 0.29, sf: 0.215, z: 3, d: 1.95, fdur: 5.6, glyph: '#ff6a75', Ic: IconFilm },
  { a: '112deg',  rf: 0.28, sf: 0.19,  z: 4, d: 2.06, fdur: 6.2, glyph: '#ffd66b', Ic: IconStar, filled: true },
  { a: '-118deg', rf: 0.26, sf: 0.2,   z: 4, d: 2.17, fdur: 5.1, glyph: '#ff8fbf', Ic: IconHeart, filled: true },
  { a: '12deg',   rf: 0.31, sf: 0.145, z: 2, d: 2.28, fdur: 4.7, glyph: '#5de0e6', Ic: IconSparkles },
  { a: '58deg',   rf: 0.27, sf: 0.155, z: 2, d: 2.39, fdur: 5.9, glyph: '#4aa3ff', Ic: IconTv },
  { a: '-84deg',  rf: 0.33, sf: 0.125, z: 2, d: 2.5,  fdur: 4.4, glyph: '#4be08b', Ic: IconPlay, filled: true },
  { a: '171deg',  rf: 0.25, sf: 0.165, z: 6, d: 2.61, fdur: 5.3, glyph: '#c98bff', Ic: IconTicket },
];

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
        <div className="hero-cluster">
          {SATS.map((s, i) => (
            <div
              key={i}
              className="sat"
              style={{ '--a': s.a, '--rf': s.rf, '--ts': `calc(var(--w) * ${s.sf})`, '--z': s.z, '--d': `${s.d}s`, '--fdur': `${s.fdur}s`, '--fd': `${s.d + 0.64}s` }}
            >
              <div className="sat-pop">
                <div className="sat-float">
                  <div className="app-tile" style={{ '--glyph': s.glyph }}><s.Ic filled={s.filled} /></div>
                </div>
              </div>
            </div>
          ))}
          <div className="hero-center"><IconPlay filled /></div>
        </div>

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
