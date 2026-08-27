'use client';

import { useMemo, useState } from 'react';
import { BookOpenText, Languages, MessageCircle, Volume2, Eye, EyeOff } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { playText } from '@/lib/audio';

export function Conversation({data}:{data:LessonPayload}){
  const rows=data.content.dialogue_extended||data.content.dialogue||[];
  return <div className="space-y-5"><section className="study-header tone-conversation"><div><div className="section-kicker">Natural Conversation · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>Speak in context</h1><p className="font-bn">প্রতিটি line শুনুন, pause করুন, তারপর একই rhythm-এ shadow করুন।</p></div><MessageCircle className="header-big-icon"/></section><article className="premium-panel conversation-stage">{rows.map((r,i)=><div key={i} className={`dialogue-row ${i%2?'right':''}`}><div className="speaker">{r[0]}</div><div className="dialogue-bubble"><div className="flex items-start justify-between gap-3"><p className="font-jp">{r[1]}</p><button className="mini-audio" onClick={()=>playText(r[1],1,'conversation')}><Volume2 size={16}/></button></div><span className="font-bn">{r[2]}</span></div></div>)}</article></div>
}

export function Reading({data}:{data:LessonPayload}){
  const [showBn,setShowBn]=useState(true);const text=data.content.reading_extended||data.content.reading||'';const bn=data.content.reading_extended_bn||data.content.reading_bn||'';const paras=text.split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean);
  return <div className="space-y-5"><section className="study-header tone-reading"><div><div className="section-kicker">Long-form Reading</div><h1>Read with breathing space</h1><p className="font-bn">Japanese passage আগে পড়ুন; প্রয়োজন হলে বাংলা সহায়তা খুলুন।</p></div><BookOpenText className="header-big-icon"/></section><div className="toolbar-panel"><button className="premium-btn premium-btn-primary" onClick={()=>playText(text,1,'reading')}><Volume2 size={16}/> Full passage</button><button className="premium-btn premium-btn-secondary" onClick={()=>setShowBn(x=>!x)}>{showBn?<EyeOff size={16}/>:<Eye size={16}/>} {showBn?'Hide Bangla':'Show Bangla'}</button></div><article className="reading-paper"><div className="paper-mark">読</div>{paras.map((p,i)=><p className="font-jp" key={i}>{p}</p>)}{showBn&&<div className="reading-translation font-bn"><b>বাংলা অর্থ</b><p>{bn}</p></div>}</article></div>
}

export function Grammar({data}:{data:LessonPayload}){
  const rows=data.content.grammar||[];
  return <div className="space-y-5"><section className="study-header tone-grammar"><div><div className="section-kicker">Grammar Patterns</div><h1>Pattern → Meaning → Natural Example</h1><p className="font-bn">একই lesson-এর grammar-কে ছোট, পরিষ্কার visual blocks-এ দেখানো হয়েছে।</p></div><Languages className="header-big-icon"/></section><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((g,i)=><article key={i} className="grammar-premium-card"><span>{String(i+1).padStart(2,'0')}</span><h2 className="font-jp">{g[0]}</h2><p className="font-bn">{g[1]}</p><div className="grammar-example"><b className="font-jp">{g[2]}</b><button className="mini-audio" onClick={()=>playText(g[2],1,'grammar')}><Volume2 size={16}/></button></div></article>)}</div></div>
}
