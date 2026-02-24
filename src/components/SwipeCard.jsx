'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { OTT_BG } from '@/lib/constants';

export default function SwipeCard({ item, onSwipe, isTop }) {
  const ref = useRef(null);
  const startX = useRef(0), curX = useRef(0), isDrag = useRef(false);
  const [off, setOff] = useState(0);
  const [rot, setRot] = useState(0);
  const [opa, setOpa] = useState(1);
  const [dec, setDec] = useState(null);
  const [gone, setGone] = useState(false);
  const [imgOk, setImgOk] = useState(false);

  const hS = useCallback(x => { if (!isTop||gone) return; isDrag.current=true; startX.current=x; },[isTop,gone]);
  const hM = useCallback(x => {
    if (!isDrag.current||gone) return;
    const dx = x - startX.current; curX.current=dx;
    setOff(dx); setRot(dx*.07);
    setDec(dx>55?'like':dx<-55?'nope':null);
  },[gone]);
  const hE = useCallback(() => {
    if (!isDrag.current||gone) return; isDrag.current=false;
    if (Math.abs(curX.current)>90) {
      const d = curX.current>0?'right':'left'; setGone(true);
      setOff(d==='right'?700:-700); setRot(d==='right'?35:-35); setOpa(0);
      setTimeout(()=>onSwipe(d),280);
    } else { setOff(0); setRot(0); setDec(null); }
  },[onSwipe,gone]);

  const btnSwipe = useCallback(d => {
    if (gone) return; setGone(true); setDec(d==='right'?'like':'nope');
    setOff(d==='right'?700:-700); setRot(d==='right'?35:-35); setOpa(0);
    setTimeout(()=>onSwipe(d),280);
  },[onSwipe,gone]);

  useEffect(() => {
    if (!isTop) return; const el=ref.current; if(!el) return;
    const ts=e=>hS(e.touches[0].clientX);
    const tm=e=>{e.preventDefault();hM(e.touches[0].clientX);};
    const te=()=>hE();
    const ms=e=>hS(e.clientX), mm=e=>hM(e.clientX), mu=()=>hE();
    el.addEventListener('touchstart',ts,{passive:true});
    el.addEventListener('touchmove',tm,{passive:false});
    el.addEventListener('touchend',te);
    el.addEventListener('mousedown',ms);
    window.addEventListener('mousemove',mm);
    window.addEventListener('mouseup',mu);
    return()=>{el.removeEventListener('touchstart',ts);el.removeEventListener('touchmove',tm);el.removeEventListener('touchend',te);el.removeEventListener('mousedown',ms);window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};
  },[isTop,hS,hM,hE]);

  const lOp = Math.min(Math.max(off/80,0),1);
  const nOp = Math.min(Math.max(-off/80,0),1);
  const isSeries = item.type==='series';
  const isReturning = item.status==='Returning Series';

  return (
    <div className="absolute w-full flex flex-col items-center">
      <div ref={ref} className="overflow-hidden select-none" style={{
        width:'min(360px,90vw)',minHeight:490,
        background:'linear-gradient(170deg,rgba(22,22,35,.97),rgba(12,12,20,.99))',borderRadius:28,
        transform:`translateX(${off}px) rotate(${rot}deg) scale(${isTop?1:.94})`,
        transition:isDrag.current?'none':'all .4s cubic-bezier(.175,.885,.32,1.1)',
        opacity:isTop?opa:.4, cursor:isTop?'grab':'default',
        boxShadow:isTop?'0 25px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05)':'0 10px 30px rgba(0,0,0,.3)',
        zIndex:isTop?10:5,
        border: dec==='like'?'2px solid rgba(52,199,89,.5)':dec==='nope'?'2px solid rgba(255,69,58,.5)':'1px solid rgba(255,255,255,.06)',
      }}>
        {/* LIKE / NOPE stamps */}
        {isTop&&<>
          <div className="absolute top-6 left-5 z-20 border-[3px] border-green-500 rounded-lg px-4 py-1 text-green-500 text-3xl tracking-[4px]" style={{fontFamily:"'Bebas Neue'",transform:'rotate(-18deg)',opacity:lOp,fontWeight:900}}>LIKE</div>
          <div className="absolute top-6 right-5 z-20 border-[3px] border-red-500 rounded-lg px-4 py-1 text-red-500 text-3xl tracking-[4px]" style={{fontFamily:"'Bebas Neue'",transform:'rotate(18deg)',opacity:nOp,fontWeight:900}}>NOPE</div>
        </>}

        {/* ── Poster ── */}
        <div className="h-[260px] relative overflow-hidden bg-neutral-900">
          {!imgOk&&<div className="absolute inset-0 flex items-center justify-center"><div className="spinner"/></div>}
          <img src={item.poster} alt={item.title} onLoad={()=>setImgOk(true)} onError={()=>setImgOk(true)} draggable={false}
            className="w-full h-full object-cover transition-opacity duration-300" style={{opacity:imgOk?1:0}}/>
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(12,12,20,1) 0%,rgba(12,12,20,.2) 40%,transparent 65%)'}}/>

          {/* Type badge — top left */}
          <div className={`absolute top-3 left-3 z-10 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md ${isSeries?'type-badge-series':'type-badge-movie'}`}>
            {isSeries ? '📺 Series' : '🍿 Movie'}
          </div>

          {/* Rating — top right */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xl rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 border border-white/[.08]">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white text-sm font-bold">{item.rating}</span>
          </div>

          {/* OTT tags — bottom of poster */}
          <div className="absolute bottom-12 left-4 flex gap-1.5 flex-wrap z-10">
            {(item.ott||[]).slice(0,3).map(p=>(
              <span key={p} className="ott shadow-lg" style={{background:OTT_BG[p]||'#555'}}>{p}</span>
            ))}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="px-5 pb-5 pt-1">
          <h3 className="text-[20px] font-extrabold text-white leading-tight" style={{fontFamily:"'Playfair Display',serif"}}>{item.title}</h3>

          {/* ── Meta row — different for movies vs series ── */}
          <div className="flex gap-2 mt-1.5 items-center flex-wrap">
            <span className="text-white/40 text-[13px]">{item.year||''}</span>
            {item.duration && <>
              <span className="text-white/15">·</span>
              <span className="text-white/40 text-[13px]">{item.duration}</span>
            </>}

            {/* Series-specific metadata */}
            {isSeries && item.seasons > 0 && <>
              <span className="text-white/15">·</span>
              <span className="text-purple-400/80 text-[13px] font-semibold">{item.seasons}S{item.episodes > 0 ? ` · ${item.episodes} Ep` : ''}</span>
            </>}
          </div>

          {/* ── Series status badge ── */}
          {isSeries && item.status && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isReturning ? 'bg-green-500/15 text-green-400 border border-green-500/30' : item.status==='Ended' ? 'bg-red-400/10 text-red-400/70 border border-red-400/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
                {isReturning ? '● Ongoing' : item.status === 'Ended' ? '● Ended' : item.status}
              </span>
              {item.network && (
                <span className="text-white/25 text-[10px] font-semibold">{item.network}</span>
              )}
            </div>
          )}

          {/* ── Genres ── */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {(item.genre||[]).slice(0,3).map(g=>(
              <span key={g} className="bg-white/[.06] text-white/50 text-[11px] px-2.5 py-1 rounded-full font-semibold border border-white/[.06]">{g}</span>
            ))}
          </div>

          {/* ── Description ── */}
          <p className="text-white/35 text-[13px] leading-relaxed mt-2 line-clamp-3">{item.desc}</p>
        </div>
      </div>

      {/* ── Buttons ── */}
      {isTop&&<div className="flex gap-6 mt-4 justify-center" style={{animation:'slideUp .5s ease'}}>
        <button onClick={()=>btnSwipe('left')} className="w-[62px] h-[62px] rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-500 text-[28px] flex items-center justify-center cursor-pointer transition-all hover:bg-red-500/25 hover:scale-110">✕</button>
        <button onClick={()=>btnSwipe('right')} className="w-[62px] h-[62px] rounded-full bg-green-500/10 border-2 border-green-500/30 text-green-500 text-[28px] flex items-center justify-center cursor-pointer transition-all hover:bg-green-500/25 hover:scale-110">♥</button>
      </div>}
    </div>
  );
}
