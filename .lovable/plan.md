# Move SYNC to your own backend (Option B)

## Goal
Run SYNC fully from Claude Code: your own code copy on GitHub, your own database, with no dependence on Lovable.

## Steps
1. **Export the code** — In Lovable, open the GitHub option and connect the project. Clone the repository to your computer and open it in Claude Code.
2. **Create your own backend** — Sign up for a free Supabase account and create a project (region: EU, close to Porto). Write down its URL and public key.
3. **Recreate the database structure** — I'll prepare one setup file that rebuilds everything: the events table (including review statuses), the collection-run log, user roles, the admin check, and all access rules. You run it once in your new project.
4. **Copy your data** — I'll export your 35 events as a file you can import into the new database. Accounts can't be copied with passwords, so you sign up again in the new app and then give yourself the admin role with one line (included in the file).
5. **Point the app at the new backend** — Replace the two connection values in the project settings file with the ones from step 2. Remove Lovable-only sign-in helpers and switch Google sign-in to your own backend's version.
6. **Move the event collector** — Deploy the collector to your new project and add your Firecrawl key there. It stays off until you decide to turn the daily run back on.
7. **Sign-in providers** — Set up Google (and optionally Apple/Microsoft) with your own developer credentials in the new backend.
8. **Check everything** — Sign in, open Curate events, approve one event, and confirm it shows in the feed.
9. **Hosting** — Publish the app on a host like Vercel or Netlify, then stop using the Lovable published link.

## What changes for you
- Old sign-ins won't carry over; you sign up once more.
- Daily digest email remains optional and needs your own email sender later.

## Technical details
- Deliverables I generate in the project: `supabase/migrations/0001_init.sql` (schema, enum `app_role`, `has_role()`, `update_updated_at_column()`, triggers, RLS, GRANTs), `supabase/seed/events.csv` export, and a `MIGRATION.md` with commands (`supabase link`, `supabase db push`, `supabase functions deploy scrape-events`, `supabase secrets set FIRECRAWL_API_KEY=...`).
- Code: replace `src/integrations/lovable` usage in `Login.tsx` with `supabase.auth.signInWithOAuth`; drop `previewAuthStorage` from the client; remove `LOVABLE_API_KEY`-based AI labelling in the collector or swap to your own AI key (needs a decision when you get there).
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
