'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { BookOpen, KeyRound, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import {
  accountCloudConfigured,
  ensureFreshSession,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  upsertAccountProfile,
  type AccountSession,
} from '@/lib/account';
import {
  clearLocalStudyDataForAccountSwitch,
  prepareAccountWorkspace,
  pushProgressToCloud,
} from '@/lib/cloudProgress';

type Mode='signin'|'signup'|'reset';

type Props={children:ReactNode};

export default function AccountGate({children}:Props){
  const [session,setSession]=useState<AccountSession|null>(null);
  const [mode,setMode]=useState<Mode>('signin');
  const [loading,setLoading]=useState(accountCloudConfigured);
  const [submitting,setSubmitting]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!accountCloudConfigured){setLoading(false);return;}
    let dead=false;
    (async()=>{
      const existing=await ensureFreshSession();
      if(!existing||dead){if(!dead)setLoading(false);return;}
      try{
        await upsertAccountProfile(existing);
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
    const sync=async()=>{
      if(busy)return;
      busy=true;
      try{await pushProgressToCloud('autosync')}catch{}finally{busy=false}
    };
    const timer=window.setInterval(()=>void sync(),60_000);
    const onVisibility=()=>{if(document.visibilityState==='hidden')void sync()};
    window.addEventListener('visibilitychange',onVisibility);
    return()=>{
      window.clearInterval(timer);
      window.removeEventListener('visibilitychange',onVisibility);
      void sync();
    };
  },[session]);

  if(!accountCloudConfigured)return <>{children}</>;

  const completeLogin=async(next:AccountSession)=>{
    await upsertAccountProfile(next);
    await prepareAccountWorkspace(next.user.id);
    setSession(next);
    setPassword('');
    setMessage('');
  };

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    setSubmitting(true);setError('');setMessage('');
    try{
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
    setSubmitting(true);
    try{await pushProgressToCloud('logout')}catch{}
    await signOut(session);
    clearLocalStudyDataForAccountSwitch();
    setSession(null);
    setMode('signin');
    setSubmitting(false);
  };

  if(loading)return <main className="account-boot" id="main-content" aria-busy="true"><Loader2 className="animate-spin"/><b className="font-bn">আপনার personal study workspace খুলছি…</b></main>;

  if(session){
    return <div className="account-session-shell">
      <div className="account-session-bar" role="status">
        <span><ShieldCheck size={16}/><b>{session.user.displayName||session.user.email}</b><small>Personal workspace</small></span>
        <button type="button" onClick={()=>void logout()} disabled={submitting}>Logout</button>
      </div>
      {children}
    </div>;
  }

  return <main className="account-gate" id="main-content">
    <section className="account-card" aria-labelledby="account-title">
      <div className="account-brand"><span>日</span><div><small>THE NIHONGO VIBES</small><b>JLPT N5 PERSONAL STUDIO</b></div></div>
      <div className="account-copy">
        <span className="account-kicker"><LockKeyhole size={15}/> PRIVATE STUDY ACCOUNT</span>
        <h1 id="account-title" className="font-bn">আপনার নিজের Japanese learning workspace</h1>
        <p className="font-bn">আপনার lesson progress, SRS, mistakes, Daily Coach এবং mock history শুধু আপনার account-এর সাথেই থাকবে।</p>
      </div>

      <div className="account-tabs" role="tablist" aria-label="Account action">
        <button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setError('');setMessage('')}}><LogIn size={16}/> Login</button>
        <button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}><UserPlus size={16}/> New account</button>
      </div>

      <form onSubmit={submit} className="account-form">
        {mode==='signup'&&<label><span className="font-bn">নাম</span><div><BookOpen size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" required placeholder="আপনার নাম"/></div></label>}
        <label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></div></label>
        {mode!=='reset'&&<label><span>Password</span><div><KeyRound size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'} required minLength={8} placeholder="Minimum 8 characters"/></div></label>}

        {error&&<div className="account-message error" role="alert">{error}</div>}
        {message&&<div className="account-message success" role="status">{message}</div>}

        <button className="account-submit" type="submit" disabled={submitting}>{submitting?<Loader2 className="animate-spin"/>:mode==='signup'?<UserPlus/>:mode==='reset'?<Mail/>:<LogIn/>}<span>{mode==='signup'?'Account তৈরি করুন':mode==='reset'?'Reset link পাঠান':'Login করুন'}</span></button>
      </form>

      <div className="account-foot">
        {mode==='reset'?<button type="button" onClick={()=>setMode('signin')}>← Login-এ ফিরে যান</button>:<button type="button" onClick={()=>setMode('reset')}>Password ভুলে গেছেন?</button>}
        <small className="font-bn">Password secure authentication service handle করে; admin password দেখতে পাবে না।</small>
      </div>
    </section>
  </main>;
}
