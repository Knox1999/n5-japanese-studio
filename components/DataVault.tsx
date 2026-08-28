'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, DatabaseBackup, Download, Upload, X } from 'lucide-react';
import { createBackup, importBackup } from '@/lib/storage';
import { track } from '@/lib/analytics';

export default function DataVault(){
  const [open,setOpen]=useState(false);
  const [status,setStatus]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    const show=()=>{setStatus('');setOpen(true)};
    window.addEventListener('n5-open-vault',show);
    return()=>window.removeEventListener('n5-open-vault',show);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const prev=document.activeElement as HTMLElement|null;
    requestAnimationFrame(()=>closeRef.current?.focus());
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('keydown',onKey);prev?.focus?.()};
  },[open]);

  const download=()=>{
    const data=createBackup();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`the-nihongo-vibes-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded successfully.');
    track('progress_backup',{backup_action:'export'});
  };

  const restore=async(file?:File)=>{
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      importBackup(parsed);
      track('progress_backup',{backup_action:'import'});
      setStatus('Backup restored. Reloading…');
      setTimeout(()=>location.reload(),650);
    }catch(e){
      setStatus(e instanceof Error?e.message:'Backup import failed');
    }finally{
      if(fileRef.current)fileRef.current.value='';
    }
  };

  if(!open)return null;
  return <div className="vault-layer" role="dialog" aria-modal="true" aria-labelledby="vault-title">
    <button className="future-layer-backdrop" onClick={()=>setOpen(false)} aria-label="Close backup center"/>
    <section className="vault-dialog">
      <div className="vault-head">
        <div><span>LOCAL DATA VAULT</span><h2 id="vault-title">Backup & Restore Progress</h2></div>
        <button ref={closeRef} onClick={()=>setOpen(false)} aria-label="Close"><X/></button>
      </div>
      <p className="font-bn">আপনার mastery, SRS, lesson এবং mock history এই browser-এ থাকে। JSON backup রাখলে browser data মুছে গেলেও progress ফেরত আনা যাবে।</p>
      <div className="vault-actions">
        <button onClick={download}><Download/><div><b>Export backup</b><span>Save progress as JSON</span></div></button>
        <button onClick={()=>fileRef.current?.click()}><Upload/><div><b>Import backup</b><span>Restore a saved JSON file</span></div></button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>restore(e.target.files?.[0])}/>
      {status&&<div className="vault-status"><CheckCircle2/>{status}</div>}
      <div className="vault-note"><DatabaseBackup/><span>No account required. Your study state stays in your browser unless you export it.</span></div>
    </section>
  </div>
}
