'use client';

import { Check, ChevronRight, Circle, Map, Play } from 'lucide-react';
import type { LessonJourney, ViewName } from '@/lib/types';
import { useLanguage } from '@/lib/language';

type Props = {
  journey: LessonJourney;
  completed: string[];
  onOpen: (view: ViewName, stageId: string) => void;
  onToggleComplete: (stageId: string) => void;
};

export default function LessonJourneyPanel({ journey, completed, onOpen, onToggleComplete }: Props) {
  const {language,text}=useLanguage();
  const required = journey.stages.filter(x => !x.optional);
  const requiredDone = required.filter(x => completed.includes(x.id)).length;
  const percent = Math.round(requiredDone / Math.max(1, required.length) * 100);
  const current = journey.stages.find(x => !completed.includes(x.id) && !x.optional) || journey.stages.find(x => !completed.includes(x.id)) || journey.stages[journey.stages.length - 1];
  const totalMinutes = journey.stages.reduce((sum, x) => sum + Number(x.estimatedMinutes || 0), 0);

  return (
    <section className="lesson-journey" aria-labelledby="lesson-journey-title">
      <div className="lesson-journey__grid">
        <div className="lesson-journey__summary">
          <div className="lesson-journey__eyebrow"><Map size={14}/> {text('গাইডেড লেসন জার্নি','Guided Lesson Journey')}</div>
          <h2 id="lesson-journey-title" className={language==='bn'?'font-bn':''}>{text(`Lesson ${String(journey.lessonId).padStart(2,'0')} · এক ধাপ করে এগোন`,`Lesson ${String(journey.lessonId).padStart(2,'0')} · progress one step at a time`)}</h2>
          <p className={language==='bn'?'font-bn':''}>{language==='bn'?journey.objective:journey.objectiveEn||journey.objective}</p>

          <div className="lesson-journey__progress">
            <div><span>{text('লেসন অগ্রগতি','Lesson progress')}</span><b>{percent}%</b></div>
            <div className="lesson-journey__progress-track"><i style={{width:`${percent}%`}}/></div>
            <small><span>{text(`${requiredDone}/${required.length} core stage`,`${requiredDone}/${required.length} core stages`)}</span><span>{text(`≈ ${totalMinutes} মিনিট মোট`,`≈ ${totalMinutes} min total`)}</span></small>
          </div>

          {current && (
            <div className="lesson-journey__next">
              <span>{text('এরপর','Up next')}</span>
              <div>
                <div><b className={language==='bn'?'font-bn':''}>{language==='bn'?current.title:current.titleEn||current.title}</b><small>≈ {current.estimatedMinutes || 0} min</small></div>
                {current.targetView && <button type="button" onClick={()=>onOpen(current.targetView!,current.id)} className="lesson-journey__start"><Play size={14} fill="currentColor"/><span className={language==='bn'?'font-bn':''}>{text('শুরু করুন','Start')}</span></button>}
              </div>
            </div>
          )}
        </div>

        <div className="lesson-journey__stages">
          {journey.stages.map((stage, index) => {
            const done = completed.includes(stage.id);
            const active = current?.id === stage.id;
            return (
              <article key={stage.id} className={`lesson-journey__stage ${active?'is-active':''} ${done?'is-done':''}`}>
                <button type="button" onClick={() => onToggleComplete(stage.id)} className="lesson-journey__done" aria-pressed={done} aria-label={`${language==='bn'?stage.title:stage.titleEn||stage.title} ${done?text('অসম্পূর্ণ করুন','mark incomplete'):text('সম্পন্ন করুন','mark complete')}`}>{done?<Check size={13}/>:<Circle size={12}/>}<span className={language==='bn'?'font-bn':''}>{done?text('হয়েছে','Done'):text('শেষ?','Done?')}</span></button>
                <div className="lesson-journey__stage-copy">
                  <div><span>{String(index+1).padStart(2,'0')}</span>{active&&<mark>{text('পরবর্তী','next')}</mark>}{stage.optional&&<mark className="optional">{text('ঐচ্ছিক','optional')}</mark>}</div>
                  <b className={language==='bn'?'font-bn':''}>{language==='bn'?stage.title:stage.titleEn||stage.title}</b>
                  <small>≈ {stage.estimatedMinutes || 0} min</small>
                </div>
                {stage.targetView&&<button type="button" onClick={()=>onOpen(stage.targetView!,stage.id)} className="lesson-journey__open" aria-label={`${language==='bn'?stage.title:stage.titleEn||stage.title} ${text('খুলুন','open')}`}>{active?<Play size={13}/>:<ChevronRight size={13}/>}<span className={language==='bn'?'font-bn':''}>{text('খুলুন','Open')}</span></button>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
