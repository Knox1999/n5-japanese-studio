'use client';

import { useLayoutEffect, useRef } from 'react';
export default function HeroScene(){
  const root=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const el=root.current;if(!el||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let ctx:gsap.Context|undefined;let move:(e:PointerEvent)=>void=()=>{};
    (async()=>{try{const {gsap}=await import('gsap');ctx=gsap.context(()=>{
      gsap.fromTo('.v44-fuji',{y:18,opacity:0,scale:1.025},{y:0,opacity:1,scale:1,duration:1.2,ease:'power3.out'});
      gsap.fromTo('.v44-branch',{x:30,opacity:0},{x:0,opacity:1,duration:1.08,ease:'power3.out',delay:.08});
      gsap.fromTo('.v44-bloom',{scale:.3,opacity:0,rotation:-10},{scale:1,opacity:1,rotation:0,duration:.72,stagger:.045,ease:'back.out(1.8)',delay:.18});
      gsap.to('.v44-petal',{y:22,x:-10,rotation:24,duration:4.2,repeat:-1,yoyo:true,stagger:.16,ease:'sine.inOut'});
      gsap.to('.v44-sun-glow',{scale:1.08,opacity:.72,duration:3.1,repeat:-1,yoyo:true,ease:'sine.inOut',transformOrigin:'50% 50%'});
      gsap.to('.v44-fuji',{y:-2,duration:5.5,repeat:-1,yoyo:true,ease:'sine.inOut'});
      if(!window.matchMedia('(max-width:900px)').matches){move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;gsap.to('.v44-branch',{x:x*8,y:y*5,duration:.8,ease:'power2.out'});gsap.to('.v44-fuji',{x:x*-5,duration:1.1,ease:'power2.out'})};el.addEventListener('pointermove',move,{passive:true})}
    },el)}catch{}})();return()=>{el.removeEventListener('pointermove',move);ctx?.revert?.()};
  },[]);
  const blooms=[[602,58,1],[640,76,.84],[677,45,.72],[570,92,.9],[535,128,.76],[500,150,.65],[704,96,.62],[618,122,.7],[552,54,.58]];
  return <div ref={root} className="hero-scene-v44 hero-scene-v48" aria-hidden="true">
    <svg viewBox="0 0 760 410" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="v44Sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#111b19"/><stop offset=".62" stopColor="#0b1211"/><stop offset="1" stopColor="#17211f"/></linearGradient>
        <radialGradient id="v44Sun"><stop offset="0" stopColor="#f0ce88" stopOpacity=".95"/><stop offset=".62" stopColor="#d55a66" stopOpacity=".48"/><stop offset="1" stopColor="#c94753" stopOpacity=".1"/></radialGradient>
        <linearGradient id="v44Fuji" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5c7471"/><stop offset=".5" stopColor="#334946"/><stop offset="1" stopColor="#1c302d"/></linearGradient>
        <linearGradient id="v44Front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e4541"/><stop offset="1" stopColor="#12231f"/></linearGradient>
        <filter id="v44Blur"><feGaussianBlur stdDeviation="18"/></filter><filter id="v44Shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity=".28"/></filter>
      </defs>
      <rect width="760" height="410" fill="url(#v44Sky)"/><circle className="v44-sun-glow" cx="614" cy="104" r="94" fill="#d25562" opacity=".09" filter="url(#v44Blur)"/><circle cx="614" cy="104" r="58" fill="url(#v44Sun)" opacity=".92"/>
      <g className="v44-fuji" filter="url(#v44Shadow)"><path d="M278 358 L474 118 L686 358 Z" fill="url(#v44Fuji)"/><path d="M430 171 L474 118 L522 177 L503 166 L489 184 L476 169 L458 188 L445 167 Z" fill="#f0eadf" opacity=".95"/><path d="M300 358 L430 244 L535 358 Z" fill="#263b38" opacity=".75"/><path d="M462 358 L586 255 L710 358 Z" fill="#1f3531" opacity=".86"/></g>
      <path d="M0 334 C115 288 215 350 324 316 C430 282 535 342 760 292 L760 410 L0 410 Z" fill="url(#v44Front)" opacity=".96"/><path d="M0 366 C170 334 280 382 438 350 C570 325 662 356 760 340" fill="none" stroke="#c99b52" strokeWidth="1.4" opacity=".24"/>
      <g className="v44-branch" fill="none" strokeLinecap="round"><path d="M770 8 C690 24 644 64 598 100 C555 133 508 163 448 207" stroke="#725044" strokeWidth="12"/><path d="M676 47 C648 42 622 30 602 12" stroke="#725044" strokeWidth="6"/><path d="M620 84 C592 75 563 78 538 94" stroke="#725044" strokeWidth="6"/><path d="M566 132 C539 126 516 136 493 155" stroke="#725044" strokeWidth="5"/></g>
      {blooms.map(([cx,cy,s],i)=><g key={i} className="v44-bloom" transform={`translate(${cx} ${cy}) scale(${s})`}><ellipse rx="11" ry="6" transform="rotate(-12) translate(9 0)" fill="#dc7d88"/><ellipse rx="11" ry="6" transform="rotate(60) translate(9 0)" fill="#eb9ca6"/><ellipse rx="11" ry="6" transform="rotate(132) translate(9 0)" fill="#d9707f"/><ellipse rx="11" ry="6" transform="rotate(204) translate(9 0)" fill="#f0aeb4"/><ellipse rx="11" ry="6" transform="rotate(276) translate(9 0)" fill="#dc7d88"/><circle r="3" fill="#d2a75b"/></g>)}
      {[[612,168],[655,142],[544,188],[702,123],[590,205]].map(([cx,cy],i)=><ellipse key={i} className="v44-petal" cx={cx} cy={cy} rx="7" ry="3.4" fill="#e9949e" opacity={.65-i*.06} transform={`rotate(${i*19-26} ${cx} ${cy})`}/>)}<rect x="0" y="0" width="760" height="410" fill="none" stroke="#c99b52" strokeOpacity=".08"/>
    </svg>
  </div>
}
