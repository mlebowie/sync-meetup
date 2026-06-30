## Plan: Add "Popular & Trending" Section for One-Time Events

### Goal
Add a new homepage section titled **"Popular & Trending"** that highlights one-time, time-bound events (e.g., Portugal Tech Week) positioned directly beneath the recurring-events area (`FriendsLoveSection`). The section will be visible to both guests and logged-in users, and will include sample events in the mock data.

### Changes

#### 1. New component: `src/components/PopularTrendingSection.tsx`
- Section wrapper with teal/coral gradient background matching the app palette.
- Header with a `TrendingUp` icon, title "Popular & Trending", and subtitle explaining these are one-time events for a limited timeframe.
- Filters `mockEvents` for events where `recurrence === 'one-off'`.
- Re-anchors their dates into a realistic upcoming window (e.g., next 1–2 weeks).
- Renders cards in a 3-column responsive grid using the existing `EventCard` component.
- Accepts the same props as `FriendsLoveSection` (`onAttend`, `onParticipantClick`, `onOpenGroupChat`) plus an optional `guest` flag.
- If no one-off events exist, the section gracefully hides itself.

#### 2. Mock data expansion: `src/data/mockData.ts`
- Add 3–4 one-time events to the `mockEvents` array, each with:
  - `recurrence: 'one-off'`
  - Unique `id`, `title`, `description`, `category`, `tags`
  - Existing or new organizers from `mockOrganizers`
  - Dates in the near future (spread across ~10–14 days)
  - Example events:
    1. **Portugal Tech Week** – a multi-day tech conference / meetup crawl
    2. **Porto Street Food Festival** – a weekend food market
    3. **Open Studio Art Walk** – a single-day gallery hop
  - Each will have `currentParticipants` close to `maxParticipants` so they read as "trending / popular".

#### 3. Wiring into logged-in homepage: `src/pages/Index.tsx`
- Import `PopularTrendingSection`.
- Insert it immediately after `FriendsLoveSection` in the logged-in layout.
- Pass `handleAttend`, `handleParticipantClick`, and `handleOpenGroupChat` down as props.

#### 4. Wiring into guest homepage: `src/components/GuestLanding.tsx`
- Import `PopularTrendingSection`.
- Insert it after the stats dashboard and before the existing "Happening in Porto" grid (so guests see trending one-offs before the generic feed).
- Pass `onAttend` and `onParticipantClick` with `guest={true}`.

### Technical details
- Reuses `EventCard` exactly — no card UI changes.
- Uses the same container max-width and padding as adjacent sections (`container px-4 md:px-6`, `max-w-6xl mx-auto`).
- No new dependencies. No backend changes. No state changes outside local filtering.
- The section is self-contained: it reads from the global `mockEvents` array and computes its own date offsets, so it stays fresh regardless of how `Index.tsx` manages its event list.

### Acceptance criteria
- [ ] A "Popular & Trending" section appears on the homepage for guests and logged-in users.
- [ ] It displays one-time events only (`recurrence: 'one-off'`).
- [ ] It sits directly below the recurring-events / friends-love area.
- [ ] Each event card is fully interactive (Attend, View more, participants, etc.).
- [ ] Example events like Portugal Tech Week are visible and correctly styled.