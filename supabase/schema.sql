-- The Nihongo Vibes secure multi-user schema.
-- Client code may contain only the public project URL/publishable key. Never expose service-role secrets.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','disabled')),
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  backup jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  device_label text
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','admin'))
);

alter table public.user_profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_roles enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public,private
as $$
  select exists(
    select 1 from public.user_roles
    where user_id=auth.uid() and role='admin'
  );
$$;
revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  insert into public.user_profiles(user_id,email,display_name)
  values(new.id,coalesce(new.email,''),new.raw_user_meta_data->>'display_name')
  on conflict(user_id) do nothing;

  insert into public.user_roles(user_id,role)
  values(new.id,'student')
  on conflict(user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill Auth users that existed before this schema/trigger was installed.
insert into public.user_profiles(user_id,email,display_name,joined_at,last_active_at)
select
  id,
  coalesce(email,''),
  raw_user_meta_data->>'display_name',
  coalesce(created_at,now()),
  coalesce(last_sign_in_at,created_at,now())
from auth.users
on conflict(user_id) do nothing;

insert into public.user_roles(user_id,role)
select id,'student' from auth.users
on conflict(user_id) do nothing;

-- Students read only their own profile; admins can support all users.
drop policy if exists "profile own or admin read" on public.user_profiles;
create policy "profile own or admin read" on public.user_profiles
for select to authenticated
using (auth.uid()=user_id or private.is_admin());

drop policy if exists "profile own update" on public.user_profiles;
create policy "profile own update" on public.user_profiles
for update to authenticated
using (auth.uid()=user_id)
with check (auth.uid()=user_id);

drop policy if exists "profile own insert" on public.user_profiles;
create policy "profile own insert" on public.user_profiles
for insert to authenticated
with check (auth.uid()=user_id);

drop policy if exists "profile admin update" on public.user_profiles;
create policy "profile admin update" on public.user_profiles
for update to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke update on public.user_profiles from authenticated;
grant select,insert on public.user_profiles to authenticated;
grant update(email,display_name,last_active_at,status) on public.user_profiles to authenticated;

-- Progress is strictly per-user; admins may read it for support.
drop policy if exists "progress own or admin read" on public.user_progress;
create policy "progress own or admin read" on public.user_progress
for select to authenticated
using (auth.uid()=user_id or private.is_admin());

drop policy if exists "progress own insert" on public.user_progress;
create policy "progress own insert" on public.user_progress
for insert to authenticated
with check (auth.uid()=user_id);

drop policy if exists "progress own update" on public.user_progress;
create policy "progress own update" on public.user_progress
for update to authenticated
using (auth.uid()=user_id)
with check (auth.uid()=user_id);

grant select,insert,update on public.user_progress to authenticated;

-- Users may read their own role; admins may inspect role assignments.
drop policy if exists "role own or admin read" on public.user_roles;
create policy "role own or admin read" on public.user_roles
for select to authenticated
using (auth.uid()=user_id or private.is_admin());

grant select on public.user_roles to authenticated;
revoke insert,update,delete on public.user_roles from authenticated;

-- Admin-only status mutation. SECURITY INVOKER means RLS still applies.
create or replace function public.set_user_status(target_user_id uuid,new_status text)
returns void
language plpgsql
security invoker
set search_path=public,private
as $$
begin
  if not private.is_admin() then
    raise exception 'admin access required';
  end if;
  if new_status not in ('active','disabled') then
    raise exception 'invalid account status';
  end if;
  update public.user_profiles
  set status=new_status
  where user_id=target_user_id;
end;
$$;
revoke all on function public.set_user_status(uuid,text) from public;
revoke all on function public.set_user_status(uuid,text) from anon;
grant execute on function public.set_user_status(uuid,text) to authenticated;

-- Intentionally no browser policy allows a user to promote themselves to admin.
-- Assign the first admin only from a trusted SQL/service-role environment:
-- update public.user_roles set role='admin' where user_id='<ADMIN_UUID>';

create or replace view public.admin_user_directory
with (security_invoker=true)
as
select
  p.user_id,
  p.email,
  p.display_name,
  p.status,
  p.joined_at,
  p.last_active_at,
  r.role,
  g.updated_at as progress_updated_at,
  case when (g.backup->>'lesson') ~ '^[0-9]+$' then (g.backup->>'lesson')::int else null end as current_lesson
from public.user_profiles p
left join public.user_roles r on r.user_id=p.user_id
left join public.user_progress g on g.user_id=p.user_id;

grant select on public.admin_user_directory to authenticated;
comment on view public.admin_user_directory is
'Admin reporting source for Google Sheets sync. Contains account metadata and progress summary, never passwords.';

drop function if exists public.handle_new_user();
drop function if exists public.is_admin();
