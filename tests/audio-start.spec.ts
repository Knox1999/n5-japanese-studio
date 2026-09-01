import { expect, test } from '@playwright/test';

test('listening playback queues promptly without cancelling an idle voice engine',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');

  await page.addInitScript(()=>{
    localStorage.setItem('nv_analytics_consent_v1','declined');
    localStorage.setItem('n5_e2e_bypass_auth','1');
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/audio/manifest.json')
      ?Promise.resolve(new Response('',{status:404}))
      :originalFetch(input,init);

    const browserWindow=window as typeof window&{
      __speechStartAt?:number;
      __speechSpeakCount?:number;
      __speechCancelCount?:number;
    };
    class MockUtterance extends EventTarget{
      text:string;
      lang='';
      rate=1;
      pitch=1;
      volume=1;
      voice:SpeechSynthesisVoice|null=null;
      onstart:((event:Event)=>void)|null=null;
      onend:((event:Event)=>void)|null=null;
      onerror:((event:{error:string})=>void)|null=null;
      onboundary:((event:Event)=>void)|null=null;
      constructor(text:string){super();this.text=text}
    }

    const voice={
      default:true,
      lang:'ja-JP',
      localService:true,
      name:'Local Japanese Test Voice',
      voiceURI:'local-ja-test',
    } as SpeechSynthesisVoice;
    const events=new EventTarget();
    let current:MockUtterance|null=null;
    const synth={
      speaking:false,
      pending:false,
      paused:false,
      getVoices:()=>[voice],
      speak(utterance:MockUtterance){
        current=utterance;
        synth.pending=true;
        browserWindow.__speechSpeakCount=(browserWindow.__speechSpeakCount||0)+1;
        window.setTimeout(()=>{
          if(current!==utterance)return;
          synth.pending=false;
          synth.speaking=true;
          browserWindow.__speechStartAt=performance.now();
          utterance.onstart?.(new Event('start'));
          window.setTimeout(()=>{
            if(current!==utterance)return;
            synth.speaking=false;
            current=null;
            utterance.onend?.(new Event('end'));
          },45);
        },12);
      },
      cancel(){
        browserWindow.__speechCancelCount=(browserWindow.__speechCancelCount||0)+1;
        const cancelled=current;
        current=null;
        synth.pending=false;
        synth.speaking=false;
        cancelled?.onerror?.({error:'canceled'});
      },
      pause(){synth.paused=true},
      resume(){synth.paused=false},
      addEventListener:events.addEventListener.bind(events),
      removeEventListener:events.removeEventListener.bind(events),
      dispatchEvent:events.dispatchEvent.bind(events),
      onvoiceschanged:null,
    };

    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:MockUtterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
  });

  await page.goto('?lesson=1&view=listening');
  const clickedAt=await page.evaluate(()=>performance.now());
  await page.getByRole('button',{name:'Play'}).first().click();
  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__speechStartAt?:number}).__speechStartAt||0)).toBeGreaterThan(0);

  const result=await page.evaluate(start=>({
    latency:((window as typeof window&{__speechStartAt?:number}).__speechStartAt||0)-start,
    speaks:(window as typeof window&{__speechSpeakCount?:number}).__speechSpeakCount||0,
    cancels:(window as typeof window&{__speechCancelCount?:number}).__speechCancelCount||0,
  }),clickedAt);
  // Keep this well below the 2.6s recovery watchdog while allowing for
  // scheduling jitter on GitHub's shared browser runners.
  expect(result.latency).toBeLessThan(1500);
  expect(result.speaks).toBe(1);
  expect(result.cancels).toBe(0);
});

test('published static neural audio is preferred over browser speech',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');

  await page.addInitScript(()=>{
    localStorage.setItem('nv_analytics_consent_v1','declined');
    localStorage.setItem('n5_e2e_bypass_auth','1');
    const browserWindow=window as typeof window&{__staticPlayCount?:number;__speechSpeakCount?:number};
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      if(String(input).includes('/audio/manifest.json')){
        return Promise.resolve(new Response(JSON.stringify({extension:'mp3',hashes:['0000000000000000000000000000000000000000']}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      return originalFetch(input,init);
    };
    Object.defineProperty(crypto.subtle,'digest',{configurable:true,value:async()=>new Uint8Array(20).buffer});

    class MockAudio extends EventTarget{
      src:string;
      preload='';playbackRate=1;volume=1;preservesPitch=true;
      currentTime=.4;duration=1;paused=false;ended=false;
      constructor(src=''){super();this.src=src}
      play(){
        browserWindow.__staticPlayCount=(browserWindow.__staticPlayCount||0)+1;
        window.setTimeout(()=>this.dispatchEvent(new Event('playing')),8);
        window.setTimeout(()=>{this.ended=true;this.dispatchEvent(new Event('ended'))},45);
        return Promise.resolve();
      }
      pause(){this.paused=true}
      load(){}
      removeAttribute(name:string){if(name==='src')this.src=''}
    }
    Object.defineProperty(window,'Audio',{configurable:true,value:MockAudio});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speaking:false,pending:false,paused:false,getVoices:()=>[],
      speak(){browserWindow.__speechSpeakCount=(browserWindow.__speechSpeakCount||0)+1},
      cancel(){},resume(){},addEventListener(){},removeEventListener(){},
    }});
  });

  await page.goto('?lesson=1&view=listening');
  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__staticPlayCount?:number}).__staticPlayCount||0)).toBe(0);
  await page.getByRole('button',{name:'Play'}).first().click();
  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__staticPlayCount?:number}).__staticPlayCount||0)).toBe(1);
  expect(await page.evaluate(()=>(window as typeof window&{__speechSpeakCount?:number}).__speechSpeakCount||0)).toBe(0);
});
