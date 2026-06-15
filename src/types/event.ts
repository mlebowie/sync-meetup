export type ActivityLevel = 'low' | 'moderate' | 'high';
export type Intensity = 'chill' | 'social' | 'energetic';
export type GroupSize = 'small' | 'medium' | 'large';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly' | 'one-off';

export interface PastAttendance {
  eventId: string;
  seriesId?: string;
  title: string;
  date: Date;
  category: string;
  coAttendeeIds: string[];
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  neighborhood?: string;
  preferredActivities?: string[];
  pastEvents?: string[];
  /** Past event titles / series this user reliably shows up to */
  recurringSeries?: string[];
  /** Total events attended (used to show momentum / consistency) */
  totalAttended?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  imageUrl: string;
  source: 'meetup' | 'eventbrite' | 'luma';
  activityLevel: ActivityLevel;
  intensity: Intensity;
  groupSize: GroupSize;
  maxParticipants: number;
  currentParticipants: number;
  participants: Participant[];
  category: string;
  tags: string[];
  isAttending?: boolean;
  icebreaker?: string;
  /** Recurring series identifier — events in the same series repeat. */
  seriesId?: string;
  /** How often the series repeats. */
  recurrence?: Recurrence;
}

export interface Interest {
  id: string;
  label: string;
  icon: string;
  selected?: boolean;
}

export interface FilterState {
  activityLevel: ActivityLevel[];
  intensity: Intensity[];
  groupSize: GroupSize[];
  interests: string[];
  location: string[];
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  type: 'text' | 'meme';
  timestamp: Date;
}

/** A connection a user made by tagging another attendee after an event. */
export interface TaggedConnection {
  participantId: string;
  eventId: string;
  eventTitle: string;
  note?: string;
  taggedAt: Date;
}

/** An auto-suggested crew built from repeated co-attendance or mutual tags. */
export interface Group {
  id: string;
  name: string;
  reason: string;
  memberIds: string[];
  seriesId?: string;
}
