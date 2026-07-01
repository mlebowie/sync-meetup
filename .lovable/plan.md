## Plan: Meetball-style relationship filters on Connections screen

### Goal
Replace the current "All / Mutual / Follows you / You follow" pills on `/profile/connections` with richer, activity-based relationship filters that reflect how people actually met in the app.

### Draft filter titles
| Pill | Meaning | Data source |
|---|---|---|
| **All** | Everyone in your network | Union of followers + following |
| **We Met** | Co-attended at least one event | `crossedPathsWith > 0` in ActivityHistory |
| **Tagged** | You tagged them in a post-event reflection | `tags` in ActivityHistory |
| **Tagged Me** | They tagged you back | `hasTaggedMe()` in ActivityHistory |
| **Crew** | Part of an auto-suggested crew | `suggestGroups()` output |
| **Mutual** | You follow each other | `isMutual()` in SocialContext |
| **Follows You** | They follow you, you don't follow back | `followers` minus `following` |

A user can appear under multiple pills (e.g., someone can be both "We Met" and "Mutual").

### Files to change

**`src/pages/Connections.tsx`**
- Import `useActivityHistory` and `suggestGroups`.
- Build a `relationships` map for every participant:
  - `coAttended: boolean` — `crossedPathsWith(participant.id) > 0`
  - `tagged: boolean` — user has a `TaggedConnection` for this participant
  - `taggedMe: boolean` — `hasTaggedMe(participant.id)`
  - `inCrew: boolean` — participant id exists in any `Group` from `suggestGroups`
  - `mutual`, `followsYou`, `youFollow` — existing from SocialContext
- Replace the current `FilterKey` union and `pills` array with the 7 pills above.
- Each pill shows a count of how many participants match that category.
- Filtering logic: participant must match the selected category AND the search query.
- Sort order: mutuals first, then alphabetical (unchanged).
- Row labels: keep the existing badge text (Mutual / Follows you / You follow) and add badges for the new categories when relevant, e.g. a row can show both "Mutual" and "We Met" badges.

### Out of scope
- No backend changes (still client-side mock data).
- No changes to the Profile header link.
- No changes to row click behavior or the unfollow confirm flow.

### Open question before I start
Do you want to keep the existing "Mutual / Follows you / You follow" labels inside each row's badge, or should the row badge reflect the *strongest* relationship signal (e.g., "Crew" or "We Met" takes priority over "You follow")?