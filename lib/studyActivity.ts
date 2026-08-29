import type { ViewName } from './types';

const KEY='nihongo_vibes_study_activity_v1';
const VERSION=1;

export type StudyActivityEntry={
  lesson:number;
  view:ViewName;
  opens:number;
  actions:number;
  completions:number;
  lastAt:string;
  lastEvent:string;
};

export type StudyActivityState={
  version:number;
  entries:Record<string,StudyActivityEntry>;
};

const TRACKED_VIEWS:ViewName[]=['vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','kana','arcade','mock'];

function empty():StudyActivityState{return{version:VERSION,entries:{}}}
function key(lesson:number,view:ViewName){return`${lesson}:${view}`}
function safeLesson(value:unknown){const n=Number(value||0);return Number.isFinite(n)&&n>0?Math.max(1,Math.min(25,Math.round(n))):0}
function isView(value:unknown):value is ViewName{return typeof value==='string'&&TRACKED_VIEWS.includes(value as ViewName)}

export function readStudyActivity():StudyActivityState{
  if(typeof window==='undefined')return empty();
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null') as Partial<StudyActivityState>|null;
    return {version:VERSION,entries:raw?.entries&&typeof raw.entries==='object'?raw.entries:{}};
  }catch{return empty()}
}

function save(state:StudyActivityState){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(KEY,JSON.stringify({...state,version:VERSION}))}catch{}
}

export function recordStudyActivity(lesson:number,view:ViewName,kind:'open'|'action'|'complete',event='activity'){
  if(typeof window==='undefined'||!isView(view)||!lesson)return;
  const state=readStudyActivity();
  const k=key(lesson,view);
  const prev=state.entries[k]||{lesson,view,opens:0,actions:0,completions:0,lastAt:'',lastEvent:''};
  const next:StudyActivityEntry={
    ...prev,
    lesson,
    view,
    opens:prev.opens+(kind==='open'?1:0),
    actions:prev.actions+(kind==='action'?1:0),
    completions:prev.completions+(kind==='complete'?1:0),
    lastAt:new Date().toISOString(),
    lastEvent:event,
  };
  state.entries[k]=next;
  const rows=Object.entries(state.entries)
    .sort((a,b)=>String(b[1].lastAt).localeCompare(String(a[1].lastAt)))
    .slice(0,275);
  save({version:VERSION,entries:Object.fromEntries(rows)});
  try{window.dispatchEvent(new CustomEvent('nv:study-activity',{detail:next}))}catch{}
}

function eventView(event:string,params:Record<string,unknown>):ViewName|null{
  if(event==='page_view'){
    const view=params.section_name;
    return isView(view)?view:null;
  }
  if(event==='practice_result'){
    const type=String(params.practice_type||'');
    if(type==='srs')return'srs';
    if(type==='spelling')return'spelling';
    if(type.startsWith('arcade_'))return'arcade';
    if(type.startsWith('kana'))return'kana';
  }
  if(event==='game_completed')return'arcade';
  if(event.startsWith('mock_')||event==='mock_complete'||event==='mock_completed')return'mock';
  if(event==='audio_play'){
    const type=String(params.audio_type||'');
    const practice=String(params.practice_type||'');
    if(type==='listening'||type==='shadowing'||practice==='listening')return'listening';
    if(type.startsWith('conversation'))return'conversation';
    if(practice==='spelling')return'spelling';
    if(type==='word'||type==='sentence')return'vocabulary';
  }
  if(event==='shadowing_complete')return'listening';
  if(event==='lesson_stage_completed'){
    const stage=String(params.stage_id||'');
    const map:Record<string,ViewName>={vocabulary:'vocabulary',conversation:'conversation',grammar:'grammar',listening:'listening',reading:'reading',kanji:'kanji',practice:'srs',quiz:'mock',repair:'srs'};
    return map[stage]||null;
  }
  return null;
}

export function captureStudyEvent(event:string,params:Record<string,unknown>={}){
  if(typeof window==='undefined')return;
  const view=eventView(event,params);
  if(!view)return;
  const lesson=safeLesson(params.lesson_number)||safeLesson(new URLSearchParams(location.search).get('lesson'))||1;
  if(event==='page_view')recordStudyActivity(lesson,view,'open',event);
  else if(event==='game_completed'||event==='shadowing_complete'||event==='mock_complete'||event==='mock_completed')recordStudyActivity(lesson,view,'complete',event);
  else recordStudyActivity(lesson,view,'action',event);
}

export function lessonActivity(state:StudyActivityState,lesson:number){
  return TRACKED_VIEWS.map(view=>state.entries[key(lesson,view)]).filter(Boolean);
}

export function latestActivity(state:StudyActivityState,lesson?:number){
  return Object.values(state.entries)
    .filter(row=>!lesson||row.lesson===lesson)
    .sort((a,b)=>b.lastAt.localeCompare(a.lastAt))[0]||null;
}

export function activityFor(state:StudyActivityState,lesson:number,view:ViewName){
  return state.entries[key(lesson,view)]||null;
}
