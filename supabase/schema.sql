-- The Nihongo Vibes secure multi-user schema.
-- Run in a Supabase project SQL editor. Never expose the service-role key to the browser.

create extension if not exists pgcrypto;

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id=auth.uid() and role='admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Students can only read/update their own profile. Admins can support all users.
drop policy if exists "profile own or admin read" on public.user_profiles;
create policy "profile own or admin read" on public.user_profiles
for select to authenticated
using (auth.uid()=user_id or public.is_admin());

drop policy if exists "profile own update" on public.user_profiles;
create policy "profile own update" on public.user_profiles
for update to authenticated
using (auth.uid()=user_id)
with check (auth.uid()=user_id);

drop policy if exists "profile own insert" on public.user_profiles;
create policy "profile own insert" on public.user_profiles
for insert to authenticated
with check (auth.uid()=user_id);

-- Limit normal authenticated updates to harmless profile columns. Status is admin-RPC only.
revoke update on public.user_profiles from authenticated;
grant select,insert on public.user_profiles to authenticated;
grant update(email,display_name,last_active_at) on public.user_profiles to authenticated;

-- Progress is strictly per-user; admins may read it for support, but student writes remain self-only.
drop policy if exists "progress own or admin read" on public.user_progress;
create policy "progress own or admin read" on public.user_progress
for select to authenticated
using (auth.uid()=user_id or public.is_admin());

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
using (auth.uid()=user_id or public.is_admin());

grant select on public.user_roles to authenticated;
revoke insert,update,delete on public.user_roles from authenticated;

-- Admin-only account status mutation. This avoids exposing status updates to students.
create or replace function public.set_user_status(target_user_id uuid,new_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
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
grant execute on function public.set_user_status(uuid,text) to authenticated;

-- Intentionally no browser policy that lets a user promote themselves to admin.
-- Assign the first admin from the SQL editor/service-role environment only:
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
