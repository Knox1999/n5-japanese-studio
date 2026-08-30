# Personal Accounts + Admin Setup

The frontend account system is GitHub Pages compatible and uses Supabase Auth + PostgREST without adding a runtime dependency.

## 1. Create the Supabase project

Create a Supabase project, then open **SQL Editor** and run `supabase/schema.sql`.

This creates:

- `user_profiles` — email/name/status metadata
- `user_progress` — one private progress snapshot per user
- `user_roles` — `student` / `admin`
- RLS rules so students can only access their own data
- an admin-only reporting view for the user directory

Passwords are handled only by Supabase Auth and are never stored in application tables or Google Sheets.

## 2. Configure GitHub Pages build variables

Set these public values for the deployment build:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

The anon key is designed for browser use; security comes from Row Level Security. **Never** expose the Supabase service-role key in the frontend, repository, GitHub Pages artifact, or `NEXT_PUBLIC_*` variable.

When these variables are absent, the existing local-only experience remains active so existing users cannot be accidentally locked out.

## 3. Create the first admin

After the admin account registers, get its UUID from Supabase Auth users and run this only from the SQL editor/service-role environment:

```sql
update public.user_roles
set role='admin'
where user_id='<ADMIN_UUID>';
```

The admin panel is available at `/admin/` after deployment.

## 4. Google Sheets user directory

Use `integrations/google-sheets/UserDirectorySync.gs` in a Google Sheet Apps Script project.

In **Apps Script → Project Settings → Script Properties**, add:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key stays only in Apps Script Properties. Do not place it in a cell or client-side code.

Run `syncUserDirectory()` once to authorize it. Optionally run `installHourlyUserDirectorySync()` to refresh the sheet every hour.

The sheet contains only:

- Name
- Email
- User ID
- Joined date
- Last active
- Status
- Role
- Current lesson
- Progress update time

It intentionally contains no passwords.

## 5. Progress behavior

On a user's first account login, existing local-device progress is uploaded if that account has no cloud progress yet. If cloud progress already exists, that account's cloud state is restored before the study app mounts.

On logout, progress is synced first and local study-state keys are cleared. This prevents a second user on the same phone from seeing or overwriting the previous user's progress.

While signed in, progress is synced periodically and when the page becomes hidden.
