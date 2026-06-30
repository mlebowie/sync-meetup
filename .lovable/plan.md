# Plan: Unified "Connections" Screen (Approach B)

## What gets built

A single Connections screen accessible from the Profile header, showing every person you follow or who follows you, with filter pills and search.

## Files

**New**
- `src/pages/Connections.tsx` — route `/profile/connections`. Header with back link, search input, pill filters (All / Mutual / Follows you / You follow), and a unified list of rows.

**Modified**
- `src/App.tsx` — register `/profile/connections` route.
- `src/pages/Profile.tsx` — replace nothing; add a single tappable "X Connections" link under the name (with `12 followers · 4 following` subtext) that navigates to `/profile/connections`.
- `src/context/SocialContext.tsx` — seed the default `following` set with `['1', '2', '3', '5']` so the demo has content and produces 2 mutuals against the existing `followers` set `['1','2','4','6']`.

## Connections screen behavior

- Source: union of `following` and `followers` from `SocialContext`, mapped to `mockParticipants`.
- Each row: avatar, name, neighborhood, relationship label (Mutual / Follows you / You follow), and an action button:
  - Mutual → "Following" (click to unfollow)
  - Follows you (not following back) → "Follow back"
  - You follow (no mutual) → "Following" (click to unfollow)
- Pill filters at top: **All** · **Mutual** · **Follows you** · **You follow**. Counts shown on each pill.
- Search box filters by name or neighborhood (case-insensitive).
- Sort: mutuals first, then alphabetical.
- Clicking a row's avatar/name opens the existing `ParticipantProfileDialog`.
- Empty state when filter yields zero rows.

## Profile header change

```text
[avatar]  Thandiwe Nkosi
          Cedofeita, Porto · 30 · South African
          [6 Connections]   ← tappable, navigates to /profile/connections
          (4 followers · 4 following)
```

No other Profile sections change.

## Out of scope
- Persisting follows to backend (still client-side state).
- Follow timestamps / chronological sort.
- Notifications on new follower.