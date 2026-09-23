# Daily event curation

Give you a review list where every newly collected event waits for your approval, plus a daily reminder so nothing sits unreviewed.

## How it will work

1. The collector keeps running once a day at 05:20 UTC (06:20 Lisbon).
2. Everything it finds lands in a review queue instead of the feed. Events already live today stay live — only new arrivals need approval.
3. You open a "Curate events" page (reachable from the top navigation, visible only to you) and see each waiting event: photo, title, date, venue, price, source link, and the labels the system guessed (activity level, intensity, group size, category).
4. For each one you can Approve (it appears in the feed), Reject (hidden, and it won't come back on the next run), or edit the title, description, category and labels before approving.
5. Bulk actions: approve all, plus filters by source and by date.
6. Approved and rejected events stay browsable in their own tabs, so you can pull an event back or hide one later.

## Reminder

- Daily email at 06:00 Lisbon, right after the collection finishes: how many events are waiting, a short list of their titles, and a link straight to the review page. No email on days with nothing new.
- In-app: a badge with the number waiting, shown next to the navigation entry, plus a banner on the review page when items are older than a day.

Sending email from your own address needs a domain you own connected to the app. If that is not set up yet, I will walk you through it when we get there; until then the in-app badge works on its own.

## Access

- You sign up in the app, then I grant your account the admin role. Only admin accounts can open the review page or change event status.
- Regular users and guests keep seeing only approved events.

## Technical notes

- `events` gains `review_status` ('pending' | 'approved' | 'rejected', default 'pending'), `reviewed_at`, `reviewed_by`. Existing rows are backfilled to 'approved'.
- New `user_roles` table with an `app_role` enum and a `has_role()` security-definer function; RLS on `events` splits public read (`review_status = 'approved'`) from admin read/update (all rows). GRANTs for anon/authenticated/service_role in the same migration.
- `scrape-events` keeps rejected `source:source_event_id` pairs in a skip set so rejections are not re-inserted, and no longer overwrites a reviewed row's editable fields.
- `src/lib/liveEvents.ts` filters `review_status = 'approved'`.
- New `src/pages/CuratePage.tsx` + route, admin-guarded; counts via a lightweight pending-count query used for the nav badge.
- New edge function `send-curation-digest`, scheduled with pg_cron at 05:35 UTC, queries pending events and enqueues the digest email through Lovable's email queue.

## Also: the Events / Interests / Community links in the top bar

Yes — hide them. None of the three currently lead anywhere on the homepage: "Events" and "Community" have no matching section at all, and "Interests" points to a section that isn't shown on this page, so all three do nothing when clicked. I'll remove them from the top bar as part of this change and leave room to bring back real links (including "Curate events" for you) once there's more to jump to.
