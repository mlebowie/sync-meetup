# Event Search: Header icon + Homefeed field

## Goal

Add event search to SYNC in two places that share the same filter logic:

1. A magnifying-glass icon in the top-right of the main navigation bar (next to Messages). Clicking it opens a search panel with a text input and live results, usable from any page.
2. A text search field at the top of the homefeed (above the "Upcoming events" filter card) that filters the event grid live as you type.

Typing in either place filters the same event data, so the two stay in sync.

## What gets built

### 1. Search utility — `src/lib/search.ts` (new)

`searchEvents(events: Event[], query: string): Event[]` — case-insensitive, accent-normalized match against:

- event title
- description
- category and tags
- location
- organizer name / type

Results are ranked: title matches first, then tags/category, then location/organizer, then description. Empty query returns all events unchanged.

### 2. Global search state — `src/context/SearchContext.tsx` (new)

- Holds `query` and `setQuery`.
- Exposes `results` = `searchEvents(getDailyRotatingEvents(mockEvents), query)` — the same daily-rotating event set the homepage already uses, so header results always match what the feed shows.
- `SearchProvider` wraps the app in `src/App.tsx` (inside the existing provider stack).

### 3. Header search — `src/components/HeaderSearch.tsx` (new) + `src/components/Header.tsx`

- Search icon button placed in the header's right-side icon group (before the Messages button).
- Clicking toggles a popover panel anchored under the header: auto-focused input with a clear (X) button, and a live list of the top ~6 matches (title, date/time, location, category chip). Empty state: "No events match …".
- Selecting a result:
  - On the homepage: applies the query (homefeed filters live) and scrolls to that event's card.
  - On any other page: navigates to `/?q=<query>`; the homepage picks up the query and scrolls to the event.
- Closes on Esc or click-outside; full-width panel on mobile.

### 4. Homefeed search field — `src/components/UpcomingEventsSection.tsx`

- A search input (with search icon + clear button) at the top of the section, above the existing filter card.
- Bound to the same global query — typing here also fills the header search on next open.
- The existing `filtered` memo additionally requires the event to match the query.
- While a query is active, the grid shows all matches (bypasses the 3-card "View more" truncation) and a "results for …" line with a clear option.

### 5. Scroll targeting — `src/components/ExpandableEventGrid.tsx`

- Each event card wrapper gets `id="event-<id>"` plus `scroll-mt-24` so the sticky header never covers a scrolled-to card. Harmless for all existing usages.

### 6. Homepage hand-off — `src/pages/Index.tsx`

- On mount, reads `?q=` from the URL and applies it to the global query (covers arriving from the header search on another page).
- After the query is applied, scrolls to the matching event card (or the Upcoming events section if no specific card is targeted).

### 7. Guest parity — `src/components/GuestLanding.tsx`

- A small search input above the "Happening in Porto" grid that filters those events with the same `searchEvents` utility, so guests get search too without signing up.

## Technical details

- No new dependencies; uses existing `lucide-react` icons (`Search`, `X`), `react-router-dom` (`useNavigate`, `useSearchParams`), and the existing `Button`, `Input` UI primitives.
- The daily-rotating event list stays deterministic (same `getDailyRotatingEvents` call) — the provider and `Index.tsx` each compute it once; values are identical per calendar day.
- Search is instant (no debounce needed at this dataset size) and composes with all existing filters (time, neighborhood, group size, age, distance, interests, inclusivity).
- No backend or schema changes; mock event data only.