# Post-event recap flow: rate, tag, share photos

Extend the existing post-event reflection into a three-step recap, and let user photos take over event card banners.

## Step 1 — "Would you bring a friend?" rating

New first step in the reflection dialog:
- Prompt: "Would you bring a friend to {event} next time?"
- Answers: Definitely / Maybe / Probably not (3 tappable cards), optional one-line comment.
- Stored per event and shown as a small "friend-worthy" score badge on the event card and in the event details modal (e.g. "92% would bring a friend").

## Step 2 — Tag your top 3 connections

Keeps today's behaviour, with clearer framing:
- Grid of the event's attendees, max 3 selectable, counter shows "2 of 3".
- Tags stay private; mutual tags still unlock DMs and crews (unchanged logic).

## Step 3 — Upload an event photo

- Photo picker (camera/file), preview, optional caption, "Post photo" or "Skip".
- Uploaded photos become the event card banner: the card image turns into a swipeable/clickable carousel of user photos, falling back to the original banner when there are none.
- Each photo shows a heart with like count and the uploader's name + avatar ("by Thandiwe").
- Ordering: highest likes first (ties broken by newest). Featured photo = first slide, marked with a "Top photo" chip.
- Tapping a photo opens a lightbox with the full image, caption, owner (clickable to their profile), and like button.
- Liking is one-per-user and reflected instantly.

## Where it appears

- Auto-prompted after an attended event via the existing "Reflect" card on the homepage and the reflection toast.
- Re-openable later from the event's entry in Calendar → Last attended.
- Photo carousels visible on event cards everywhere (homefeed, recommended, popular & trending, calendar) and in the event details modal.

## Technical notes

- Rewrite `src/components/PostEventReflectionDialog.tsx` as a 3-step wizard (rate → tag → photo), keeping the current mutual-tag/DM handoff as the closing step.
- New `src/context/EventMediaContext.tsx`: per-event photo list `{ id, eventId, url, caption, ownerId, ownerName, likes, likedByMe, createdAt }` plus `addPhoto`, `toggleLike`, `photosFor(eventId)` sorted by likes. Persist to `localStorage` (same pattern as wishlist/attending contexts) so photos and likes survive reloads; images stored as data URLs from the file input — no backend needed for this prototype.
- New `src/components/EventPhotoCarousel.tsx` used by `EventCard.tsx` (and `EventDetailsModal.tsx`) in place of the static `imageUrl` when photos exist; arrows/dots for navigation, heart overlay for likes, owner credit line.
- Ratings live in a new `src/context/EventRatingContext.tsx` (or extend `ActivityHistoryContext`) with `rateEvent(eventId, value)` and a derived `friendScore(eventId)`; seed a few mock ratings so existing cards show a plausible score.
- Providers added in `src/App.tsx`; no schema/database changes.
