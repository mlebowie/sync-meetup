## Plan: In-App Event Details Modal

Add a **"View more"** link beneath each event description that opens an in-app modal with full event details — keeping users inside SYNC.

### 1. New component: `src/components/EventDetailsModal.tsx`
A shadcn `Dialog` modal rendering:
- **Hero**: event image, title, category/source badges, date · time · location
- **Full description** (no line-clamp)
- **Host bio**: organizer avatar, name, rating + review count, events hosted, short bio line
- **Venue details**: address, neighborhood, a "View on map" link (placeholder)
- **Testimonials**: 2–3 recent reviews from the organizer (use existing `recentReview` + add 1–2 mocked extras)
- **Attendee list**: full `ParticipantAvatars` grid (not truncated), with familiar-faces highlight, count vs. capacity
- **CTAs (sticky footer)**: `Attend` / `Attending ✓`, `Message group` (enabled once attending), `Save to wishlist` (heart toggle)

### 2. Update `src/components/EventCard.tsx`
- Add modal open state
- Insert a small **"View more →"** text link directly under the description (`<p className="line-clamp-2">`)
- Wire it to open `EventDetailsModal`
- Pass through `onAttend`, `onOpenGroupChat`, wishlist toggle so the modal's CTAs share the card's behavior (single source of truth)

### 3. Minor data additions in `src/data/mockData.ts`
Extend `mockOrganizers` entries with an optional `testimonials: Review[]` array (2–3 each) so the modal has content. Add `Review` to `src/types/event.ts` (`author`, `rating`, `text`, `date`). Keep existing `recentReview` for backward compatibility.

### Guest mode
If `guest` prop is true, modal hides wishlist + attend (matches current card behavior) and shows a "Sign up to attend" hint instead.

### Out of scope
No routing changes, no new pages, no backend — purely presentational additions.
