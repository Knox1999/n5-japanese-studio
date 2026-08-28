'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AmbientCanvas=dynamic(()=>import('./AmbientCanvas'),{ssr:false});

export default function AmbientGate(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile=window.matchMedia('(max-width: 820px)').matches;
    const saveData=Boolean((navigator as any).connection?.saveData);
    const lowMemory=Number((navigator as any).deviceMemory||8)<=2;
    if(reduced||mobile||saveData||lowMemory)return;

    let cancelled=false;
    const start=()=>{if(!cancelled)setReady(true)};
    const w=window as any;
    const id=typeof w.requestIdleCallback==='function'
      ?w.requestIdleCallback(start,{timeout:1800})
      :window.setTimeout(start,900);
    return()=>{
      cancelled=true;
      if(typeof w.cancelIdleCallback==='function')w.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  },[]);
  return ready?<AmbientCanvas/>:null;
}
