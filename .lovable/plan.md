## Group chat expiry countdown

Add a 7-day post-event expiration window to `EventGroupChatDialog.tsx`, with a persistent countdown banner at the top, an escalated warning on day 6, and a browser push notification 24 hours before expiry.

### Changes

**1. `src/components/EventGroupChatDialog.tsx`**
- Compute `expiresAt = event.date + 7 days` and `hoursRemaining` using `useState` + a 1-minute `setInterval` so the banner ticks live while open.
- Add a banner row directly under `DialogHeader` (above the Icebreaker block):
  - Before event end: hidden (chat is in pre-event mode).
  - Days 1–5 after event: muted subtext "Group chat expires in X days" with a clock icon.
  - Day 6 (≤24h remaining): amber/destructive styled banner "⏰ Chat expires in 24 hours — swap socials or start a Crew before it disappears."
  - After expiry: replace message list + composer with an empty state "This chat has ended. Tagged connections moved to your Crews."
- Disable the composer (`Input` + send/meme buttons) once expired.

**2. `src/context/SocialContext.tsx` (minimal)**
- Add a `notifiedExpiry: Set<string>` ref-style check inside the provider; when any consumer mounts and an event chat hits the 24h-remaining mark, fire a one-time `new Notification("Chat expires in 24 hours", { body: event.title })` if `Notification.permission === 'granted'`. Piggyback on existing notification permission flow used by `WishlistContext`.
- No schema/storage changes — expiration is derived from `event.date`, not persisted.

### Visual spec

```text
┌─────────────────────────────────────────┐
│ Event Title                             │
│ Group chat · 12 attendees · Mar 14      │
├─────────────────────────────────────────┤
│ 🕐 Chat expires in 3 days               │  ← days 1–5 (muted)
│ ⏰ Chat expires in 24 hours — …         │  ← day 6 (amber banner)
├─────────────────────────────────────────┤
│ ✨ Icebreaker: …                        │
└─────────────────────────────────────────┘
```

### Notes
- Pure frontend/presentation change; reuses existing `event.date`, `useSocial`, and browser Notifications API already wired in `WishlistContext`.
- No new dependencies. Uses `date-fns` (already imported) for `differenceInHours` / `formatDistanceToNowStrict`.
