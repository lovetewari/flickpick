'use client';
export default function Toast({msg,visible}){return(
<div className="fixed bottom-8 left-1/2 z-[300] pointer-events-none whitespace-nowrap"
  style={{transform:`translateX(-50%) translateY(${visible?0:80}px)`,background:'rgba(255,255,255,.12)',
  backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.15)',borderRadius:16,
  padding:'12px 24px',fontSize:14,fontWeight:600,
  transition:'transform .4s cubic-bezier(.175,.885,.32,1.1)',boxShadow:'0 10px 40px rgba(0,0,0,.4)'}}>
  {msg}
</div>);}
