'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, CloudOff, DatabaseBackup, Download, KeyRound, Loader2, LockKeyhole, LogIn, LogOut, Mail, ShieldCheck, Trash2, UserPlus, UserRound, X } from 'lucide-react';
import PublicLanding from './PublicLanding';
import {
  accountCloudConfigured,
  deleteCurrentAccount,
  ensureAccountEnabled,
  ensureFreshSession,
  readRecoveryTokenFromUrl,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updateRecoveredPassword,
  upsertAccountProfile,
  type AccountSession,
} from '@/lib/account';
import {
  clearLocalStudyDataForAccountSwitch,
  prepareAccountWorkspace,
  pushProgressToCloud,
  readCloudProgress,
} from '@/lib/cloudProgress';
import { createBackup, STUDY_STATE_EVENT } from '@/lib/storage';
import { useLanguage } from '@/lib/language';

type Mode='signin'|'signup'|'reset'|'recovery';
type SyncState='synced'|'syncing'|'error';
const StudioApp=dynamic(()=>import('./StudioApp'),{
  ssr:false,
  loading:()=> <main className="boot-screen boot-screen-v2" id="main-content" aria-busy="true"><div className="boot-workspace-card"><Loader2 className="animate-spin"/><b>Loading personal studio…</b></div></main>,
});

function localE2EAuthBypass(){
  if(typeof window==='undefined')return false;
  const localHost=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1';
  return localHost&&window.localStorage.getItem('n5_e2e_bypass_auth')==='1';
}

export default function AccountGate(){
  const {language,setLanguage,text}=useLanguage();
  const [session,setSession]=useState<AccountSession|null>(null);
  const [mode,setMode]=useState<Mode>('signin');
  const [authOpen,setAuthOpen]=useState(false);
  const [recoveryToken,setRecoveryToken]=useState('');
  const [restoring,setRestoring]=useState(accountCloudConfigured);
  const [e2eBypass,setE2eBypass]=useState(false);
  const [headerTarget,setHeaderTarget]=useState<HTMLElement|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [syncState,setSyncState]=useState<SyncState>('synced');
  const [accountMenuOpen,setAccountMenuOpen]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const dialogRef=useRef<HTMLElement>(null);
  const firstFieldRef=useRef<HTMLInputElement>(null);
  const previousFocus=useRef<HTMLElement|null>(null);

  useEffect(()=>setMounted(true),[]);

  useEffect(()=>{
    if(localE2EAuthBypass()){
      setE2eBypass(true);
      setRestoring(false);
      return;
    }
    if(!accountCloudConfigured){
      setRestoring(false);
      return;
    }

    let stopped=false;
    const syncHeaderTarget=()=>{
      if(stopped)return;
      const next=document.querySelector<HTMLElement>('.future-header-tools');
      setHeaderTarget(current=>current===next?current:next);
    };
    syncHeaderTarget();
    const observer=new MutationObserver(syncHeaderTarget);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{
      stopped=true;
      observer.disconnect();
    };
  },[]);

  useEffect(()=>{
    if(e2eBypass||!accountCloudConfigured)return;
    const token=readRecoveryTokenFromUrl();
    if(token){
      setRecoveryToken(token);
      setMode('recovery');
      setAuthOpen(true);
      setRestoring(false);
      return;
    }

    let dead=false;
    setRestoring(true);
    (async()=>{
      const existing=await ensureFreshSession();
      if(!existing||dead)return;
      try{
        await upsertAccountProfile(existing);
        await ensureAccountEnabled(existing);
        await prepareAccountWorkspace(existing.user.id);
        if(!dead)setSession(existing);
      }catch(err){
        if(!dead)setError(err instanceof Error?err.message:String(err));
      }
    })().finally(()=>{if(!dead)setRestoring(false)});
    return()=>{dead=true};
  },[e2eBypass]);

  useEffect(()=>{
    if(!session)return;
    let busy=false;
    let debounce:number|undefined;
    const sync=async(label='autosync')=>{
      if(busy)return;
      busy=true;setSyncState('syncing');
      try{await pushProgressToCloud(label);setSyncState('synced')}
      catch{setSyncState('error')}
      finally{busy=false}
    };
    const schedule=()=>{
      if(debounce)window.clearTimeout(debounce);
      debounce=window.setTimeout(()=>void sync('study-change'),1400);
    };
    const timer=window.setInterval(()=>void sync('periodic'),60_000);
    const onVisibility=()=>{if(document.visibilityState==='hidden')void sync('page-hidden')};
    window.addEventListener(STUDY_STATE_EVENT,schedule);
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{
      if(debounce)window.clearTimeout(debounce);
      window.clearInterval(timer);
      window.removeEventListener(STUDY_STATE_EVENT,schedule);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[session]);

  useEffect(()=>{
    if(!authOpen)return;
    previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const inertRoots=[...document.body.children].filter(node=>!node.classList.contains('account-modal-layer')) as HTMLElement[];
    inertRoots.forEach(node=>node.setAttribute('inert',''));
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    requestAnimationFrame(()=>{
      if(firstFieldRef.current)firstFieldRef.current.focus();
      else dialogRef.current?.focus();
    });
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&mode!=='recovery')setAuthOpen(false);
      if(event.key!=='Tab'||!dialogRef.current)return;
      const focusable=[...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(node=>node.offsetParent!==null);
      if(!focusable.length){event.preventDefault();dialogRef.current.focus();return}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',onKey);
    return()=>{
      document.removeEventListener('keydown',onKey);
      inertRoots.forEach(node=>node.removeAttribute('inert'));
      document.body.style.overflow=previousOverflow;
      previousFocus.current?.focus?.({preventScroll:true});
    };
  },[authOpen,mode]);

  const openAuth=(next:Mode)=>{
    setMode(next);
    setError('');
    setMessage('');
    setAuthOpen(true);
  };

  const completeLogin=async(next:AccountSession)=>{
    await upsertAccountProfile(next);
    await ensureAccountEnabled(next);
    await prepareAccountWorkspace(next.user.id);
    setSession(next);
    setPassword('');
    setMessage('');
    setSyncState('synced');
    setAuthOpen(false);
    window.location.reload();
  };

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    setSubmitting(true);setError('');setMessage('');
    try{
      if(mode==='recovery'){
        if(!recoveryToken)throw new Error('Recovery link invalid or expired. নতুন reset link নিন।');
        await updateRecoveredPassword(recoveryToken,password);
        setRecoveryToken('');setPassword('');setMode('signin');
        setMessage('নতুন password সেট হয়েছে। এখন নতুন password দিয়ে Login করুন।');
        return;
      }
      if(mode==='reset'){
        await requestPasswordReset(email.trim());
        setMessage('Password reset link আপনার email-এ পাঠানো হয়েছে।');
        return;
      }
      if(mode==='signup'){
        const created=await signUp(email.trim(),password,displayName.trim());
        if(created){await completeLogin(created)}
        else setMessage('Account তৈরি হয়েছে। Email confirmation চালু থাকলে inbox থেকে confirm করে তারপর login করুন।');
        return;
      }
      const next=await signIn(email.trim(),password);
      await completeLogin(next);
    }catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setSubmitting(false)}
  };

  const logout=async()=>{
    if(!session)return;
    setSubmitting(true);setError('');setSyncState('syncing');
    try{
      await pushProgressToCloud('logout');
      setSyncState('synced');
    }catch{
      setSyncState('error');
      setError('Progress cloud-এ save হয়নি, তাই data রক্ষা করতে Logout থামানো হয়েছে। Internet ঠিক হলে আবার চেষ্টা করুন।');
      setSubmitting(false);
      return;
    }
    await signOut(session);
    clearLocalStudyDataForAccountSwitch();
    setSession(null);
    setMode('signin');
    setSubmitting(false);
    window.location.reload();
  };

  const exportAccountData=async()=>{
    if(!session)return;
    setSubmitting(true);setError('');
    try{
      const cloud=await readCloudProgress();
      const payload={
        exported_at:new Date().toISOString(),
        account:{id:session.user.id,email:session.user.email,displayName:session.user.displayName||null},
        cloud_updated_at:cloud?.updated_at||null,
        study_backup:cloud?.backup||createBackup(),
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
      anchor.href=url;anchor.download=`nihongo-vibes-account-${new Date().toISOString().slice(0,10)}.json`;anchor.click();
      URL.revokeObjectURL(url);setAccountMenuOpen(false);
    }catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setSubmitting(false)}
  };

  const removeAccount=async()=>{
    if(!session||!deleteConfirm)return;
    setSubmitting(true);setError('');
    try{
      await deleteCurrentAccount(session);
      clearLocalStudyDataForAccountSwitch();
      setSession(null);setAccountMenuOpen(false);setDeleteConfirm(false);
      window.location.reload();
    }catch(err){setError(err instanceof Error?err.message:String(err));setSubmitting(false)}
  };

  if(e2eBypass||!accountCloudConfigured)return <StudioApp/>;

  const recovery=mode==='recovery';
  const headerControls=session&&headerTarget?createPortal(
    <div className="account-header-actions" aria-label="Account controls">
      <div className="account-language-switch" role="group" aria-label="Language / ভাষা">
        <button type="button" aria-pressed={language==='bn'} className={language==='bn'?'active':''} onClick={()=>setLanguage('bn')}>বাংলা</button>
        <button type="button" aria-pressed={language==='en'} className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN</button>
      </div>
      <button type="button" className={`account-profile-chip sync-${syncState}`} title={syncState==='error'?'Cloud sync pending':'Personal workspace'} aria-label={text('Account menu খুলুন','Open account menu')} aria-expanded={accountMenuOpen} onClick={()=>setAccountMenuOpen(value=>!value)}>
        <span className="account-profile-icons"><UserRound size={16}/>{syncState==='error'?<CloudOff size={12}/>:<ShieldCheck size={12}/>}</span>
        <span>{session.user.displayName||session.user.email}</span>
        <ChevronDown size={14}/>
      </button>
      <button type="button" className="account-header-logout" onClick={()=>void logout()} disabled={submitting} aria-label="Logout">
        {submitting?<Loader2 className="animate-spin" size={16}/>:<LogOut size={16}/>}<span>Logout</span>
      </button>
      {accountMenuOpen&&<section className="account-profile-menu" aria-label={text('Account settings','Account settings')}>
        <header><b>{session.user.displayName||text('শিক্ষার্থী','Learner')}</b><small>{session.user.email}</small><span>{syncState==='synced'?text('Cloud progress synced','Cloud progress synced'):text('Sync অপেক্ষমাণ','Sync pending')}</span></header>
        <button type="button" onClick={()=>void exportAccountData()} disabled={submitting}><Download/>{text('আমার account data export করুন','Export my account data')}</button>
        <button type="button" onClick={()=>{window.dispatchEvent(new Event('n5-open-vault'));setAccountMenuOpen(false)}}><DatabaseBackup/>{text('Backup ও restore খুলুন','Open backup and restore')}</button>
        <a href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/privacy/`}><ShieldCheck/>{text('গোপনীয়তা নীতি','Privacy policy')}</a>
        <div className="account-delete-zone">
          {!deleteConfirm?<button type="button" onClick={()=>setDeleteConfirm(true)}><Trash2/>{text('Account মুছুন','Delete account')}</button>:<>
            <p>{text('এটি profile, cloud progress ও login স্থায়ীভাবে মুছে দেবে।','This permanently deletes your profile, cloud progress and login.')}</p>
            <button className="danger" type="button" onClick={()=>void removeAccount()} disabled={submitting}><Trash2/>{text('হ্যাঁ, স্থায়ীভাবে মুছুন','Yes, delete permanently')}</button>
            <button type="button" onClick={()=>setDeleteConfirm(false)}>{text('বাতিল','Cancel')}</button>
          </>}
        </div>
      </section>}
    </div>,
    headerTarget
  ):null;

  const authModal=mounted&&authOpen?createPortal(<div className="account-modal-layer">
    <button className="account-modal-backdrop" type="button" onClick={()=>{if(!recovery)setAuthOpen(false)}} aria-label={text('Account dialog বন্ধ করুন','Close account dialog')}/>
    <section ref={dialogRef} className="account-gate" role="dialog" aria-modal="true" aria-labelledby="account-title" tabIndex={-1}>
      <section className="account-card">
        {!recovery&&<button className="account-modal-close" type="button" onClick={()=>setAuthOpen(false)} aria-label={text('বন্ধ করুন','Close')}><X size={20}/></button>}
        <div className="account-brand"><span><Image src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo-96.png`} alt="" width={46} height={46}/></span><div><small>THE NIHONGO VIBES</small><b>JLPT N5 PERSONAL STUDIO</b></div></div>
        <div className="account-copy">
          <span className="account-kicker"><LockKeyhole size={15}/> PERSONAL STUDY WORKSPACE</span>
          <h1 id="account-title" className={language==='bn'?'font-bn':''}>{recovery?text('নতুন password সেট করুন','Set a new password'):mode==='signup'?text('নিজের learning account তৈরি করুন','Create your learning account'):text('আপনার account-এ login করুন','Log in to your account')}</h1>
          <p className={language==='bn'?'font-bn':''}>{recovery?text('Recovery link verify হয়েছে। এখন account-এর জন্য নতুন secure password দিন।','Your recovery link is verified. Choose a new secure password.'):text('Login করার পর Vocabulary, SRS, Listening, Grammar, Kanji, Kana এবং Mock Test সহ পুরো learning studio ব্যবহার করতে পারবেন।','Log in to use the complete studio, including vocabulary, recall, listening, grammar, kanji, kana and mock tests.')}</p>
        </div>

        {!recovery&&<div className="account-tabs" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={mode==='signin'} className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setError('');setMessage('')}}><LogIn size={16}/> {text('লগইন','Login')}</button>
          <button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}><UserPlus size={16}/> {text('নতুন account','Join')}</button>
        </div>}

        <form onSubmit={submit} className="account-form">
          {mode==='signup'&&<label><span className={language==='bn'?'font-bn':''}>{text('নাম','Name')}</span><div><BookOpen size={17}/><input ref={firstFieldRef} value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" required placeholder={text('আপনার নাম','Your name')}/></div></label>}
          {!recovery&&<label><span>Email</span><div><Mail size={17}/><input ref={mode!=='signup'?firstFieldRef:undefined} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></div></label>}
          {mode!=='reset'&&<label><span>{recovery?text('নতুন password','New password'):'Password'}</span><div><KeyRound size={17}/><input ref={recovery?firstFieldRef:undefined} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={mode==='signin'?8:10} placeholder={mode==='signin'?text('আপনার password','Your password'):text('10+ অক্ষর · A-z · 0-9 · symbol','10+ chars · A-z · 0-9 · symbol')}/></div></label>}

          {error&&<div className="account-message error" role="alert">{error}</div>}
          {message&&<div className="account-message success" role="status">{message}</div>}

          <button className="account-submit" type="submit" disabled={submitting}>{submitting?<Loader2 className="animate-spin"/>:mode==='signup'?<UserPlus/>:mode==='reset'?<Mail/>:<LogIn/>}<span>{recovery?text('নতুন password save করুন','Save new password'):mode==='signup'?text('Account তৈরি করুন','Create account'):mode==='reset'?text('Reset link পাঠান','Send reset link'):text('Login করুন','Log in')}</span></button>
        </form>

        <div className="account-foot">
          {!recovery&&(mode==='reset'?<button type="button" onClick={()=>setMode('signin')}>← {text('Login-এ ফিরে যান','Back to login')}</button>:<button type="button" onClick={()=>setMode('reset')}>{text('Password ভুলে গেছেন?','Forgot password?')}</button>)}
          <small className={language==='bn'?'font-bn':''}>{text('আপনার progress, SRS, mistakes এবং mock history encrypted connection-এ account workspace-এর সাথে sync থাকবে। Password admin দেখতে পাবে না।','Your progress, recall, mistakes and mock history sync to your account over an encrypted connection. Administrators cannot see your password.')}</small>
          {mode==='signup'&&<small className="account-legal-copy">{text('Account তৈরি করলে আপনি','By creating an account you agree to the')} <a href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/terms/`}>{text('ব্যবহারের শর্ত','Terms')}</a> {text('ও','and')} <a href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/privacy/`}>{text('গোপনীয়তা নীতি','Privacy Policy')}</a> {text('মেনে নিচ্ছেন।','.')}</small>}
        </div>
      </section>
    </section>
  </div>,document.body):null;

  if(restoring){
    return <main className="boot-screen boot-screen-v2" id="main-content" aria-busy="true">
      <div className="boot-workspace-card">
        <div className="boot-brand-row"><div className="boot-seal"><Image src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo-96.png`} alt="" width={40} height={40}/></div><div><span>THE NIHONGO VIBES</span><h1 className="font-bn">আপনার account যাচাই করা হচ্ছে</h1></div></div>
        <div className="boot-loading-line"><Loader2 className="animate-spin"/><span>Restoring workspace</span></div>
      </div>
      {authModal}
    </main>;
  }

  if(!session){
    return <>
      <PublicLanding onLogin={()=>openAuth('signin')} onJoin={()=>openAuth('signup')}/>
      {authModal}
    </>;
  }

  return <>
    <StudioApp/>
    {headerControls}
    {error&&<div className="account-session-warning" role="alert">{error}</div>}
    {authModal}
  </>;
}
