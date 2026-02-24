'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StarBG from '@/components/StarBG';
import Toast from '@/components/Toast';

export default function JoinPage() {
  const { code } = useParams();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomStatus, setRoomStatus] = useState('lobby');
  const [toast, setToast] = useState({msg:'',v:false});
  const show = m => { setToast({msg:m,v:true}); setTimeout(()=>setToast(t=>({...t,v:false})),2500); };

  useEffect(()=>{
    // If already in this room, skip the form and go straight in
    const savedCode = localStorage.getItem('fp_room_code');
    const savedSession = localStorage.getItem('fp_session');
    if (savedCode === code.toUpperCase() && savedSession) {
      router.replace(`/room/${code}`);
      return;
    }

    supabase.auth.getUser().then(({data:{user}})=>{
      if(user) supabase.from('profiles').select('full_name').eq('id',user.id).single().then(({data})=>{if(data?.full_name)setName(data.full_name);});
    });
    // Check room status so we can warn if game is in progress
    supabase.from('rooms').select('status').eq('code', code.toUpperCase()).single().then(({data})=>{
      if(data?.status) setRoomStatus(data.status);
    });
  },[]);

  const join = async () => {
    if(!name.trim()){show('Enter your name');return;}
    setLoading(true);
    try {
      const {data:{user}} = await supabase.auth.getUser();
      const r = await fetch('/api/join-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,playerName:name.trim(),userId:user?.id||null})});
      const d = await r.json(); if(d.error) throw new Error(d.error);
      localStorage.setItem('fp_session',d.sessionToken);
      localStorage.setItem('fp_host','false');
      localStorage.setItem('fp_room_code', d.room.code);
      router.push(`/room/${d.room.code}`);
    } catch(e){show(e.message);}
    setLoading(false);
  };

  return (<><StarBG/>
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 max-w-[400px] mx-auto">
      <div className="text-center mb-8" style={{animation:'slideUp .6s ease'}}>
        <div className="text-[48px] mb-3" style={{animation:'float 4s ease-in-out infinite'}}>🎬</div>
        <h1 className="text-3xl font-black mb-2" style={{fontFamily:"'Playfair Display',serif",background:'linear-gradient(135deg,#fff,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>FlickPick</h1>
        <p className="text-white/40 text-sm">You've been invited to movie night!</p>
      </div>
      <div className="glass p-6 w-full" style={{animation:'slideUp .6s ease .15s both'}}>
        <div className="text-center mb-5">
          <span className="text-white/30 text-[11px] font-semibold tracking-wide">JOINING ROOM</span>
          <div className="text-gold text-3xl font-black tracking-[4px] mt-1" style={{fontFamily:"'Bebas Neue'"}}>{code}</div>
          {roomStatus==='swiping' && <div className="mt-2 text-yellow-400/80 text-[11px] font-bold bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-1.5">⚡ Game in progress — you'll jump straight in!</div>}
        </div>
        <label className="text-white/35 text-[11px] font-bold tracking-[1.5px] uppercase mb-2 block">Your name</label>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} placeholder="Enter your name" className="inp mb-5"/>
        <button onClick={join} disabled={loading} className="btn-gold">{loading?'Joining...':'Join Room 🎉'}</button>
      </div>
    </div>
    <Toast msg={toast.msg} visible={toast.v}/>
  </>);
}
