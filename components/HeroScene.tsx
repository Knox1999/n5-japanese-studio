'use client';

import { useLayoutEffect, useRef } from 'react';
import AmbientCanvas from './AmbientCanvas';

export default function HeroScene() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ctx: any;
    (async () => {
      const { gsap } = await import('gsap');
      if (!el) return;
      ctx = gsap.context(() => {
        gsap.fromTo('.sakura-bloom', { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: .8, stagger: .055, ease: 'back.out(1.8)', delay: .12 });
        gsap.fromTo('.fuji-layer', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
        gsap.fromTo('.wave-line', { strokeDashoffset: 180 }, { strokeDashoffset: 0, duration: 1.4, stagger: .08, ease: 'power2.out' });
      }, el);
    })();
    return () => ctx?.revert?.();
  }, []);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <AmbientCanvas />
      <svg viewBox="0 0 720 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="skyWash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fffdf8" />
            <stop offset=".58" stopColor="#f8f1e8" />
            <stop offset="1" stopColor="#f5e8e6" />
          </linearGradient>
          <linearGradient id="fuji" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#60768a" />
            <stop offset="1" stopColor="#2f4a61" />
          </linearGradient>
          <filter id="softShadow"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#102a43" floodOpacity=".10"/></filter>
        </defs>
        <rect width="720" height="320" fill="url(#skyWash)" opacity=".96" />
        <circle cx="595" cy="80" r="40" fill="#d65b63" opacity=".12" />
        <g className="fuji-layer" filter="url(#softShadow)" opacity=".95">
          <path d="M392 255 L530 104 L674 255 Z" fill="url(#fuji)" opacity=".22"/>
          <path d="M497 141 L530 104 L567 145 L548 140 L532 151 L519 139 Z" fill="#fffdfa" opacity=".9" />
        </g>
        <g fill="none" stroke="#6c91ad" strokeWidth="2" opacity=".25">
          <path className="wave-line" strokeDasharray="180" d="M332 270 C380 245 425 295 472 270 S565 245 615 270"/>
          <path className="wave-line" strokeDasharray="180" d="M360 285 C405 263 451 307 499 285 S588 262 648 285"/>
        </g>
        <g stroke="#5b4034" strokeLinecap="round" fill="none">
          <path d="M720 18 C638 35 602 92 548 133 C500 169 452 180 410 209" strokeWidth="9" opacity=".86"/>
          <path d="M641 48 C610 53 582 44 558 29" strokeWidth="5" opacity=".8"/>
          <path d="M603 91 C575 84 548 88 520 108" strokeWidth="5" opacity=".8"/>
          <path d="M550 132 C523 127 497 137 474 160" strokeWidth="4" opacity=".75"/>
        </g>
        {[
          [650,38],[620,53],[588,34],[568,72],[535,92],[505,118],[480,151],[455,172],[599,82],[549,55],[523,142],[430,195]
        ].map(([cx,cy], i) => (
          <g key={i} className="sakura-bloom" transform={`translate(${cx} ${cy})`}>
            <ellipse rx="8" ry="4.5" transform="rotate(-28) translate(6 0)" fill="#d9808c" opacity=".84"/>
            <ellipse rx="8" ry="4.5" transform="rotate(44) translate(6 0)" fill="#e2939e" opacity=".82"/>
            <ellipse rx="8" ry="4.5" transform="rotate(116) translate(6 0)" fill="#d87786" opacity=".82"/>
            <ellipse rx="8" ry="4.5" transform="rotate(188) translate(6 0)" fill="#e9a4aa" opacity=".84"/>
            <ellipse rx="8" ry="4.5" transform="rotate(260) translate(6 0)" fill="#d9808c" opacity=".84"/>
            <circle r="2.3" fill="#b7883e"/>
          </g>
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper/80 to-transparent" />
    </div>
  );
}
