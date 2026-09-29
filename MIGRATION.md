# Moving SYNC to your own Supabase project

Everything needed is in this repo. The steps below assume you have the code cloned locally and the Supabase CLI installed (`brew install supabase/tap/supabase`).

## 1. Create the project
Create a project at supabase.com (EU region). Copy the **Project URL**, **anon/publishable key**, and **project ref**.

## 2. Rebuild the database
```bash
supabase login
supabase link --project-ref <your-ref>
supabase db push          # runs every file in supabase/migrations/ (tables, roles, has_role(), RLS, grants)
```

## 3. Import your 35 events
In the Supabase SQL editor → Table editor → `events` → Import data from CSV → choose `supabase/seed/events.csv`.
Or with psql:
```bash
psql "<your-db-connection-string>" -c "\copy public.events from 'supabase/seed/events.csv' csv header"
```

## 4. Point the app at the new backend
Edit `.env`:
```
VITE_SUPABASE_URL="https://<your-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your anon key>"
VITE_SUPABASE_PROJECT_ID="<your-ref>"
```
Update `supabase/config.toml` → `project_id = "<your-ref>"`.

## 5. Remove Lovable-only code
- `src/integrations/supabase/client.ts`: remove the `brokeredPreviewStorage` import and the `storage:` line (the default browser storage is fine).
- `src/pages/Login.tsx`: replace `lovable.auth.signInWithOAuth(provider, ...)` with
  `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })`
  (use `'azure'` for Microsoft). Then delete `src/integrations/lovable/` and run `npm uninstall @lovable.dev/cloud-auth-js`.
- `vite.config.ts`: remove `lovable-tagger` if present.

## 6. Sign-in providers
Supabase → Authentication → Providers: enable Email and Google (plus Apple/Azure if wanted) with your own OAuth credentials. Add your site URL and `http://localhost:8080` under URL Configuration.

## 7. Become admin again
Sign up in the new app, then run in the SQL editor:
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'emiliexw@gmail.com'
on conflict do nothing;
```

## 8. Event collector
The collector (`supabase/functions/scrape-events/index.ts`) calls Firecrawl directly for scraping and any
OpenAI-compatible chat endpoint for labelling. It reads these secrets:

- `FIRECRAWL_API_KEY`: your key from firecrawl.dev
- `AI_API_KEY`: key for the AI service
- `AI_API_URL` (optional): defaults to Google Gemini's OpenAI-compatible endpoint; e.g. `https://api.openai.com/v1/chat/completions` for OpenAI
- `AI_MODEL` (optional): defaults to `gemini-2.5-flash`

```bash
supabase secrets set FIRECRAWL_API_KEY=... AI_API_KEY=...
supabase functions deploy scrape-events
```
Daily scheduling stays off. To re-enable later, schedule it with pg_cron in the SQL editor.

## 9. Check & host
`npm install && npm run dev`, sign in, open `/curate`, approve an event, confirm it appears in the feed. Deploy to Vercel/Netlify (build: `npm run build`, output: `dist`, add the three `VITE_` variables).
