# Reposition Sync: Activity-history-driven app for male expats (25-40)

This is a meaningful product pivot. The current app relies heavily on interest tags, public profiles, and one-off events. The new direction is the opposite: **what you've done** matters more than **what you say you like**, and recurring touchpoints drive friendships.

Memory updates first: target audience and product positioning rules will be saved so future sessions stay consistent (replacing the existing "gender-neutral" memory).

## 1. Repositioning (copy + framing)
- Update Hero headline, sub-copy, and footer tagline to speak directly to unmarried male expats 25-40 looking for a consistent crew, not a dating/social-tag app.
- Replace the public-facing `InterestSelector` chip section with a more motivational "Your momentum" panel (streaks, events attended this month, recurring crews you're part of).
- Remove external-facing tags/interests from `ParticipantProfileDialog`. Replace with: activity history, recurring series they show up to, and how many times you've crossed paths.

## 2. Activity history as the core signal
New `ActivityHistoryContext` (client-side, mock-backed for now) tracks per-user:
- Events attended (with date, type, recurring series id)
- "Crossed paths" counter — incremented whenever current user + another user attend the same event
- Tagged-after-event connections (see §4)

New components:
- `ActivityFeed.tsx` — chronological feed of past events with stats ("3rd time at Saturday Trail Run", "Crossed paths with Tom 4 times").
- `MomentumPanel.tsx` — streak, weekly cadence, top recurring crew.

## 3. Recurring event series + history-based recommendations
- Extend `Event` type with `seriesId`, `recurrence` ("weekly" | "biweekly" | "monthly"), and `nextOccurrence`.
- Seed `mockData.ts` with 4-5 recurring series (e.g. Saturday Trail Run, Tuesday 5-a-side, Wednesday Padel, Sunday Brunch Club) plus one-off events.
- New `RecommendedForYou` section above `Upcoming Events`, ranked by:
  1. Series user has already attended (habit reinforcement)
  2. Events featuring users you've crossed paths with most
  3. Pattern match on activity type/time-of-day from history
- The generic interest filter UI stays available but de-emphasized; recommendations come first.

## 4. Post-event reflection & connection flow
- When an event's end time has passed and the user attended, surface a `PostEventReflectionDialog`:
  - Prompt: "Who did you click with at <Event>?"
  - User taps 1-3 attendee avatars to tag them.
  - Optional one-line note per tag (private to user).
- Tags are mutual-aware: when two users tag each other, they become a "connection" (stronger than a follow) and unlock DM automatically (replaces current mutual-follow gate for tagged users).

## 5. Auto-formed groups
- New `Group` concept: when 3+ users have mutually tagged each other OR repeatedly attended the same recurring series together, a group is auto-suggested.
- New `GroupsSection.tsx` on the home page showing "Your crews" — each card lists members, the series/event that brought them together, and a group chat entry point (reuses `EventGroupChatDialog` styling).

## 6. Files

**New**
- `src/context/ActivityHistoryContext.tsx`
- `src/components/MomentumPanel.tsx`
- `src/components/ActivityFeed.tsx`
- `src/components/RecommendedForYou.tsx`
- `src/components/PostEventReflectionDialog.tsx`
- `src/components/GroupsSection.tsx`
- `src/lib/recommendations.ts` (ranking logic)
- `src/lib/groupFormation.ts` (auto-group rules)

**Edited**
- `src/types/event.ts` — add `seriesId`, `recurrence`, `pastAttendance`, `Group` type, `TaggedConnection` type
- `src/data/mockData.ts` — recurring series, past-attendance history, sample tagged connections
- `src/components/Hero.tsx` — repositioned copy
- `src/components/ParticipantProfileDialog.tsx` — drop interest tags, show activity history + crossed-paths count
- `src/context/SocialContext.tsx` — integrate tagged-connection DM unlock
- `src/pages/Index.tsx` — new section order: Hero → MomentumPanel → RecommendedForYou → ActivityFeed → GroupsSection → Upcoming Events; remove `InterestSelector`; keep `IntakeForm` collapsed/optional
- `src/components/EventCard.tsx` — show recurrence badge ("Weekly · 3rd time for you") and crossed-paths hint ("4 people you know going")
- `mem://index.md` and new `mem://project/target-audience` (overwrite) + `mem://project/positioning`

## 7. Scope notes
- All data stays client-side / mock for now (no backend schema changes). Lovable Cloud is enabled but this pivot is UI + logic; persistence can be a follow-up.
- Existing intake form, filters, group chat, DMs, and daily-rotating-events logic remain functional but are restyled/repositioned, not removed.
- No changes to auth, edge functions, or DB schema in this step.

## Open question
The current app exposes interest selection prominently. You said the new product "doesn't rely on a social profile with external-facing tags or interests." Should I:
- (a) **Remove** the interest selector + interest filters entirely, or
- (b) **Keep them private** (used only to seed recommendations on day one, never shown on profiles)?

I'll default to **(b)** unless you say otherwise — it gives the recommender something to work with before the user has history.
