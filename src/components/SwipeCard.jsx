'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { OTT_BG } from '@/lib/constants';
import { IconFilm, IconTv, IconHeart, IconClose } from '@/components/Icons';

export default function SwipeCard({ item, onSwipe, isTop }) {
  const ref = useRef(null);
  const startX = useRef(0), curX = useRef(0), isDrag = useRef(false);
  const [off, setOff] = useState(0);
  const [rot, setRot] = useState(0);
  const [opa, setOpa] = useState(1);
  const [dec, setDec] = useState(null);          // 'like' | 'nope' | null
  const [gone, setGone] = useState(false);
  const [imgOk, setImgOk] = useState(false);

  const onStart = useCallback(x => { if (!isTop || gone) return; isDrag.current = true; startX.current = x; }, [isTop, gone]);
  const onMove = useCallback(x => {
    if (!isDrag.current || gone) return;
    const dx = x - startX.current; curX.current = dx;
    setOff(dx); setRot(dx * 0.06);
    setDec(dx > 55 ? 'like' : dx < -55 ? 'nope' : null);
  }, [gone]);
  const onEnd = useCallback(() => {
    if (!isDrag.current || gone) return; isDrag.current = false;
    if (Math.abs(curX.current) > 90) {
      const d = curX.current > 0 ? 'right' : 'left'; setGone(true);
      setOff(d === 'right' ? 760 : -760); setRot(d === 'right' ? 32 : -32); setOpa(0);
      setTimeout(() => onSwipe(d), 180);
    } else { setOff(0); setRot(0); setDec(null); }
  }, [onSwipe, gone]);

  const btnSwipe = useCallback(d => {
    if (gone) return; setGone(true); setDec(d === 'right' ? 'like' : 'nope');
    setOff(d === 'right' ? 760 : -760); setRot(d === 'right' ? 32 : -32); setOpa(0);
    setTimeout(() => onSwipe(d), 180);
  }, [onSwipe, gone]);

  useEffect(() => {
    if (!isTop) return; const el = ref.current; if (!el) return;
    const ts = e => onStart(e.touches[0].clientX);
    const tm = e => { e.preventDefault(); onMove(e.touches[0].clientX); };
    const te = () => onEnd();
    const ms = e => onStart(e.clientX), mm = e => onMove(e.clientX), mu = () => onEnd();
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    el.addEventListener('mousedown', ms);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); el.removeEventListener('mousedown', ms); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, [isTop, onStart, onMove, onEnd]);

  const lOp = Math.min(Math.max(off / 80, 0), 1);
  const nOp = Math.min(Math.max(-off / 80, 0), 1);
  const isSeries = item.type === 'series';
  const isReturning = item.status === 'Returning Series';

  return (
    <div className="absolute w-full flex flex-col items-center">
      <div ref={ref} className="overflow-hidden select-none" style={{
        width: 'min(380px, 92vw)',
        background: 'var(--bg-elevated)',
        borderRadius: 26,
        transform: `translateX(${off}px) rotate(${rot}deg) scale(${isTop ? 1 : 0.94})`,
        transition: isDrag.current ? 'none' : 'transform .3s cubic-bezier(.2,.8,.2,1), opacity .3s ease',
        opacity: isTop ? opa : 0.5,
        cursor: isTop ? 'grab' : 'default',
        boxShadow: isTop ? 'var(--shadow-pop)' : 'var(--shadow-card)',
        border: dec === 'like' ? '2px solid var(--success)' : dec === 'nope' ? '2px solid var(--danger)' : '1px solid var(--border)',
        zIndex: isTop ? 10 : 5,
      }}>
        {/* LIKE / NOPE stamps */}
        {isTop && <>
          <div className="absolute top-6 left-5 z-20 border-[3px] rounded-xl px-4 py-1 text-3xl wordmark" style={{ borderColor: 'var(--success)', color: 'var(--success)', transform: 'rotate(-16deg)', opacity: lOp }}>LIKE</div>
          <div className="absolute top-6 right-5 z-20 border-[3px] rounded-xl px-4 py-1 text-3xl wordmark" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', transform: 'rotate(16deg)', opacity: nOp }}>NOPE</div>
        </>}

        {/* Poster */}
        <div className="relative overflow-hidden" style={{ height: 'clamp(300px, 44vh, 372px)', background: 'var(--surface-2)' }}>
          {!imgOk && <div className="absolute inset-0 grid place-items-center"><div className="spinner" /></div>}
          <img src={item.poster} alt={item.title} onLoad={() => setImgOk(true)} onError={() => setImgOk(true)} draggable={false}
            className="w-full h-full object-cover transition-opacity duration-300" style={{ opacity: imgOk ? 1 : 0 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-elevated) 2%, transparent 42%)' }} />

          <div className={`badge absolute top-3 left-3 z-10 !h-[24px] backdrop-blur-md ${isSeries ? 'badge-series' : 'badge-movie'}`}>
            {isSeries ? <><IconTv size={12} /> Series</> : <><IconFilm size={12} /> Movie</>}
          </div>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(10px)' }}>
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white text-sm font-bold">{item.rating}</span>
          </div>
          <div className="absolute bottom-3 left-4 z-10 flex gap-1.5 flex-wrap">
            {(item.ott || []).slice(0, 3).map(p => (
              <span key={p} className="ott shadow-lg" style={{ background: OTT_BG[p] || '#555' }}>{p}</span>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pb-5 pt-1">
          <h3 className="text-[20px] font-bold text-ink leading-tight">{item.title}</h3>

          <div className="flex gap-2 mt-1.5 items-center flex-wrap text-[13px] text-ink-2">
            {item.year ? <span>{item.year}</span> : null}
            {item.duration && <><span className="text-ink-3">·</span><span>{item.duration}</span></>}
            {isSeries && item.seasons > 0 && <><span className="text-ink-3">·</span>
              <span className="font-semibold" style={{ color: 'var(--series)' }}>{item.seasons}S{item.episodes > 0 ? ` · ${item.episodes} Ep` : ''}</span></>}
          </div>

          {isSeries && item.status && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${isReturning ? 'badge-success' : ''}`} style={!isReturning ? { background: 'var(--surface-2)', color: 'var(--text-secondary)' } : undefined}>
                {isReturning ? '● Ongoing' : item.status === 'Ended' ? '● Ended' : item.status}
              </span>
              {item.network && <span className="text-ink-3 text-[11px] font-semibold">{item.network}</span>}
            </div>
          )}

          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {(item.genre || []).slice(0, 3).map(g => (
              <span key={g} className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{g}</span>
            ))}
          </div>

          <p className="text-ink-3 text-[13px] leading-relaxed mt-2.5 line-clamp-3">{item.desc}</p>
        </div>
      </div>

      {/* Buttons */}
      {isTop && <div className="flex gap-6 mt-5 justify-center" style={{ animation: 'rise .5s ease' }}>
        <button aria-label="Pass" onClick={() => btnSwipe('left')} className="w-16 h-16 rounded-full grid place-items-center transition-transform hover:scale-110 active:scale-95" style={{ background: 'var(--danger-soft)', border: '1.5px solid var(--danger)', color: 'var(--danger)' }}><IconClose size={26} /></button>
        <button aria-label="Like" onClick={() => btnSwipe('right')} className="w-16 h-16 rounded-full grid place-items-center transition-transform hover:scale-110 active:scale-95" style={{ background: 'var(--success-soft)', border: '1.5px solid var(--success)', color: 'var(--success)' }}><IconHeart size={26} filled /></button>
      </div>}
    </div>
  );
}
