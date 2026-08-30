'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCcw, ShieldAlert, ShieldCheck, UserRound, Users } from 'lucide-react';
import { accountCloudConfigured } from '@/lib/account';
import { listAdminDirectory, setUserStatus, type AdminDirectoryRow } from '@/lib/admin';

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';

export default function AdminPanel(){
  const [rows,setRows]=useState<AdminDirectoryRow[]>([]);
  const [loading,setLoading]=useState(accountCloudConfigured);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState<string|null>(null);

  const load=async()=>{
    if(!accountCloudConfigured){setLoading(false);return;}
    setLoading(true);setError('');
    try{setRows(await listAdminDirectory())}
    catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setLoading(false)}
  };

  useEffect(()=>{void load()},[]);

  const shown=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return rows;
    return rows.filter(row=>[row.email,row.display_name,row.user_id,row.status,row.role].filter(Boolean).join(' ').toLowerCase().includes(q));
  },[query,rows]);

  const toggle=async(row:AdminDirectoryRow)=>{
    const next=row.status==='active'?'disabled':'active';
    setBusy(row.user_id);setError('');
    try{
      await setUserStatus(row.user_id,next);
      setRows(current=>current.map(item=>item.user_id===row.user_id?{...item,status:next}:item));
    }catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setBusy(null)}
  };

  return <main className="admin-page" id="main-content">
    <header className="admin-head">
      <a href={`${basePath}/`}><ArrowLeft/> Studio</a>
      <div><span><ShieldCheck/> ADMIN</span><h1>User control center</h1><p className="font-bn">User directory, account status এবং progress summary। Password এখানে কখনো দেখানো বা store করা হয় না।</p></div>
      <button type="button" onClick={()=>void load()} disabled={loading}><RefreshCcw/> Refresh</button>
    </header>

    {!accountCloudConfigured&&<section className="admin-state"><ShieldAlert/><h2>Cloud accounts are not configured</h2><p>Supabase public environment variables configure করার পর এই panel active হবে।</p></section>}
    {error&&<section className="admin-state error" role="alert"><ShieldAlert/><h2>Admin access unavailable</h2><p>{error}</p><small>Main site-এ admin account দিয়ে login করে আবার চেষ্টা করুন।</small></section>}

    {accountCloudConfigured&&!error&&<>
      <section className="admin-summary"><article><Users/><span>Total users</span><b>{rows.length}</b></article><article><ShieldCheck/><span>Active</span><b>{rows.filter(x=>x.status==='active').length}</b></article><article><ShieldAlert/><span>Disabled</span><b>{rows.filter(x=>x.status==='disabled').length}</b></article></section>
      <section className="admin-directory">
        <div className="admin-directory-tools"><div><Users/><h2>User directory</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search email, name or user ID" aria-label="Search users"/></div>
        <div className="admin-user-list">
          {loading?<div className="admin-state">Loading users…</div>:shown.length===0?<div className="admin-state">No users found.</div>:shown.map(row=><article key={row.user_id} className={row.status==='disabled'?'disabled':''}>
            <div className="admin-user-avatar"><UserRound/></div>
            <div className="admin-user-copy"><b>{row.display_name||'Unnamed learner'}</b><span>{row.email}</span><small>{row.user_id}</small></div>
            <div className="admin-user-meta"><span>{row.role||'student'}</span><span>L{String(row.current_lesson||1).padStart(2,'0')}</span><small>{row.progress_updated_at?new Date(row.progress_updated_at).toLocaleDateString():'No cloud progress yet'}</small></div>
            <button type="button" onClick={()=>void toggle(row)} disabled={busy===row.user_id||row.role==='admin'}>{busy===row.user_id?'Saving…':row.status==='active'?'Disable':'Enable'}</button>
          </article>)}
        </div>
      </section>
    </>}
  </main>;
}
