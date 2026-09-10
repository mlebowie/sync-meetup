# More Lu.ma events, plus sports, fitness, yoga and wellness

## Where events sit today

43 real Porto events are stored right now: 21 from Meetup, 19 from Eventbrite, only 3 from Lu.ma.

By interest category:

| Category | Events |
| --- | --- |
| Social networking | 7 |
| Tech & AI | 7 |
| Music & live events | 5 |
| Dining & cooking | 5 |
| Arts & theatre | 3 |
| Games | 3 |
| Education | 3 |
| Professional development | 3 |
| Cultural exchange | 3 |
| Health & fitness | 1 |
| Outdoors activities | 1 |
| Pop-up events | 1 |
| Spirituality | 1 |

Nothing at all under Sports, Languages, Religion, Charity & non-profit.
So the feed is currently heavy on tech, nightlife and networking, and almost
empty on anything active or wellness-focused.

## What to change

1. **More Lu.ma events.** Today Lu.ma is found through a single web search, which
   only surfaces a couple of calendars. Instead, read Lu.ma's Porto and Lisbon
   region pages directly and follow the recurring Porto community calendars
   (tech, wellness, creative, coworking), collecting up to ~8 Lu.ma pages per run
   instead of the current handful.

2. **Sports, fitness, yoga and wellness coverage.** Add dedicated collection
   pages aimed at active events:
   - Meetup category pages for sports & fitness and health & wellbeing in Porto
   - Eventbrite Porto category pages for "sports & fitness" and "health"
   - Keyword listing pages for yoga, running, surf, padel, hiking, pilates,
     climbing, breathwork and sound healing
   These feed the same collector, so the events land with proper SYNC filters
   (activity level, intensity, group size).

3. **Better labelling for these events.** Extend the category rules so yoga,
   pilates, breathwork, meditation, sound healing and retreats land under
   Health & fitness or Spirituality, and running, football, padel, surf,
   climbing, cycling and hiking land under Sports or Outdoors activities rather
   than falling back to Social networking.

4. **Run the collector once** after the changes and report the new distribution,
   so you can see the actual counts per category rather than a promise.

## Notes

- Only real, published events are collected — no invented ones. Exact final
  counts depend on what each site is actually listing this week.
- Existing events stay as they are; this only adds to them.

## Technical detail

- `supabase/functions/scrape-events/index.ts`: expand `SOURCE_PAGES` with the
  new Meetup/Eventbrite sports, fitness and wellness listing URLs; replace the
  single-search `lumaPages()` with a seeded list of Lu.ma Porto calendar URLs
  plus discovery, raising `MAX_PAGES_PER_SOURCE` for Lu.ma.
- Extend `CATEGORY_RULES` with wellness and sports keyword rules ahead of the
  `Social networking` fallback; keep the existing canonical label set.
- Redeploy the function and invoke it once; verify with a category/source count
  query. Frontend code is unchanged — it already renders whatever is collected.
