# Teaching new users how to refine their feed

Right now onboarding interests pre-filter the home feed, but the deeper filters (group size, activity level, intensity, distance/neighborhood, age, inclusivity) sit further down the page with no explanation. New users don't know they exist or why they'd use them.

## The approach: a 3-part progressive tutorial

Nothing modal or blocking. Guidance appears where the controls are, and disappears once used.

### 1. Handoff moment (right after "Submit & enter Sync")
A dismissible banner at the top of the home feed:

> **Your feed is set to: Sports, Languages, Social networking.**
> That's your starting point. Scroll down to Upcoming events to fine-tune by vibe, group size and distance.
> [Show me how] [Got it]

"Show me how" scrolls to the filter panel and starts the coach marks.

### 2. Coach marks on the filter panel (4 steps)
A small numbered tooltip anchored to one filter group at a time, with Back / Next / Skip tour and a "2 of 4" counter. The highlighted group gets a soft ring; the rest of the page dims slightly.

```text
Step 1 - Interests + Time     "Start broad. These come from your profile - add or remove any time."
Step 2 - Group size + Activity/Intensity
                              "How do you want the room to feel? Chill coffee for 6, or a high-energy
                               group run for 30."
Step 3 - Neighborhood + Distance
                              "We show events closest to Cedofeita first. Tighten the radius for
                               things you can walk to."
Step 4 - Inclusivity          "Women-only, LGBTQI+ friendly, pet friendly - only show spaces that
                               fit you."
```

Ends with: "That's it. Change these any time - your feed updates instantly." plus a **Reset filters** hint.

### 3. Always-available help (after the tour)
- A "How filters work" link with a question-mark icon in the filter panel header, which replays the tour.
- One-line helper text under each filter group heading (permanent, plain language) so the meaning survives after the tour is gone.
- A live result counter above the grid: "Showing 12 of 40 events" plus a **Clear filters** button when the result set is small, so users never feel stuck in an empty feed.

## Supporting change: distance ordering
Events get sorted nearest-to-chosen-neighborhood first (currently distance is only a max cutoff), so the "closest first" promise in the tutorial is true.

## Technical notes
- New `FilterTour` component using the existing `Popover` primitive, anchored via refs to filter groups inside `UpcomingEventsSection.tsx`; dim overlay via a fixed backdrop with the active group elevated.
- Tour state persisted in `localStorage` (`sync.filterTour.v1`: `unseen | completed | skipped`), so it runs once per user and only for signed-in profiles - guests never see it.
- Auto-trigger: the banner shows on the first home-feed visit after onboarding; the tour itself only starts on explicit click, never on load.
- Helper text, result counter and Clear filters are presentation-only additions in `UpcomingEventsSection.tsx`.
- Sorting added to the existing `filtered` memo (sort by the current `eventDistance` value when a neighborhood is chosen).
- Mobile: coach marks render as a bottom sheet card rather than a floating tooltip, with the target scrolled into view.
