'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { BookOpen, CloudOff, KeyRound, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
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

export default function AccountGate({children}:Props){
  const [session,setSession]=useState<AccountSession|null>(null);
  const [mode,setMode]=useState<Mode>('signin');
  const [recoveryToken,setRecoveryToken]=useState('');
  const [loading,setLoading]=useState(accountCloudConfigured);
  const [submitting,setSubmitting]=useState(false);
  const [syncState,setSyncState]=useState<SyncState>('synced');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!accountCloudConfigured){setLoading(false);return;}
    const token=readRecoveryTokenFromUrl();
    if(token){setRecoveryToken(token);setMode('recovery');setLoading(false);return;}

    let dead=false;
    (async()=>{
      const existing=await ensureFreshSession();
      if(!existing||dead){if(!dead)setLoading(false);return;}
      try{
        await upsertAccountProfile(existing);
        await ensureAccountEnabled(existing);
        await prepareAccountWorkspace(existing.user.id);
        if(!dead)setSession(existing);
      }catch(err){
        if(!dead)setError(err instanceof Error?err.message:String(err));
      }finally{if(!dead)setLoading(false)}
    })();
    return()=>{dead=true};
  },[]);

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

  if(!accountCloudConfigured)return <>{children}</>;

  const completeLogin=async(next:AccountSession)=>{
    await upsertAccountProfile(next);
    await ensureAccountEnabled(next);
    await prepareAccountWorkspace(next.user.id);
    setSession(next);
    setPassword('');
    setMessage('');
    setSyncState('synced');
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
  };

  if(loading)return <main className="account-boot" id="main-content" aria-busy="true"><Loader2 className="animate-spin"/><b className="font-bn">আপনার personal study workspace খুলছি…</b></main>;

  if(session){
    return <div className="account-session-shell">
      <div className={`account-session-bar sync-${syncState}`} role="status">
        <span>{syncState==='error'?<CloudOff size={16}/>:<ShieldCheck size={16}/>}<b>{session.user.displayName||session.user.email}</b><small>{syncState==='syncing'?'Saving progress…':syncState==='error'?'Cloud sync pending':'Personal workspace · synced'}</small></span>
        <button type="button" onClick={()=>void logout()} disabled={submitting}>{submitting?'Saving…':'Logout'}</button>
      </div>
      {error&&<div className="account-session-warning" role="alert">{error}</div>}
      {children}
    </div>;
  }

  const recovery=mode==='recovery';

  return <main className="account-gate" id="main-content">
    <section className="account-card" aria-labelledby="account-title">
      <div className="account-brand"><span>日</span><div><small>THE NIHONGO VIBES</small><b>JLPT N5 PERSONAL STUDIO</b></div></div>
      <div className="account-copy">
        <span className="account-kicker"><LockKeyhole size={15}/> PRIVATE STUDY ACCOUNT</span>
        <h1 id="account-title" className="font-bn">{recovery?'নতুন password সেট করুন':'আপনার নিজের Japanese learning workspace'}</h1>
        <p className="font-bn">{recovery?'Recovery link verify হয়েছে। এখন account-এর জন্য নতুন secure password দিন।':'আপনার lesson progress, SRS, mistakes, Daily Coach এবং mock history শুধু আপনার account-এর সাথেই থাকবে।'}</p>
      </div>

      {!recovery&&<div className="account-tabs" role="tablist" aria-label="Account action">
        <button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setError('');setMessage('')}}><LogIn size={16}/> Login</button>
        <button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}><UserPlus size={16}/> New account</button>
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
        <small className="font-bn">Password secure authentication service handle করে; admin password দেখতে পাবে না।</small>
      </div>
    </section>
  </main>;
}
