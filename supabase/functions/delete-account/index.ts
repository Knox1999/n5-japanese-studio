import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:corsHeaders});

  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return Response.json({error:'Authentication required'},{status:401,headers:corsHeaders});

  const body=await request.json().catch(()=>({})) as {confirmation?:string};
  if(body.confirmation!=='DELETE MY ACCOUNT')return Response.json({error:'Deletion confirmation is required'},{status:400,headers:corsHeaders});

  const url=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anonKey||!serviceKey)return Response.json({error:'Server configuration is incomplete'},{status:500,headers:corsHeaders});

  const userClient=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return Response.json({error:'Session is invalid or expired'},{status:401,headers:corsHeaders});

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
  if(deleteError)return Response.json({error:'Account could not be deleted'},{status:500,headers:corsHeaders});

  return Response.json({deleted:true},{headers:{...corsHeaders,'Cache-Control':'no-store'}});
});
