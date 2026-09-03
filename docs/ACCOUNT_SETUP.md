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

## 6. AI Japanese Tutor (optional)

The grammar-explanation tutor calls a Supabase Edge Function that holds the only copy of the Anthropic API key. The key never reaches the browser, the repository, or the GitHub Pages build.

```bash
supabase functions deploy tutor
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

`supabase/schema.sql` already includes `tutor_usage` (a per-user, per-day request counter) and `increment_tutor_usage()`, which the function calls to enforce a daily cap (30 requests/user/day by default — adjust `DAILY_LIMIT` in `supabase/functions/tutor/index.ts`) before it ever calls Anthropic. If the secret is unset, or a user is signed out or over their daily cap, the "Ask AI tutor" button in Grammar surfaces an error instead of the app breaking.

## 7. Transactional email (Resend, optional)

Welcome and study-reminder emails go through a Supabase Edge Function that holds the only copy of the Resend API key — it never reaches the browser, the repository, or the GitHub Pages build.

```bash
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_...
```

`supabase/schema.sql` includes `email_usage` and `increment_email_usage()`, capping sends at 5/user/day (adjust `DAILY_LIMIT` in `supabase/functions/send-email/index.ts`). A welcome email fires automatically right after signup; a "Email me a reminder" button on the dashboard triggers the reminder template. Both always send to the signed-in user's own verified address — the function ignores any other destination.

Sign-up verification emails are handled by Supabase Auth's own confirmation flow, not by this function — reusing it avoids a second, weaker token path. To send those through Resend too, configure custom SMTP with Resend's credentials under **Supabase Dashboard → Authentication → Emails → SMTP Settings**; no code change is needed for that step.

## 8. Product analytics (PostHog, optional)

Set these public build variables to enable PostHog (usage respects the same analytics consent banner as Google Analytics — nothing is sent until a visitor accepts):

```text
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

`NEXT_PUBLIC_POSTHOG_HOST` is optional and defaults to PostHog Cloud (US). Events are sent via a plain `fetch` to PostHog's capture endpoint — no SDK bundle is added.

## 9. Error monitoring (Sentry, optional)

Set the public DSN to enable crash reporting:

```text
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<host>/<project_id>
```

A Sentry DSN's public key is designed to be shipped to the browser, so this is safe to set as a build variable. Errors are posted via a plain `fetch` to Sentry's HTTP ingest API — no SDK bundle is added. This is treated as operational monitoring (not analytics) and runs regardless of the analytics consent choice, matching this app's existing error-tracking (`trackError`) which also records errors on-device only.
