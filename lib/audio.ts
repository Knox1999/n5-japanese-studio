import { track, trackError } from './analytics';

export type AudioVoiceRole='default'|'male'|'female';
export type PlaybackResult='ended'|'cancelled'|'unavailable';

export interface AudioCallbacks{
  onStart?:()=>void;
  onProgress?:(ratio:number)=>void;
  onEnd?:()=>void;
}

export interface DialogueSpeechLine{
  text:string;
  voiceRole?:AudioVoiceRole;
  speaker?:string;
}

let activeUtterance:SpeechSynthesisUtterance|null=null;
let activeResolve:((result:PlaybackResult)=>void)|null=null;
let activeProgressTimer:number|null=null;
let playbackGeneration=0;

function normalizeDisplay(text:string){
  return String(text||'').normalize('NFC').replace(/\s+/g,' ').trim();
}

function normalizeSpeech(text:string){
  let value=String(text||'').normalize('NFC').trim();
  const japanese='\\u3040-\\u30ff\\u3400-\\u9fff々〆ヵヶ';
  value=value
    .replace(new RegExp(`(?<=[${japanese}])\\s+(?=[${japanese}])`,'g'),'')
    .replace(/[「」『』“”"']/g,'')
    .replace(new RegExp(`(?<=[${japanese}])・(?=[${japanese}])`,'g'),'')
    .replace(/。(?=.)/g,'。 ')
    .replace(/、{2,}/g,'、')
    .trim();
  return value;
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
  activeUtterance=null;
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

function splitForSpeech(text:string,maxLength=150){
  const clean=normalizeSpeech(text);
  if(clean.length<=maxLength)return clean?[clean]:[];
  const parts=clean.split(/(?<=[。！？!?、,])\s*/).filter(Boolean);
  const chunks:string[]=[];
  let current='';
  for(const part of parts){
    if(current&&current.length+part.length>maxLength){
      chunks.push(current);
      current='';
    }
    if(part.length>maxLength){
      if(current){chunks.push(current);current=''}
      for(let index=0;index<part.length;index+=maxLength)chunks.push(part.slice(index,index+maxLength));
    }else current+=part;
  }
  if(current)chunks.push(current);
  return chunks;
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
  const clean=normalizeDisplay(text);
  const safeRate=Math.max(.5,Math.min(1.5,rate));
  const synth=speechController();
  if(!clean||!synth){
    notifyAudioError(clean,type);
    return 'unavailable';
  }

  const chunks=splitForSpeech(clean);
  if(!chunks.length)return 'unavailable';

  track('audio_play',{
    audio_type:type,
    playback_rate:safeRate,
    content_length:clean.length,
    voice_role:voiceRole,
    voice_engine:'web-speech-api-ja-JP',
    billed_api:false,
    exclusive_audio:true,
    ...meta
  });

  try{
    const voices=await loadJapaneseVoices(synth);
    if(generation!==playbackGeneration)return 'cancelled';
    const selectedVoice=pickVoice(voices,voiceRole);
    const totalChars=chunks.reduce((sum,chunk)=>sum+chunk.length,0);

    return await new Promise<PlaybackResult>(resolve=>{
      let settled=false;
      let chunkIndex=0;
      let completedChars=0;
      let started=false;

      const finish=(status:PlaybackResult)=>{
        if(settled)return;
        settled=true;
        clearProgressTimer();
        if(activeResolve===finish)activeResolve=null;
        if(status==='ended'){
          cb.onProgress?.(1);
          cb.onEnd?.();
        }
        activeUtterance=null;
        resolve(status);
      };
      activeResolve=finish;

      const speakNext=()=>{
        if(settled)return;
        if(generation!==playbackGeneration){finish('cancelled');return}
        if(chunkIndex>=chunks.length){finish('ended');return}

        const chunk=chunks[chunkIndex];
        const utterance=new SpeechSynthesisUtterance(chunk);
        activeUtterance=utterance;
        utterance.lang='ja-JP';
        utterance.rate=safeRate;
        utterance.pitch=rolePitch(voiceRole);
        utterance.volume=1;
        if(selectedVoice)utterance.voice=selectedVoice;

        const estimatedMs=Math.max(900,(chunk.length*115)/safeRate);
        const startedAt=performance.now();
        clearProgressTimer();
        activeProgressTimer=window.setInterval(()=>{
          const partial=Math.min(.96,(performance.now()-startedAt)/estimatedMs);
          const ratio=(completedChars+partial*chunk.length)/totalChars;
          cb.onProgress?.(Math.min(.99,ratio));
        },100);

        utterance.onstart=()=>{
          if(started)return;
          started=true;
          cb.onStart?.();
        };
        utterance.onboundary=event=>{
          const ratio=(completedChars+Math.min(chunk.length,event.charIndex))/totalChars;
          cb.onProgress?.(Math.min(.99,ratio));
        };
        utterance.onend=()=>{
          clearProgressTimer();
          if(generation!==playbackGeneration){finish('cancelled');return}
          completedChars+=chunk.length;
          cb.onProgress?.(Math.min(.99,completedChars/totalChars));
          chunkIndex+=1;
          speakNext();
        };
        utterance.onerror=event=>{
          clearProgressTimer();
          if(generation!==playbackGeneration||event.error==='canceled'||event.error==='interrupted'){
            finish('cancelled');
            return;
          }
          trackError('audio',new Error(`browser-speech-${event.error}`));
          notifyAudioError(clean,type);
          finish('unavailable');
        };

        synth.speak(utterance);
      };

      speakNext();
    });
  }catch(error){
    if(generation!==playbackGeneration)return 'cancelled';
    trackError('audio',error);
    notifyAudioError(clean,type);
    return 'unavailable';
  }
}

export async function playDialogueTrack(
  lines:DialogueSpeechLine[],
  rate=1,
  cb:AudioCallbacks={},
  meta:Record<string,unknown>={}
):Promise<PlaybackResult>{
  stopAudio();
  const sequence=lines.filter(line=>normalizeDisplay(line.text));
  if(!sequence.length)return 'unavailable';

  track('audio_play',{
    audio_type:'conversation_full',
    playback_rate:rate,
    dual_voice:true,
    voice_engine:'web-speech-api-ja-JP',
    billed_api:false,
    ...meta
  });

  let started=false;
  for(let index=0;index<sequence.length;index+=1){
    const line=sequence[index];
    const result=await playText(
      line.text,
      rate,
      'conversation_line',
      {
        onStart:()=>{
          if(!started){started=true;cb.onStart?.()}
        },
        onProgress:ratio=>cb.onProgress?.((index+ratio)/sequence.length)
      },
      {speaker:line.speaker,line_number:index+1,dialogue_sequence:true},
      line.voiceRole||'default'
    );
    if(result!=='ended')return result;
  }

  cb.onProgress?.(1);
  cb.onEnd?.();
  return 'ended';
}
