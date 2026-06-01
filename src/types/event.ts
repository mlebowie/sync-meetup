export type ActivityLevel = 'low' | 'moderate' | 'high';
export type Intensity = 'chill' | 'social' | 'energetic';
export type GroupSize = 'small' | 'medium' | 'large';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
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
