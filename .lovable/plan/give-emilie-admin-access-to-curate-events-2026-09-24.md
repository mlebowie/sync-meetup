# Give Emilie admin access to curate events

## Goal
Let Emilie sign in and use the /curate review queue as admin — approve, hide, or edit newly scraped events before they reach the feed.

## Current state (verified)
- The /curate page and the "Curate events" nav link are gated by `useAdmin()`, which checks the signed-in user's roles in the backend `user_roles` table.
- The Google/Apple/Microsoft buttons on the login page already create a real backend account and session.
- The email/password form is demo-only (local storage, no backend account) — it can never unlock admin.
- No accounts exist in the backend yet, so no one can be admin right now.

## Steps
1. **Emilie signs in once with Google** (or Apple/Microsoft) via the login page. This creates her real account in the backend.
2. **Grant the admin role**: insert a row for her user in `user_roles` with role `admin` (a database change I make once her account exists).
3. **Verify**: after signing in again, the top navigation shows "Curate events" with a badge counting events waiting for review, and /curate opens the review queue (Waiting / Published / Hidden tabs, publish, hide, edit, publish-all). Everyone without the role still sees "admin-only".

## Out of scope (unchanged)
- The demo email/password login stays as-is for now; admin access uses social sign-in.
- The daily digest email remains blocked on connecting a sender domain.

## Technical details
- `user_roles` table already exists with RLS; admins are checked via the `has_role()` security-definer function.
- Granting the role is one SQL insert scoped to Emilie's user ID — no schema changes.
- No frontend code changes needed; `useAdmin()` and the Header badge already react to the role.
