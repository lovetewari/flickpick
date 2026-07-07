'use client';
// Trending movies & series strip — loading / error / empty / ready states.
// Each card shows WHERE TO WATCH as a compact icon (brand-coloured mark, no
// text), or an "In Theaters" ticket icon, falling back to the media type.
// Icons are inline (no extra network) and posters use small images, so the
// strip loads fast. Fixed card dimensions ⇒ zero layout shift.
import { useState } from 'react';
import Image from 'next/image';
import Modal from '@/components/Modal';
import { IconArrowRight, IconClose, IconFilm, IconStar, IconTicket, IconTv } from '@/components/Icons';
import { ottBg } from '@/lib/constants';

// Signature glyph per platform — colour does most of the recognition work.
const GLYPH = {
  Netflix: 'N', 'Prime Video': 'PV', 'Disney+': 'D+', 'Apple TV+': 'tv+',
  'Apple TV': 'tv+', Max: 'M', Hulu: 'h', Hotstar: 'HS', 'Paramount+': 'P+',
  Peacock: 'P', JioCinema: 'Jio', ZEE5: 'Z5', SonyLIV: 'SL',
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
        className="provider-mark-img" />
    );
  }
  return (
    <span role="img" aria-label={name}
      className="provider-mark-fallback"
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
      <div className="provider-stack" title={`Where to watch: ${providers.join(', ')}`}>
        {providers.slice(0, 2).map((p, i) => <ProviderMark key={p} name={p} logo={logos[i]} />)}
        {providers.length > 2 && (
          <span aria-hidden="true" className="provider-more">
            +{providers.length - 2}
          </span>
        )}
      </div>
    );
  }
  if (item.inTheaters) {
    return (
      <span role="img" aria-label="In theaters"
        className="provider-stack provider-single"
        style={{ background: 'linear-gradient(135deg,#ff9f0a,#ff375f)' }}>
        <IconTicket size={12} />
      </span>
    );
  }
  return (
    <span className={`badge provider-stack provider-single ${item.type === 'series' ? 'badge-series' : 'badge-movie'}`}
      role="img" aria-label={item.type === 'series' ? 'Series' : 'Movie'}>
      {item.type === 'series' ? <IconTv size={10} /> : <IconFilm size={10} />}
    </span>
  );
}

function Card({ children }) {
  return <div className="trend-card-shell">{children}</div>;
}

function AvailabilityText({ item }) {
  const providers = item.providers || [];
  if (providers.length) return <>Available on <strong>{providers.join(', ')}</strong></>;
  if (item.inTheaters) return <>Currently marked as <strong>in theaters</strong></>;
  return <>Provider availability is not confirmed yet.</>;
}

export default function TrendingStrip({ state, items, onRetry }) {
  const [selected, setSelected] = useState(null);
  const selectedRank = selected ? selected.rank || items.findIndex(i => i.id === selected.id && i.type === selected.type) + 1 : null;

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
        <div className="trending-rail -mx-6 px-6">
          <div className="trending-track">
          {items.map((it, i) => (
            <Card key={`${it.type}-${it.id}`}>
              <button
                type="button"
                className="trend-card relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-[#17171d] text-left"
                aria-label={`Open options for ${it.title}`}
                onClick={() => setSelected(it)}
                style={{ '--rank-index': i }}
              >
                <span
                  className={`rank-num ${i < 3 ? 'rank-num-top' : ''} ${(it.rank || i + 1) > 9 ? 'rank-num-2d' : ''}`}
                  aria-label={`Rank ${it.rank || i + 1}`}
                >
                  {it.rank || i + 1}
                </span>
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
              </button>
              <p className="text-white/80 text-[12px] font-semibold mt-2 truncate">{it.title}</p>
              <p className="text-white/40 text-[11px] flex items-center gap-1">
                {it.year || ''}
                {it.rating ? <> · <IconStar size={10} /> <span>{it.rating}<span className="text-white/25">/10</span></span></> : null}
              </p>
            </Card>
          ))}
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        label={selected ? `Open ${selected.title}` : 'Title options'}
        className="trend-modal-panel"
      >
        {selected && (
          <div>
            <div className="trend-modal-head">
              <div>
                <p className="trend-modal-kicker">Trending #{selectedRank}</p>
                <h3 className="trend-modal-title">{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close title options" className="trend-modal-close">
                <IconClose size={18} />
              </button>
            </div>

            <div className="trend-modal-body">
              <div className="trend-modal-poster">
                <img src={selected.poster} alt={`${selected.title} poster`} />
              </div>
              <div className="trend-modal-copy">
                <p className="trend-modal-meta">
                  {selected.year || 'Unknown year'} · {selected.type === 'series' ? 'Series' : 'Movie'}
                  {selected.rating ? ` · ${selected.rating}/10` : ''}
                </p>
                <p className="trend-modal-availability"><AvailabilityText item={selected} /></p>
              </div>
            </div>

            <div className="trend-modal-actions">
              <button type="button" onClick={() => setSelected(null)} className="btn btn-ghost btn-block">
                Stay here
              </button>
              {selected.detailsUrl ? (
                <a href={selected.detailsUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-block">
                  Open title <IconArrowRight size={17} />
                </a>
              ) : (
                <button type="button" className="btn btn-primary btn-block" disabled>
                  Title link unavailable
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
