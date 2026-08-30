import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase } from './account';

export type AdminDirectoryRow={
  user_id:string;
  email:string;
  display_name:string|null;
  status:'active'|'disabled';
  joined_at:string;
  last_active_at:string;
  role:'student'|'admin'|null;
  progress_updated_at:string|null;
  current_lesson:number|null;
};

function headers(token:string,prefer?:string){
  const out:Record<string,string>={
    apikey:getSupabaseAnonKey(),
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json',
  };
  if(prefer)out.Prefer=prefer;
  return out;
}

async function adminSession(){
  const session=await ensureFreshSession();
  if(!session)throw new Error('Admin login required.');
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(session.user.id)}&select=role&limit=1`,{
    headers:headers(session.accessToken),cache:'no-store',
  });
  if(!response.ok)throw new Error(`Role check failed (${response.status})`);
  const rows=await response.json() as {role:string}[];
  if(rows[0]?.role!=='admin')throw new Error('Admin access required.');
  return session;
}

export async function listAdminDirectory(){
  const session=await adminSession();
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/admin_user_directory?select=*&order=joined_at.desc`,{
    headers:headers(session.accessToken),cache:'no-store',
  });
  if(!response.ok)throw new Error(`User directory failed (${response.status})`);
  return await response.json() as AdminDirectoryRow[];
}

export async function setUserStatus(userId:string,status:'active'|'disabled'){
  const session=await adminSession();
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/rpc/set_user_status`,{
    method:'POST',
    headers:headers(session.accessToken,'return=minimal'),
    body:JSON.stringify({target_user_id:userId,new_status:status}),
  });
  if(!response.ok)throw new Error(`User status update failed (${response.status})`);
}
