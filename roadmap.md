# Roadmap

## Social sign-in buttons
- [x] Enable Google, Apple, Microsoft providers via Configure Social Login
- [x] Add Google sign-in button (Login page)
- [x] Add Apple sign-in button (Login page)
- [x] Add Microsoft sign-in button (Login page)

## Real Porto events with photos
- [x] Replace dead Unsplash URLs in `mockData.ts` (3 IDs, 4 usages)
- [x] Swap real Porto photography into signature events (Douro sunset, Matosinhos beach, Ribeira, Dom Luís bridge, Casa da Música)
- [x] Calendar "Last attended events" cards now show event photos
- [x] Demo profile calendar seeded with registered + wishlisted Porto events so Coming Up / wishlist show real content
## Event title → event preview
- [x] Clicking an event card title opens the same event preview as the "View more" button

## Attending button two-step cancel
- [x] Clicking "Attending" arms a "Cancel registration?" state; second click opens a confirmation dialog
- [x] Applies to event cards and the event preview modal

## Ratings pill → testimonials
- [x] Clicking the "% would bring a friend" pill scrolls to the testimonials section in the event modal

## Auto-open event group chat
- [x] Group chat opens automatically 10s after registering
- [x] Subtext notes the chat disappears 48 hours after the event

## Real events from Eventbrite, Meetup & Lu.ma
- [x] Firecrawl-based collector edge function (`scrape-events`)
- [x] `events` + `event_scrape_runs` tables, AI labelling of activity/intensity/group size
- [x] Daily automatic refresh (05:20 UTC), keeps yesterday's events if a refresh fails
- [x] Homefeed, search, carousels, calendar and notifications read real events
- [x] "View on Eventbrite/Meetup/Lu.ma" link in the event preview

## English-language event eligibility
- [x] Keep events conducted in English, including multilingual events that support English
- [x] Translate listing copy only when the event is confirmed to support English
- [x] Exclude Portuguese-only and ambiguous non-English events
- [ ] Refresh and verify existing upcoming events

## Daily event curation
- [x] Review state on collected events (waiting / published / hidden); feed shows published only
- [x] Admin role + `has_role` check; `/curate` review page with edit, publish, hide, publish-all, source filter
- [x] Collector never resurrects hidden events and keeps approved wording
- [x] In-app badge with the number waiting (admins only)
- [x] Removed the dead Events / Interests / Community links from the top bar
- [ ] Daily reminder email — blocked: needs a sender domain connected to the app
- [x] Grant admin role — Emilie (emiliexw@gmail.com) granted admin in user_roles

## Onboarding socialiser profiles
- [x] Compare socialiser archetypes with direct interest selection and recommend the strongest onboarding flow
- [x] Add a three-question behavioral onboarding flow with a flexible social-style result
- [x] Group interest choices by category and require 3–5 selections
- [x] Use social style to rank matching event formats before showing the personalized feed

## ⚠️ Before inviting real users: move user data from the device to Supabase
Today only events live in Supabase. Profiles, attending, wishlist, ratings, event photos and connections are saved in each person's browser, so users can't see each other and lose everything if they switch device or clear the browser.
- [ ] Profiles table in Supabase (name, photo, interests, social style) with privacy rules for who sees what (e.g. date of birth)
- [ ] Attending list in Supabase, so attendees can see who else is going
- [ ] Connections / follows in Supabase
- [ ] Wishlist, ratings and event photos in Supabase
- [ ] Replace the built-in sample people and group chats with real data
