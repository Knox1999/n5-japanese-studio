'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CloudOff, KeyRound, Loader2, LockKeyhole, LogIn, LogOut, Mail, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react';
import PublicLanding from './PublicLanding';
import {
  accountCloudConfigured,
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
} from '@/lib/cloudProgress';
import { STUDY_STATE_EVENT } from '@/lib/storage';

type Mode='signin'|'signup'|'reset'|'recovery';
type SyncState='synced'|'syncing'|'error';
type Props={children:ReactNode};

function localE2EAuthBypass(){
  if(typeof window==='undefined')return false;
  const localHost=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1';
  return localHost&&window.localStorage.getItem('n5_e2e_bypass_auth')==='1';
}

export default function AccountGate({children}:Props){
  const [session,setSession]=useState<AccountSession|null>(null);
  const [mode,setMode]=useState<Mode>('signin');
  const [authOpen,setAuthOpen]=useState(false);
  const [recoveryToken,setRecoveryToken]=useState('');
  const [restoring,setRestoring]=useState(accountCloudConfigured);
  const [e2eBypass,setE2eBypass]=useState(false);
  const [headerTarget,setHeaderTarget]=useState<HTMLElement|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [syncState,setSyncState]=useState<SyncState>('synced');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

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
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&mode!=='recovery')setAuthOpen(false);
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
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

  if(e2eBypass||!accountCloudConfigured)return <>{children}</>;

  const recovery=mode==='recovery';
  const headerControls=session&&headerTarget?createPortal(
    <div className="account-header-actions" aria-label="Account controls">
      <button type="button" className={`account-profile-chip sync-${syncState}`} title={syncState==='error'?'Cloud sync pending':'Personal workspace'} aria-label="Account profile">
        <span className="account-profile-icons"><UserRound size={16}/>{syncState==='error'?<CloudOff size={12}/>:<ShieldCheck size={12}/>}</span>
        <span>{session.user.displayName||session.user.email}</span>
      </button>
      <button type="button" className="account-header-logout" onClick={()=>void logout()} disabled={submitting} aria-label="Logout">
        {submitting?<Loader2 className="animate-spin" size={16}/>:<LogOut size={16}/>}<span>Logout</span>
      </button>
    </div>,
    headerTarget
  ):null;

  const authModal=authOpen&&<div className="account-modal-layer" role="dialog" aria-modal="true" aria-labelledby="account-title">
    <button className="account-modal-backdrop" type="button" onClick={()=>{if(!recovery)setAuthOpen(false)}} aria-label="Account overlay"/>
    <section className="account-gate">
      <section className="account-card">
        {!recovery&&<button className="account-modal-close" type="button" onClick={()=>setAuthOpen(false)} aria-label="বন্ধ করুন"><X size={20}/></button>}
        <div className="account-brand"><span>日</span><div><small>THE NIHONGO VIBES</small><b>JLPT N5 PERSONAL STUDIO</b></div></div>
        <div className="account-copy">
          <span className="account-kicker"><LockKeyhole size={15}/> PERSONAL STUDY WORKSPACE</span>
          <h1 id="account-title" className="font-bn">{recovery?'নতুন password সেট করুন':mode==='signup'?'নিজের learning account তৈরি করুন':'আপনার account-এ login করুন'}</h1>
          <p className="font-bn">{recovery?'Recovery link verify হয়েছে। এখন account-এর জন্য নতুন secure password দিন।':'Login করার পর Vocabulary, SRS, Listening, Grammar, Kanji, Kana এবং Mock Test সহ পুরো learning studio ব্যবহার করতে পারবেন।'}</p>
        </div>

        {!recovery&&<div className="account-tabs" role="tablist" aria-label="Account action">
          <button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setError('');setMessage('')}}><LogIn size={16}/> Login</button>
          <button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}><UserPlus size={16}/> Join</button>
        </div>}

        <form onSubmit={submit} className="account-form">
          {mode==='signup'&&<label><span className="font-bn">নাম</span><div><BookOpen size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" required placeholder="আপনার নাম"/></div></label>}
          {!recovery&&<label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></div></label>}
          {mode!=='reset'&&<label><span>{recovery?'New password':'Password'}</span><div><KeyRound size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={8} placeholder="Minimum 8 characters"/></div></label>}

          {error&&<div className="account-message error" role="alert">{error}</div>}
          {message&&<div className="account-message success" role="status">{message}</div>}

          <button className="account-submit" type="submit" disabled={submitting}>{submitting?<Loader2 className="animate-spin"/>:mode==='signup'?<UserPlus/>:mode==='reset'?<Mail/>:<LogIn/>}<span>{recovery?'নতুন password save করুন':mode==='signup'?'Account তৈরি করুন':mode==='reset'?'Reset link পাঠান':'Login করুন'}</span></button>
        </form>

        <div className="account-foot">
          {!recovery&&(mode==='reset'?<button type="button" onClick={()=>setMode('signin')}>← Login-এ ফিরে যান</button>:<button type="button" onClick={()=>setMode('reset')}>Password ভুলে গেছেন?</button>)}
          <small className="font-bn">আপনার progress, SRS, mistakes এবং mock history account workspace-এর সাথে sync থাকবে। Password admin দেখতে পাবে না।</small>
        </div>
      </section>
    </section>
  </div>;

  if(restoring){
    return <main className="boot-screen boot-screen-v2" id="main-content" aria-busy="true">
      <div className="boot-workspace-card">
        <div className="boot-brand-row"><div className="boot-seal">日</div><div><span>THE NIHONGO VIBES</span><h1 className="font-bn">আপনার account যাচাই করা হচ্ছে</h1></div></div>
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
    {children}
    {headerControls}
    {error&&<div className="account-session-warning" role="alert">{error}</div>}
    {authModal}
  </>;
}
