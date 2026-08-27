'use client';

export default function FutureBackdrop() {
  return (
    <div className="future-backdrop" aria-hidden="true">
      <div className="future-grid"/>
      <div className="future-aurora future-aurora-a"/>
      <div className="future-aurora future-aurora-b"/>
      <div className="future-orbit orbit-a"/>
      <div className="future-orbit orbit-b"/>
      <div className="future-scanline"/>
      <div className="future-glyph glyph-a font-jp">日</div>
      <div className="future-glyph glyph-b font-jp">語</div>
      <div className="future-glyph glyph-c font-jp">聴</div>
      <div className="future-dots">
        {Array.from({length:18},(_,i)=>(
          <i
            key={i}
            style={{
              left: `${8 + i * 4.8}%`,
              top: `${17 + (i % 6) * 12}%`,
              animationDelay: `${i * 0.18}s`,
              animationDuration: `${5 + i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
