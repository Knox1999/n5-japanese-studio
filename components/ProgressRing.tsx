'use client';

export default function ProgressRing({ value, size = 112, label }: { value: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`${label || 'Progress'} ${v}%`}>
      <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#ebe6de" strokeWidth="8" />
        <circle cx="52" cy="52" r={r} fill="none" stroke="#c95362" strokeLinecap="round" strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute text-center"><b className="block text-2xl tracking-tight text-ink">{v}%</b><span className="text-[10px] uppercase tracking-[.16em] text-slatecopy">{label || 'Mastery'}</span></div>
    </div>
  );
}
