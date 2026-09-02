# See more events when expanding a section

Today "View more" reveals a capped batch of extra events inside a small scroll box, so most of the matching events are never reachable. The fix is progressive loading plus lighter section-level controls.

## 1. Expandable grid: load everything, in batches

Rework `ExpandableEventGrid` so it no longer caps the reveal:

- Keep the first 3 cards as the collapsed state.
- "View more results" appends the next batch (12 cards) to the same responsive grid — no separate inner scroll box, no `max-h` clipping.
- The button keeps appending until every matching event is shown, with a live count: "View more results (24 remaining)".
- Once fully expanded, show "Show less" which collapses back to 3 and scrolls to the section top.
- Newly appended cards keep the existing fade-in animation and anchor IDs so search deep-links still work.

This change flows automatically to every section that uses the grid: Upcoming events, Popular & Trending, Friends love, Personalized feed, Event grid.

## 2. Carousels for the discovery sections

For the browse-y sections (Recommended for you, Popular & Trending, Friends love), show a horizontal snap-scroll carousel by default with arrow controls, plus a "See all" toggle that switches that section into the full expandable grid. This keeps the page short while still allowing deep exploration.

## 3. Compact per-section filters

Upcoming events keeps its full filter panel. The other grid sections get a slim inline filter bar above their cards — a few pills only (time window, group size, inclusivity) — that filters just that section's list, so users can narrow results without scrolling back to the main panel.

## Technical notes

- `src/components/ExpandableEventGrid.tsx`: replace the `expanded` boolean with a `visibleCount` state (starts at `initialCount`, grows by `batchSize`, default 12), drop the `max-h-[70vh] overflow-y-auto` wrapper, render one unified grid.
- Add `src/components/EventCarousel.tsx`: snap-scrolling flex row of `EventCard`s with left/right arrow buttons, hidden scrollbar, and keyboard focus support.
- Add `src/components/SectionFilterBar.tsx`: small pill row returning a filter predicate; used by `PopularTrendingSection`, `FriendsLoveSection`, `PersonalizedFeed`.
- Wire the carousel/grid toggle in `PopularTrendingSection.tsx`, `FriendsLoveSection.tsx`, `PersonalizedFeed.tsx`; `UpcomingEventsSection.tsx` stays a grid and only gains the batching behaviour.
- No data or backend changes; all filtering stays client-side over the existing rotating event set.
