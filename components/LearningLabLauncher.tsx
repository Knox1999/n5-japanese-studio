'use client';

import { ArrowRight, Gamepad2, GraduationCap, Sparkles } from 'lucide-react';
import type { ViewName } from '@/lib/types';

export default function LearningLabLauncher({onNavigate}:{onNavigate:(view:ViewName)=>void}){
  return <section className="learning-lab-launcher-v64" aria-labelledby="learning-labs-title">
    <header><div><span><Sparkles/> NEW LEARNING LABS</span><h2 id="learning-labs-title" className="font-bn">Foundation + Practice, এখন একই learning loop-এর অংশ</h2></div><p className="font-bn">Kana complete beginner থেকে শিখুন, তারপর lesson data দিয়ে short focused games খেলুন। ভুলগুলো repair history-তে যাবে।</p></header>
    <div>
      <button onClick={()=>onNavigate('kana')} className="kana"><span className="lab-glyph font-jp">あ</span><div><small>BEGINNER FOUNDATION</small><h3>Kana Academy</h3><p className="font-bn">Hiragana · Katakana · recognition · tracing</p></div><em>Learn kana <ArrowRight/></em><GraduationCap className="lab-icon"/></button>
      <button onClick={()=>onNavigate('arcade')} className="arcade"><span className="lab-glyph font-jp">遊</span><div><small>REUSABLE PRACTICE ENGINE</small><h3>Practice Arcade</h3><p className="font-bn">Meaning match · quick recall · particle challenge</p></div><em>Play & learn <ArrowRight/></em><Gamepad2 className="lab-icon"/></button>
    </div>
  </section>;
}
