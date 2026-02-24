'use client';
const S=[{w:2.1,l:12,t:8,o:.2,d:4.2,dl:.3},{w:3,l:28,t:15,o:.15,d:5.1,dl:1.2},{w:1.8,l:45,t:5,o:.28,d:3.5,dl:.8},{w:2.5,l:67,t:22,o:.12,d:6,dl:2.1},{w:1.5,l:85,t:10,o:.25,d:4.8,dl:.5},{w:2.8,l:5,t:35,o:.18,d:5.5,dl:1.7},{w:2,l:33,t:42,o:.22,d:3.8,dl:3},{w:3.2,l:55,t:38,o:.1,d:7,dl:.9},{w:1.7,l:78,t:45,o:.3,d:4,dl:2.5},{w:2.3,l:92,t:30,o:.16,d:5.8,dl:1},{w:2.6,l:18,t:55,o:.2,d:4.5,dl:3.5},{w:1.9,l:40,t:62,o:.25,d:3.2,dl:.2},{w:3.5,l:60,t:58,o:.08,d:6.5,dl:2.8},{w:2.2,l:75,t:65,o:.22,d:4.1,dl:1.5},{w:1.6,l:95,t:52,o:.3,d:5.3,dl:.7},{w:2.7,l:8,t:72,o:.14,d:5.9,dl:3.2},{w:2,l:22,t:78,o:.2,d:3.6,dl:1.8},{w:3.1,l:48,t:75,o:.1,d:6.2,dl:.4},{w:1.8,l:65,t:82,o:.28,d:4.7,dl:2.3},{w:2.4,l:82,t:88,o:.18,d:5,dl:1.1}];
export default function StarBG(){return(
<div className="fixed inset-0 z-0 overflow-hidden" style={{background:'#06060e'}}>
  <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 15% 50%,rgba(180,50,50,.07) 0%,transparent 60%),radial-gradient(ellipse at 85% 30%,rgba(50,50,180,.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 90%,rgba(180,120,50,.05) 0%,transparent 50%)'}}/>
  {S.map((p,i)=><div key={i} className="absolute rounded-full" style={{width:p.w,height:p.w,background:`rgba(255,255,255,${p.o})`,left:`${p.l}%`,top:`${p.t}%`,animation:`twinkle ${p.d}s ease-in-out infinite`,animationDelay:`${p.dl}s`}}/>)}
</div>);}
