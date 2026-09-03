'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, DatabaseBackup, Download, Upload, X } from 'lucide-react';
import { createBackup, importBackup } from '@/lib/storage';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

export default function DataVault(){
  const {language,text}=useLanguage();
  const [open,setOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [status,setStatus]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>setMounted(true),[]);

  useEffect(()=>{
    const show=()=>{
      // Close drawer/search overlays first so only one modal layer is active.
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      setStatus('');
      requestAnimationFrame(()=>setOpen(true));
    };
    window.addEventListener('n5-open-vault',show);
    return()=>window.removeEventListener('n5-open-vault',show);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const prev=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    document.documentElement.classList.add('overlay-open');
    document.body.classList.add('overlay-open');
    requestAnimationFrame(()=>closeRef.current?.focus());
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    window.addEventListener('keydown',onKey);
    return()=>{
      window.removeEventListener('keydown',onKey);
      document.body.style.overflow=previousOverflow;
      document.documentElement.classList.remove('overlay-open');
      document.body.classList.remove('overlay-open');
      prev?.focus?.();
    };
  },[open]);

  const download=()=>{
    const data=createBackup();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`the-nihongo-vibes-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
    URL.revokeObjectURL(url);
    setStatus(text('ব্যাকআপ ডাউনলোড হয়েছে।','Backup downloaded successfully.'));
    track('progress_backup',{backup_action:'export'});
  };

  const restore=async(file?:File)=>{
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      importBackup(parsed);
      track('progress_backup',{backup_action:'import'});
      setStatus(text('ব্যাকআপ রিস্টোর হয়েছে। রিলোড হচ্ছে…','Backup restored. Reloading…'));
      setTimeout(()=>location.reload(),650);
    }catch(e){
      setStatus(e instanceof Error?e.message:text('ব্যাকআপ import ব্যর্থ হয়েছে','Backup import failed'));
    }finally{
      if(fileRef.current)fileRef.current.value='';
    }
  };

  if(!mounted||!open)return null;

  const modal=<div
    className="vault-layer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="vault-title"
    style={{
      position:'fixed',inset:0,zIndex:10000,display:'grid',placeItems:'center',
      padding:'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      isolation:'isolate'
    }}
  >
    <button
      className="future-layer-backdrop"
      onClick={()=>setOpen(false)}
      aria-label={text('ব্যাকআপ সেন্টার বন্ধ করুন','Close backup center')}
      style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,background:'rgba(1,8,14,.82)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}}
    />
    <section
      className="vault-dialog"
      style={{position:'relative',zIndex:2,width:'min(620px, 100%)',maxHeight:'min(760px, calc(100dvh - 24px))',overflow:'auto',margin:0}}
    >
      <div className="vault-head">
        <div><span>{text('লোকাল ডেটা ভল্ট','LOCAL DATA VAULT')}</span><h2 id="vault-title" className={language==='bn'?'font-bn':''}>{text('অগ্রগতির ব্যাকআপ ও রিস্টোর','Backup & Restore Progress')}</h2></div>
        <button ref={closeRef} onClick={()=>setOpen(false)} aria-label={text('বন্ধ করুন','Close')}><X/></button>
      </div>
      <p className={language==='bn'?'font-bn':''}>{text('আপনার mastery, SRS, lesson এবং mock history browser-এ দ্রুত কাজ করে এবং login থাকলে account cloud backup-এর সাথে sync হয়। আলাদা JSON backup রাখলে যেকোনো সময় নিজে restore করতে পারবেন।','Your mastery, SRS, lesson and mock history work locally for speed and sync to your account backup when you are logged in. Keep a separate JSON copy whenever you want.')}</p>
      <div className="vault-actions">
        <button onClick={download}><Download/><div><b className={language==='bn'?'font-bn':''}>{text('ব্যাকআপ export করুন','Export backup')}</b><span className={language==='bn'?'font-bn':''}>{text('অগ্রগতি JSON হিসেবে সেভ করুন','Save progress as JSON')}</span></div></button>
        <button onClick={()=>fileRef.current?.click()}><Upload/><div><b className={language==='bn'?'font-bn':''}>{text('ব্যাকআপ import করুন','Import backup')}</b><span className={language==='bn'?'font-bn':''}>{text('সেভ করা JSON ফাইল রিস্টোর করুন','Restore a saved JSON file')}</span></div></button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>restore(e.target.files?.[0])}/>
      {status&&<div className="vault-status"><CheckCircle2/>{status}</div>}
      <div className="vault-note"><DatabaseBackup/><span className={language==='bn'?'font-bn':''}>{text('গতির জন্য local-first · ধারাবাহিকতার জন্য account sync · নিজের কপির জন্য JSON export।','Local-first for speed · account sync for continuity · JSON export for your own copy.')}</span></div>
    </section>
  </div>;

  return createPortal(modal,document.body);
}
