/**
 * The first chat between two new connections: conversation ideas drawn from the event where they
 * met (its interest category), and a gentle nudge to make plans within the week while it's fresh.
 */
import { format, isToday, isTomorrow } from 'date-fns';

/** One question to ask and one plan to suggest, per interest category. */
const BY_CATEGORY: Record<string, { ask: string; plan: string }> = {
  'Social networking': { ask: 'How did you find the rest of the evening?', plan: 'Fancy grabbing a coffee this week?' },
  'Professional development': { ask: 'What are you working on at the moment?', plan: 'Want to grab a coffee and swap notes this week?' },
  'Tech & AI': { ask: 'What are you building at the moment?', plan: 'Fancy a coffee to talk shop this week?' },
  'Arts & culture': { ask: 'Seen any good exhibitions in Porto lately?', plan: 'Want to check out a gallery together this weekend?' },
  'Music & live events': { ask: 'Who are you listening to at the moment?', plan: 'Fancy catching a gig together this week?' },
  Dance: { ask: 'How long have you been dancing?', plan: 'Want to go to the next social together?' },
  Sports: { ask: 'Where do you usually play in Porto?', plan: 'Up for another game this week?' },
  'Outdoors activities': { ask: 'Any favourite trails around Porto?', plan: 'Up for a walk along the Douro this weekend?' },
  'Health & wellness': { ask: 'Which studio do you usually go to?', plan: 'Want to join a class together this week?' },
  Spirituality: { ask: 'How did you find the session?', plan: 'Want to go to the next one together?' },
  Religion: { ask: 'Have you been going for long?', plan: 'Want to meet for a coffee before the next service?' },
  'Dining & cooking': { ask: 'Know any good spots we should try next?', plan: 'Fancy brunch this weekend?' },
  Games: { ask: "What's your favourite game at the moment?", plan: 'Up for a rematch this week?' },
  Languages: { ask: "How's your Portuguese coming along?", plan: 'Want to practise over a coffee this week?' },
  'Cultural exchange': { ask: 'What brought you to Porto?', plan: 'Fancy dinner somewhere local this week?' },
  Education: { ask: 'What did you take away from the session?', plan: 'Want to go to the next one together?' },
  'Charity & non-profit': { ask: 'How did you get involved?', plan: 'Want to volunteer together next time?' },
  'Pop-up events': { ask: 'Find anything good there?', plan: 'Want to check out the next one together?' },
};

const FALLBACK = BY_CATEGORY['Social networking'];

/**
 * The activity itself, read from the event title, is more specific than its category: after a run
 * club, suggest another run. First match wins, so "Saturday Trail Run" counts as a run.
 */
const ACTIVITIES: { match: RegExp; ask: string; plan: string }[] = [
  { match: /\brun(s|ning|ners)?\b|\bjog/i, ask: 'How long have you been running?', plan: 'Up for another run this week?' },
  { match: /padel|tennis|pickleball/i, ask: 'How long have you been playing?', plan: 'Up for a game this week?' },
  { match: /football|futebol|5-a-side|futsal/i, ask: 'Do you play regularly?', plan: 'Up for another game this week?' },
  { match: /volleyball|basketball/i, ask: 'Do you play regularly?', plan: 'Up for another game this week?' },
  { match: /surf/i, ask: 'How long have you been surfing?', plan: 'Up for a surf this week?' },
  { match: /climb|boulder/i, ask: 'How long have you been climbing?', plan: 'Up for a climbing session this week?' },
  { match: /cycl|bike|biking/i, ask: 'Do you ride often?', plan: 'Up for a ride this weekend?' },
  { match: /hike|hiking|trail|trek/i, ask: 'Any favourite trails around Porto?', plan: 'Up for a hike this weekend?' },
  { match: /yoga|pilates/i, ask: 'Which studio do you usually go to?', plan: 'Want to join a class together this week?' },
  { match: /salsa|bachata|kizomba|zouk|tango|swing|lindy/i, ask: 'How long have you been dancing?', plan: 'Want to go to the next social together?' },
  { match: /brunch/i, ask: 'Know any other good brunch spots?', plan: 'Fancy brunch this weekend?' },
  { match: /language|tandem|portugu/i, ask: "How's your Portuguese coming along?", plan: 'Want to practise over a coffee this week?' },
  { match: /board game|quiz|trivia|chess/i, ask: "What's your favourite game at the moment?", plan: 'Up for a rematch this week?' },
];

const activityFor = (title: string) => ACTIVITIES.find(a => a.match.test(title)) ?? null;

export interface PlanCandidate {
  id: string;
  title: string;
  category: string;
  date: Date;
  seriesId?: string;
}

/**
 * Up to two events to suggest going to together: first the next date of the same series, or else the
 * next event of the same activity (another run after a run club), then another event in the same
 * category. Only events still ahead, never the one where you met.
 */
export const planEvents = <E extends PlanCandidate>(
  events: E[],
  met: { eventId: string; title: string; category?: string; seriesId?: string },
  now = new Date(),
): E[] => {
  const ahead = events
    .filter(e => e.id !== met.eventId && e.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const activity = activityFor(met.title);
  const same =
    (met.seriesId && ahead.find(e => e.seriesId === met.seriesId)) ||
    (activity && ahead.find(e => activity.match.test(e.title))) ||
    undefined;
  const sameCategory = ahead.find(e => e !== same && !!met.category && e.category === met.category);
  return [same, sameCategory].filter((e): e is E => !!e);
};

export interface NextEvent {
  title: string;
  date: Date;
}

/** "Want to go to Sunset Hike together? It's on Sunday 6 Dec." (today / tomorrow when close). */
export const planInvite = ({ title, date }: NextEvent) => {
  const name = title.trim().replace(/[\s!.?:]+$/, '');
  const when = isToday(date) ? 'today' : isTomorrow(date) ? 'tomorrow' : `on ${format(date, 'EEEE d MMM')}`;
  return `Want to go to ${name} together? It's ${when}.`;
};

/**
 * Ready-to-edit messages. `hello`: a greeting that names the event and a question about the same
 * activity (or, failing that, its interest category). `plan`: a simple meet-up in the same vein,
 * for when there is no event to suggest.
 */
export const conversationPrompts = ({
  firstName,
  eventTitle,
  category,
}: {
  firstName: string;
  eventTitle: string;
  category?: string;
}): { hello: string[]; plan: string } => {
  const pick = activityFor(eventTitle) ?? (category && BY_CATEGORY[category]) ?? FALLBACK;
  return {
    hello: [`Hi ${firstName}, great to meet you at ${eventTitle}.`, pick.ask],
    plan: pick.plan,
  };
};

/** How long new connections have to reach out while it's fresh. */
export const REACH_OUT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days left in the week after connecting (negative once the week has passed). */
export const reachOutDaysLeft = (connectedAt: Date, now = new Date()): number =>
  REACH_OUT_DAYS - Math.floor((now.getTime() - new Date(connectedAt).getTime()) / DAY_MS);

/** Short label for the reminder: "5 days left", "Last day", or null once the week is over. */
export const daysLeftLabel = (daysLeft: number): string | null => {
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return 'Last day';
  return null;
};
