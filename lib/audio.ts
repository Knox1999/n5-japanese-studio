import { track, trackError } from './analytics';
import { BASE } from './data';

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

const VOICE_DISCOVERY_TIMEOUT_MS=450;
const SPEECH_START_TIMEOUT_MS=2600;
const RETRY_SETTLE_MS=70;
const STATIC_AUDIO_START_TIMEOUT_MS=2400;

let activeUtterance:SpeechSynthesisUtterance|null=null;
let activeAudio:HTMLAudioElement|null=null;
let activeResolve:((result:PlaybackResult)=>void)|null=null;
let activeProgressTimer:number|null=null;
let activeStartTimer:number|null=null;
let activeProgressFrame:number|null=null;
let playbackGeneration=0;
let cachedJapaneseVoices:SpeechSynthesisVoice[]=[];
let voiceDiscovery:Promise<SpeechSynthesisVoice[]>|null=null;
let staticAudioHashes:Set<string>|null=null;
let staticManifestPromise:Promise<Set<string>>|null=null;

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
    if(char==='。'&&index<display.length-1)append(' ',index);
  }
  return{display,speech:speech.trim(),speechToDisplay};
}

function speechController():SpeechSynthesis|null{
  if(typeof window==='undefined'||!('speechSynthesis'in window))return null;
  return window.speechSynthesis;
}

function clearPlaybackTimers(){
  if(typeof window==='undefined')return;
  if(activeProgressTimer!==null){window.clearInterval(activeProgressTimer);activeProgressTimer=null}
  if(activeStartTimer!==null){window.clearTimeout(activeStartTimer);activeStartTimer=null}
  if(activeProgressFrame!==null){window.cancelAnimationFrame(activeProgressFrame);activeProgressFrame=null}
}

function synthesisIsBusy(synth:SpeechSynthesis){
  return Boolean(activeUtterance||synth.speaking||synth.pending||synth.paused);
}

function cancelCurrentPlayback(incrementGeneration=true){
  if(incrementGeneration)playbackGeneration+=1;
  clearPlaybackTimers();
  if(activeAudio){
    try{activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load()}catch{}
    activeAudio=null;
  }
  const synth=speechController();
  if(synth&&synthesisIsBusy(synth)){
    try{synth.cancel()}catch{}
  }
  activeUtterance=null;
  const finish=activeResolve;
  activeResolve=null;
  finish?.('cancelled');
  return synth;
}

export function stopAudio():PlaybackResult{
  cancelCurrentPlayback(true);
  return'cancelled';
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

/** Starts the only useful preload step for Web Speech: voice discovery. */
export async function prepareAudio(){
  void prepareStaticAudio();
  const synth=speechController();
  if(!synth)return[];
  const ready=japaneseVoices(synth);
  if(ready.length){cachedJapaneseVoices=ready;return ready}
  if(voiceDiscovery)return voiceDiscovery;

  voiceDiscovery=new Promise<SpeechSynthesisVoice[]>(resolve=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      synth.removeEventListener('voiceschanged',finish);
      window.clearTimeout(timeout);
      cachedJapaneseVoices=japaneseVoices(synth);
      voiceDiscovery=null;
      resolve(cachedJapaneseVoices);
    };
    const timeout=window.setTimeout(finish,VOICE_DISCOVERY_TIMEOUT_MS);
    synth.addEventListener('voiceschanged',finish,{once:true});
    synth.getVoices();
  });
  return voiceDiscovery;
}

type StaticAudioManifest={extension?:string;hashes?:string[]};

/** Preloads only the compact clip index; audio files remain demand-loaded and HTTP-cached. */
export async function prepareStaticAudio(){
  if(staticAudioHashes)return staticAudioHashes;
  if(staticManifestPromise)return staticManifestPromise;
  if(typeof window==='undefined'||typeof fetch==='undefined')return new Set<string>();
  staticManifestPromise=(async()=>{
    try{
      const response=await fetch(`${BASE}/audio/manifest.json?v=61`,{cache:'force-cache',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`static-audio-manifest-${response.status}`);
      const manifest=await response.json() as StaticAudioManifest;
      if(manifest.extension!=='mp3'||!Array.isArray(manifest.hashes))throw new Error('invalid-static-audio-manifest');
      staticAudioHashes=new Set(manifest.hashes);
    }catch{
      staticAudioHashes=new Set();
    }finally{
      staticManifestPromise=null;
    }
    return staticAudioHashes;
  })();
  return staticManifestPromise;
}

function hashInput(text:string,voiceRole:AudioVoiceRole){
  const clean=normalizeDisplay(text);
  return voiceRole==='default'?clean:`${voiceRole}|${clean}`;
}

export async function sha1(text:string){
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest('SHA-1',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function audioUrlForText(text:string,voiceRole:AudioVoiceRole='default'){
  const hash=await sha1(hashInput(text,voiceRole));
  return `${BASE}/audio/${hash}.mp3`;
}

const MALE_HINTS=[/keita/i,/otoya/i,/ichiro/i,/hattori/i,/naoki/i,/daichi/i,/male/i,/男性/];
const FEMALE_HINTS=[/nanami/i,/kyoko/i,/ayumi/i,/haruka/i,/aoi/i,/shiori/i,/mayu/i,/female/i,/女性/];

function voiceScore(voice:SpeechSynthesisVoice,role:AudioVoiceRole){
  const label=`${voice.name} ${voice.voiceURI}`;
  const hints=role==='male'?MALE_HINTS:role==='female'?FEMALE_HINTS:[];
  let score=voice.localService?200:0;
  if(hints.some(pattern=>pattern.test(label)))score+=80;
  if(voice.default)score+=24;
  if(/microsoft|apple|google/i.test(label))score+=8;
  if(/online|neural|natural/i.test(label)&&!voice.localService)score-=40;
  return score;
}

function pickVoice(voices:SpeechSynthesisVoice[],role:AudioVoiceRole){
  if(!voices.length)return undefined;
  return [...voices].sort((a,b)=>voiceScore(b,role)-voiceScore(a,role))[0];
}

function rolePitch(role:AudioVoiceRole){
  if(role==='male')return .94;
  if(role==='female')return 1.04;
  return 1;
}

function splitSpeech(text:string,maxLength=130):SpeechChunk[]{
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

function delay(ms:number){
  return new Promise<void>(resolve=>window.setTimeout(resolve,ms));
}

async function tryStaticAudio(
  prepared:PreparedSpeech,
  rate:number,
  type:string,
  cb:AudioCallbacks,
  voiceRole:AudioVoiceRole,
  generation:number
):Promise<PlaybackResult>{
  const hashes=staticAudioHashes;
  if(typeof window==='undefined'||typeof Audio==='undefined'||!hashes?.size)return'unavailable';
  const hash=await sha1(hashInput(prepared.display,voiceRole));
  if(generation!==playbackGeneration)return'cancelled';
  if(!hashes.has(hash))return'unavailable';

  const url=`${BASE}/audio/${hash}.mp3`;
  const audio=new Audio(url);
  activeAudio=audio;
  audio.preload='auto';
  audio.playbackRate=rate;
  audio.volume=1;
  audio.preservesPitch=true;
  const queuedAt=performance.now();

  return await new Promise<PlaybackResult>(resolve=>{
    let settled=false;
    let started=false;
    let lastBoundary=-1;
    const finish=(status:PlaybackResult)=>{
      if(settled)return;
      settled=true;
      clearPlaybackTimers();
      if(activeAudio===audio)activeAudio=null;
      if(activeResolve===finish)activeResolve=null;
      if(status==='ended'){cb.onProgress?.(1);cb.onEnd?.()}
      resolve(status);
    };
    const unavailable=()=>{
      try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}
      finish(generation===playbackGeneration?'unavailable':'cancelled');
    };
    activeResolve=finish;

    audio.addEventListener('playing',()=>{
      if(settled||started)return;
      if(generation!==playbackGeneration||activeAudio!==audio){unavailable();return}
      started=true;
      if(activeStartTimer!==null){window.clearTimeout(activeStartTimer);activeStartTimer=null}
      cb.onStart?.();
      track('audio_start',{audio_type:type,start_latency_ms:Math.round(performance.now()-queuedAt),voice_engine:'static-neural-mp3',voice_local:false,retry_count:0});
      const tick=()=>{
        if(settled||generation!==playbackGeneration||activeAudio!==audio||audio.paused||audio.ended)return;
        const ratio=Number.isFinite(audio.duration)&&audio.duration>0?Math.min(.99,audio.currentTime/audio.duration):0;
        cb.onProgress?.(ratio);
        const charIndex=Math.min(Math.max(0,prepared.display.length-1),Math.floor(ratio*prepared.display.length));
        if(charIndex!==lastBoundary){
          lastBoundary=charIndex;
          cb.onBoundary?.({charIndex,charLength:1,totalChars:prepared.display.length,progress:ratio,name:'audio-time'});
        }
        activeProgressFrame=window.requestAnimationFrame(tick);
      };
      tick();
    },{once:true});
    audio.addEventListener('ended',()=>finish(generation===playbackGeneration?'ended':'cancelled'),{once:true});
    audio.addEventListener('error',unavailable,{once:true});
    activeStartTimer=window.setTimeout(unavailable,STATIC_AUDIO_START_TIMEOUT_MS);
    void audio.play().catch(unavailable);
  });
}

export async function playText(
  text:string,
  rate=1,
  type='sentence',
  cb:AudioCallbacks={},
  meta:Record<string,unknown>={},
  voiceRole:AudioVoiceRole='default'
):Promise<PlaybackResult>{
  const previousSynth=speechController();
  const hadActivePlayback=Boolean(previousSynth&&synthesisIsBusy(previousSynth));
  cancelCurrentPlayback(true);
  const generation=playbackGeneration;
  const prepared=prepareSpeech(text);
  const safeRate=Math.max(.5,Math.min(1.5,rate));
  if(!prepared.display||!prepared.speech){notifyAudioError(prepared.display,type);return'unavailable'}

  const chunks=splitSpeech(prepared.speech);
  if(!chunks.length)return'unavailable';

  track('audio_play',{audio_type:type,playback_rate:safeRate,content_length:prepared.display.length,voice_role:voiceRole,voice_engine:'static-neural-mp3-with-web-speech-api-ja-JP-fallback',billed_api:false,exclusive_audio:true,...meta});

  const staticResult=await tryStaticAudio(prepared,safeRate,type,cb,voiceRole,generation);
  if(staticResult!=='unavailable')return staticResult;
  if(generation!==playbackGeneration)return'cancelled';
  const synth=speechController();
  if(!synth){notifyAudioError(prepared.display,type);return'unavailable'}

  try{
    const voices=cachedJapaneseVoices.length?cachedJapaneseVoices:await prepareAudio();
    if(generation!==playbackGeneration)return'cancelled';
    const selectedVoice=pickVoice(voices,voiceRole);
    const totalSpeechChars=prepared.speech.length;
    if(hadActivePlayback)await delay(RETRY_SETTLE_MS);
    if(generation!==playbackGeneration)return'cancelled';

    return await new Promise<PlaybackResult>(resolve=>{
      let settled=false;
      let chunkIndex=0;
      let started=false;
      let attempt=0;

      const finish=(status:PlaybackResult)=>{
        if(settled)return;
        settled=true;
        clearPlaybackTimers();
        activeUtterance=null;
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
        attempt=0;

        const queueAttempt=(voice:SpeechSynthesisVoice|undefined)=>{
          if(settled||generation!==playbackGeneration){finish('cancelled');return}
          attempt+=1;
          const currentAttempt=attempt;
          const utterance=new SpeechSynthesisUtterance(chunk.text);
          activeUtterance=utterance;
          utterance.lang='ja-JP';
          utterance.rate=safeRate;
          utterance.pitch=rolePitch(voiceRole);
          utterance.volume=1;
          if(voice)utterance.voice=voice;
          const queuedAt=performance.now();

          utterance.onstart=()=>{
            if(settled||generation!==playbackGeneration||currentAttempt!==attempt)return;
            if(activeStartTimer!==null){window.clearTimeout(activeStartTimer);activeStartTimer=null}
            const startedAt=performance.now();
            const estimatedMs=Math.max(800,(chunk.text.length*105)/safeRate);
            if(!started){
              started=true;
              cb.onStart?.();
              track('audio_start',{audio_type:type,start_latency_ms:Math.round(startedAt-queuedAt),voice_local:Boolean(voice?.localService),retry_count:currentAttempt-1});
            }
            clearPlaybackTimers();
            activeProgressTimer=window.setInterval(()=>{
              const partial=Math.min(.96,(performance.now()-startedAt)/estimatedMs);
              const ratio=(chunk.speechStart+partial*chunk.text.length)/Math.max(1,totalSpeechChars);
              cb.onProgress?.(Math.min(.99,ratio));
            },120);
          };
          utterance.onboundary=event=>{
            if(settled||generation!==playbackGeneration||currentAttempt!==attempt)return;
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
            if(settled||generation!==playbackGeneration||currentAttempt!==attempt)return;
            clearPlaybackTimers();
            activeUtterance=null;
            const completed=Math.min(totalSpeechChars,chunk.speechStart+chunk.text.length);
            cb.onProgress?.(Math.min(.99,completed/Math.max(1,totalSpeechChars)));
            chunkIndex+=1;
            speakNext();
          };
          utterance.onerror=event=>{
            if(settled||generation!==playbackGeneration||currentAttempt!==attempt)return;
            if(event.error==='canceled'||event.error==='interrupted')return;
            clearPlaybackTimers();
            trackError('audio',new Error(`browser-speech-${event.error}`));
            notifyAudioError(prepared.display,type);
            finish('unavailable');
          };

          activeStartTimer=window.setTimeout(()=>{
            if(settled||generation!==playbackGeneration||currentAttempt!==attempt)return;
            try{synth.cancel()}catch{}
            activeUtterance=null;
            if(currentAttempt===1){
              window.setTimeout(()=>queueAttempt(undefined),RETRY_SETTLE_MS);
            }else{
              trackError('audio',new Error('browser-speech-start-timeout'));
              notifyAudioError(prepared.display,type);
              finish('unavailable');
            }
          },SPEECH_START_TIMEOUT_MS);

          try{if(synth.paused)synth.resume()}catch{}
          try{synth.speak(utterance)}catch(error){
            clearPlaybackTimers();
            trackError('audio',error);
            notifyAudioError(prepared.display,type);
            finish('unavailable');
          }
        };

        queueAttempt(selectedVoice);
      };

      speakNext();
    });
  }catch(error){
    if(generation!==playbackGeneration)return'cancelled';
    trackError('audio',error);
    notifyAudioError(prepared.display,type);
    return'unavailable';
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

if(typeof window!=='undefined')queueMicrotask(()=>{void prepareAudio()});
