'use client';
// Trending movies & series strip — loading / error / empty / ready states.
// Each card shows WHERE TO WATCH as a compact icon (brand-coloured mark, no
// text), or an "In Theaters" ticket icon, falling back to the media type.
// Icons are inline (no extra network) and posters use small images, so the
// strip loads fast. Fixed card dimensions ⇒ zero layout shift.
import { useState } from 'react';
import Image from 'next/image';
import { IconFilm, IconTv, IconStar, IconTicket } from '@/components/Icons';
import { ottBg } from '@/lib/constants';

// Signature glyph per platform — colour does most of the recognition work.
const GLYPH = {
  Netflix: 'N', 'Prime Video': '▶', 'Disney+': '+', 'Apple TV+': '▶',
  'Apple TV': '▶', Max: 'M', Hulu: 'h', Hotstar: '★', 'Paramount+': '▲',
  Peacock: '●', JioCinema: '▶', ZEE5: 'Z', SonyLIV: 'S',
};
const glyphFor = name => GLYPH[name] || '▶';

// One provider mark — the real platform logo, falling back to a coloured
// glyph square if there's no logo (or it fails to load).
function ProviderMark({ name, logo }) {
  const [broken, setBroken] = useState(false);
  if (logo && !broken) {
    return (
      <img src={logo} alt={name} title={name} loading="lazy" decoding="async"
        onError={() => setBroken(true)}
        className="w-5 h-5 rounded-[6px] object-cover shadow ring-1 ring-black/20" />
    );
  }
  return (
    <span role="img" aria-label={name}
      className="w-5 h-5 rounded-[6px] grid place-items-center text-white text-[11px] font-black leading-none shadow"
      style={{ background: ottBg(name) }}>
      {glyphFor(name)}
    </span>
  );
}

function ProviderTag({ item }) {
  const providers = item.providers || [];
  const logos = item.providerLogos || [];
  if (providers.length) {
    return (
      <div className="absolute top-1.5 left-1.5 flex gap-1" title={`Where to watch: ${providers.join(', ')}`}>
        {providers.slice(0, 2).map((p, i) => <ProviderMark key={p} name={p} logo={logos[i]} />)}
        {providers.length > 2 && (
          <span aria-hidden="true" className="w-5 h-5 rounded-[6px] grid place-items-center text-white text-[9px] font-bold bg-black/55">
            +{providers.length - 2}
          </span>
        )}
      </div>
    );
  }
  if (item.inTheaters) {
    return (
      <span role="img" aria-label="In theaters"
        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-[6px] grid place-items-center text-white shadow"
        style={{ background: 'linear-gradient(135deg,#ff9f0a,#ff375f)' }}>
        <IconTicket size={12} />
      </span>
    );
  }
  return (
    <span className={`badge absolute top-1.5 left-1.5 ${item.type === 'series' ? 'badge-series' : 'badge-movie'}`}
      role="img" aria-label={item.type === 'series' ? 'Series' : 'Movie'}>
      {item.type === 'series' ? <IconTv size={10} /> : <IconFilm size={10} />}
    </span>
  );
}

function Card({ children }) {
  return <div className="shrink-0 w-[124px] sm:w-[142px]" style={{ scrollSnapAlign: 'start' }}>{children}</div>;
}

export default function TrendingStrip({ state, items, onRetry }) {
  return (
    <section aria-label="Trending this week" className="relative z-10 max-w-content mx-auto px-6 pb-16 sm:pb-24 w-full">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-white text-[22px] sm:text-[26px] font-bold tracking-tight">Trending this week</h2>
          <p className="text-white/45 text-[13px] mt-0.5">Where to watch what everyone's picking</p>
        </div>
      </div>

      {state === 'loading' && (
        <div data-testid="trending-skeleton" className="flex gap-3 overflow-hidden" aria-label="Loading trending titles">
          {Array.from({ length: 8 }, (_, i) => (
            <Card key={i}>
              <div className="skeleton w-full aspect-[2/3] !rounded-xl" />
              <div className="skeleton h-3 w-4/5 mt-2 !rounded" />
            </Card>
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="glass-dark p-6 text-center" role="alert">
          <p className="text-white/80 text-[15px] font-medium">Couldn't load trending titles</p>
          <p className="text-white/45 text-[13px] mt-1">Check your connection and try again.</p>
          <button onClick={onRetry} className="btn btn-secondary btn-sm mt-4 !w-auto mx-auto">Retry</button>
        </div>
      )}

      {state === 'empty' && (
        <div className="glass-dark p-6 text-center">
          <p className="text-white/80 text-[15px] font-medium">Trending list is warming up</p>
          <p className="text-white/45 text-[13px] mt-1">New titles land here every week — check back soon.</p>
        </div>
      )}

      {state === 'ready' && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6" style={{ scrollSnapType: 'x mandatory' }}>
          {items.map((it, i) => (
            <Card key={`${it.type}-${it.id}`}>
              <div className="trend-card relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-[#17171d]">
                <Image
                  src={it.poster}
                  alt={`${it.title} poster`}
                  fill
                  sizes="(max-width: 640px) 124px, 142px"
                  // First on-screen cards load immediately at high priority;
                  // the rest lazy-load as the strip scrolls.
                  priority={i < 5}
                  loading={i < 5 ? 'eager' : 'lazy'}
                  className="object-cover"
                  onError={e => { e.currentTarget.style.opacity = '0.25'; }}
                />
                <ProviderTag item={it} />
              </div>
              <p className="text-white/80 text-[12px] font-semibold mt-2 truncate">{it.title}</p>
              <p className="text-white/40 text-[11px] flex items-center gap-1">
                {it.year || ''}
                {it.rating ? <> · <IconStar size={10} /> {it.rating}<span className="text-white/25">/10</span></> : null}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
