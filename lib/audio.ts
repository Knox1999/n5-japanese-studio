import { track, trackError } from './analytics';

export type AudioVoiceRole='default'|'male'|'female';
export type PlaybackResult='ended'|'cancelled'|'unavailable';

export interface AudioBoundary{
  charIndex:number;
  charLength:number;
  totalChars:number;
  progress:number;
  name:string;
}

export interface AudioCallbacks{
  onStart?:()=>void;
  onProgress?:(ratio:number)=>void;
  onBoundary?:(boundary:AudioBoundary)=>void;
  onEnd?:()=>void;
}

export interface DialogueSpeechLine{
  text:string;
  voiceRole?:AudioVoiceRole;
  speaker?:string;
}

type PreparedSpeech={display:string;speech:string;speechToDisplay:number[]};
type SpeechChunk={text:string;speechStart:number};

let activeResolve:((result:PlaybackResult)=>void)|null=null;
let activeProgressTimer:number|null=null;
let playbackGeneration=0;

function normalizeDisplay(text:string){
  return String(text||'').normalize('NFC').replace(/\s+/g,' ').trim();
}

const JP=/[\u3040-\u30ff\u3400-\u9fff々〆ヵヶ]/;
const QUOTE=/[「」『』“”"']/;

function prepareSpeech(text:string):PreparedSpeech{
  const display=normalizeDisplay(text);
  let speech='';
  const speechToDisplay:number[]=[];
  const append=(value:string,displayIndex:number)=>{
    for(const char of value){speech+=char;speechToDisplay.push(displayIndex)}
  };

  for(let index=0;index<display.length;index+=1){
    const char=display[index];
    const prev=display[index-1]||'';
    const next=display[index+1]||'';
    if(QUOTE.test(char))continue;
    if(char==='・'&&JP.test(prev)&&JP.test(next))continue;
    if(/\s/.test(char)&&JP.test(prev)&&JP.test(next))continue;
    if(char==='、'&&speech.endsWith('、'))continue;
    append(char,index);
    // A small pause after a full stop sounds more natural in long browser-TTS
    // passages. Synthetic spacing maps back to the punctuation itself.
    if(char==='。'&&index<display.length-1)append(' ',index);
  }
  return{display,speech:speech.trim(),speechToDisplay};
}

function speechController():SpeechSynthesis|null{
  if(typeof window==='undefined'||!('speechSynthesis'in window))return null;
  return window.speechSynthesis;
}

function clearProgressTimer(){
  if(activeProgressTimer!==null){
    window.clearInterval(activeProgressTimer);
    activeProgressTimer=null;
  }
}

export function stopAudio():PlaybackResult{
  playbackGeneration+=1;
  clearProgressTimer();
  try{speechController()?.cancel()}catch{}
  const finish=activeResolve;
  activeResolve=null;
  finish?.('cancelled');
  return 'cancelled';
}

function notifyAudioError(text:string,type:string){
  if(typeof window==='undefined')return;
  try{
    window.dispatchEvent(new CustomEvent('nv:resource-error',{
      detail:{kind:'audio',path:type,message:`Voice unavailable: ${normalizeDisplay(text).slice(0,80)}`}
    }));
  }catch{}
}

function japaneseVoices(synth:SpeechSynthesis){
  return synth.getVoices().filter(voice=>/^ja(?:-|_)/i.test(voice.lang));
}

async function loadJapaneseVoices(synth:SpeechSynthesis){
  const ready=japaneseVoices(synth);
  if(ready.length)return ready;
  await new Promise<void>(resolve=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      synth.removeEventListener('voiceschanged',finish);
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout=window.setTimeout(finish,1200);
    synth.addEventListener('voiceschanged',finish,{once:true});
  });
  return japaneseVoices(synth);
}

const MALE_HINTS=[/keita/i,/otoya/i,/ichiro/i,/hattori/i,/male/i,/男性/];
const FEMALE_HINTS=[/nanami/i,/kyoko/i,/ayumi/i,/haruka/i,/female/i,/女性/];

function pickVoice(voices:SpeechSynthesisVoice[],role:AudioVoiceRole){
  if(!voices.length)return undefined;
  const hints=role==='male'?MALE_HINTS:role==='female'?FEMALE_HINTS:[];
  return voices.find(voice=>hints.some(pattern=>pattern.test(`${voice.name} ${voice.voiceURI}`)))
    ||voices.find(voice=>voice.default)
    ||voices[0];
}

function rolePitch(role:AudioVoiceRole){
  if(role==='male')return .88;
  if(role==='female')return 1.08;
  return 1;
}

function splitSpeech(text:string,maxLength=150):SpeechChunk[]{
  if(!text)return[];
  if(text.length<=maxLength)return[{text,speechStart:0}];
  const raw=text.split(/(?<=[。！？!?、,])\s*/).filter(Boolean);
  const chunks:SpeechChunk[]=[];
  let current='';
  let currentStart=0;
  let cursor=0;
  const pushCurrent=()=>{if(current){chunks.push({text:current,speechStart:currentStart});current=''}};

  for(const part of raw){
    const partStart=text.indexOf(part,cursor);
    const safeStart=partStart>=0?partStart:cursor;
    cursor=safeStart+part.length;
    if(current&&current.length+part.length>maxLength)pushCurrent();
    if(part.length>maxLength){
      pushCurrent();
      for(let offset=0;offset<part.length;offset+=maxLength){
        chunks.push({text:part.slice(offset,offset+maxLength),speechStart:safeStart+offset});
      }
    }else{
      if(!current)currentStart=safeStart;
      current+=part;
    }
  }
  pushCurrent();
  return chunks;
}

function displayIndexFor(prepared:PreparedSpeech,speechIndex:number){
  if(!prepared.speechToDisplay.length)return 0;
  const safe=Math.max(0,Math.min(prepared.speechToDisplay.length-1,speechIndex));
  return prepared.speechToDisplay[safe]??0;
}

export async function playText(
  text:string,
  rate=1,
  type='sentence',
  cb:AudioCallbacks={},
  meta:Record<string,unknown>={},
  voiceRole:AudioVoiceRole='default'
):Promise<PlaybackResult>{
  stopAudio();
  const generation=playbackGeneration;
  const prepared=prepareSpeech(text);
  const safeRate=Math.max(.5,Math.min(1.5,rate));
  const synth=speechController();
  if(!prepared.display||!prepared.speech||!synth){notifyAudioError(prepared.display,type);return'unavailable'}

  const chunks=splitSpeech(prepared.speech);
  if(!chunks.length)return'unavailable';

  track('audio_play',{audio_type:type,playback_rate:safeRate,content_length:prepared.display.length,voice_role:voiceRole,voice_engine:'web-speech-api-ja-JP',billed_api:false,exclusive_audio:true,...meta});

  try{
    const voices=await loadJapaneseVoices(synth);
    if(generation!==playbackGeneration)return'cancelled';
    const selectedVoice=pickVoice(voices,voiceRole);
    const totalSpeechChars=prepared.speech.length;

    return await new Promise<PlaybackResult>(resolve=>{
      let settled=false;
      let chunkIndex=0;
      let started=false;

      const finish=(status:PlaybackResult)=>{
        if(settled)return;
        settled=true;
        clearProgressTimer();
        if(activeResolve===finish)activeResolve=null;
        if(status==='ended'){cb.onProgress?.(1);cb.onEnd?.()}
        resolve(status);
      };
      activeResolve=finish;

      const speakNext=()=>{
        if(settled)return;
        if(generation!==playbackGeneration){finish('cancelled');return}
        if(chunkIndex>=chunks.length){finish('ended');return}

        const chunk=chunks[chunkIndex];
        const utterance=new SpeechSynthesisUtterance(chunk.text);
        utterance.lang='ja-JP';utterance.rate=safeRate;utterance.pitch=rolePitch(voiceRole);utterance.volume=1;
        if(selectedVoice)utterance.voice=selectedVoice;

        const estimatedMs=Math.max(900,(chunk.text.length*115)/safeRate);
        const startedAt=performance.now();
        clearProgressTimer();
        activeProgressTimer=window.setInterval(()=>{
          const partial=Math.min(.96,(performance.now()-startedAt)/estimatedMs);
          const ratio=(chunk.speechStart+partial*chunk.text.length)/Math.max(1,totalSpeechChars);
          cb.onProgress?.(Math.min(.99,ratio));
        },120);

        utterance.onstart=()=>{if(started)return;started=true;cb.onStart?.()};
        utterance.onboundary=event=>{
          const localIndex=Math.max(0,Math.min(chunk.text.length-1,Number(event.charIndex||0)));
          const absoluteSpeechIndex=Math.min(totalSpeechChars-1,chunk.speechStart+localIndex);
          const displayIndex=displayIndexFor(prepared,absoluteSpeechIndex);
          const reportedLength=Math.max(1,Number(event.charLength||1));
          const endSpeechIndex=Math.min(totalSpeechChars-1,absoluteSpeechIndex+reportedLength-1);
          const displayEnd=displayIndexFor(prepared,endSpeechIndex)+1;
          const charLength=Math.max(1,displayEnd-displayIndex);
          const ratio=Math.min(.99,absoluteSpeechIndex/Math.max(1,totalSpeechChars));
          cb.onBoundary?.({charIndex:displayIndex,charLength,totalChars:prepared.display.length,progress:ratio,name:String(event.name||'boundary')});
          cb.onProgress?.(ratio);
        };
        utterance.onend=()=>{
          clearProgressTimer();
          if(generation!==playbackGeneration){finish('cancelled');return}
          const completed=Math.min(totalSpeechChars,chunk.speechStart+chunk.text.length);
          cb.onProgress?.(Math.min(.99,completed/Math.max(1,totalSpeechChars)));
          chunkIndex+=1;speakNext();
        };
        utterance.onerror=event=>{
          clearProgressTimer();
          if(generation!==playbackGeneration||event.error==='canceled'||event.error==='interrupted'){finish('cancelled');return}
          trackError('audio',new Error(`browser-speech-${event.error}`));notifyAudioError(prepared.display,type);finish('unavailable');
        };
        try{if(synth.paused)synth.resume()}catch{}
        synth.speak(utterance);
      };
      speakNext();
    });
  }catch(error){
    if(generation!==playbackGeneration)return'cancelled';
    trackError('audio',error);notifyAudioError(prepared.display,type);return'unavailable';
  }
}

export async function playDialogueTrack(lines:DialogueSpeechLine[],rate=1,cb:AudioCallbacks={},meta:Record<string,unknown>={}):Promise<PlaybackResult>{
  stopAudio();
  const sequence=lines.filter(line=>normalizeDisplay(line.text));
  if(!sequence.length)return'unavailable';
  track('audio_play',{audio_type:'conversation_full',playback_rate:rate,dual_voice:true,voice_engine:'web-speech-api-ja-JP',billed_api:false,...meta});

  let started=false;
  for(let index=0;index<sequence.length;index+=1){
    const line=sequence[index];
    const result=await playText(line.text,rate,'conversation_line',{
      onStart:()=>{if(!started){started=true;cb.onStart?.()}},
      onProgress:ratio=>cb.onProgress?.((index+ratio)/sequence.length),
      onBoundary:boundary=>cb.onBoundary?.({...boundary,progress:(index+boundary.progress)/sequence.length})
    },{speaker:line.speaker,line_number:index+1,dialogue_sequence:true},line.voiceRole||'default');
    if(result!=='ended')return result;
  }
  cb.onProgress?.(1);cb.onEnd?.();return'ended';
}
