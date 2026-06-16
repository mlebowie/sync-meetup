import { Event, Interest, Participant, PastAttendance } from '@/types/event';

export const mockParticipants: Participant[] = [
  { id: '1', name: 'Tom B.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', bio: 'Berlin → Porto. Trail runner, padel regular.', neighborhood: 'Cedofeita, Porto', recurringSeries: ['Saturday Trail Run', 'Wednesday Padel'], totalAttended: 22, pastEvents: ['Saturday Trail Run', 'Wednesday Padel', 'Sunday Brunch Club'] },
  { id: '2', name: 'James L.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', bio: 'Software dev, new to the city.', neighborhood: 'Bonfim, Porto', recurringSeries: ['Tuesday 5-a-side', 'Sunday Brunch Club'], totalAttended: 14, pastEvents: ['Tuesday 5-a-side', 'Sunday Brunch Club'] },
  { id: '3', name: 'Marco K.', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face', bio: 'Italian, here since 2024.', neighborhood: 'Miragaia, Porto', recurringSeries: ['Wednesday Padel'], totalAttended: 9, pastEvents: ['Wednesday Padel', 'Saturday Trail Run'] },
  { id: '4', name: 'David R.', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&crop=face', bio: 'Producer, surfs every weekend.', neighborhood: 'Foz do Douro, Porto', recurringSeries: ['Matosinhos Surf', 'Sunday Brunch Club'], totalAttended: 18, pastEvents: ['Matosinhos Surf', 'Sunday Brunch Club', 'Saturday Trail Run'] },
  { id: '5', name: 'Lucas T.', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=face', bio: 'Brazilian dev. Always down for football.', neighborhood: 'Cedofeita, Porto', recurringSeries: ['Tuesday 5-a-side'], totalAttended: 11, pastEvents: ['Tuesday 5-a-side'] },
  { id: '6', name: 'Alex P.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', bio: 'Founder, runs early, surfs late.', neighborhood: 'Boavista, Porto', recurringSeries: ['Saturday Trail Run', 'Matosinhos Surf'], totalAttended: 26, pastEvents: ['Saturday Trail Run', 'Matosinhos Surf'] },
];

export const currentUser: Participant = {
  id: 'me',
  name: 'You',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  bio: 'New in Porto, building a routine.',
  neighborhood: 'Ribeira, Porto',
  recurringSeries: ['Saturday Trail Run', 'Sunday Brunch Club'],
  totalAttended: 7,
  pastEvents: ['Saturday Trail Run', 'Sunday Brunch Club', 'Wednesday Padel'],
};

// Seeded past activity for the current user — drives the Activity Feed,
// recommendations, the map, and the "crossed paths" counters.
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const hoursAgo = (n: number) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};

// Approximate Porto coordinates for known venues
export const VENUE_COORDS: Record<string, { lat: number; lng: number; location: string }> = {
  'trail-run': { lat: 41.1695, lng: -8.6820, location: 'Parque da Cidade, Porto' },
  'brunch-club': { lat: 41.1500, lng: -8.6160, location: 'Café Candelabro, Porto' },
  'padel': { lat: 41.1580, lng: -8.6450, location: 'Padel Boavista, Porto' },
  '5aside': { lat: 41.1585, lng: -8.6400, location: 'Campo de Boavista, Porto' },
  'surf': { lat: 41.1830, lng: -8.7000, location: 'Praia de Matosinhos, Porto' },
  'founders-mixer': { lat: 41.1430, lng: -8.6200, location: 'Miragaia Rooftop, Porto' },
  'climbing': { lat: 41.1700, lng: -8.6000, location: 'Vertigo Climbing, Porto' },
  'sunset-walk': { lat: 41.1400, lng: -8.6120, location: 'Ribeira, Porto' },
};

const venue = (seriesId: keyof typeof VENUE_COORDS) => VENUE_COORDS[seriesId];

export const currentUserHistory: PastAttendance[] = [
  { eventId: 'h0', seriesId: 'trail-run', title: 'Saturday Trail Run', date: hoursAgo(14), category: 'Sports', coAttendeeIds: ['1', '4', '6'], attendeeCount: 19, ...venue('trail-run') },
  { eventId: 'h1', seriesId: 'padel', title: 'Wednesday Padel', date: daysAgo(2), category: 'Sports', coAttendeeIds: ['1', '3'], attendeeCount: 8, ...venue('padel') },
  { eventId: 'h2', seriesId: 'brunch-club', title: 'Sunday Brunch Club', date: daysAgo(6), category: 'Social', coAttendeeIds: ['2', '4'], attendeeCount: 12, ...venue('brunch-club') },
  { eventId: 'h3', seriesId: 'trail-run', title: 'Saturday Trail Run', date: daysAgo(9), category: 'Sports', coAttendeeIds: ['1', '6'], attendeeCount: 17, ...venue('trail-run') },
  { eventId: 'h4', seriesId: 'founders-mixer', title: 'Outdoor Founders Mixer', date: daysAgo(12), category: 'Networking', coAttendeeIds: ['1', '4'], attendeeCount: 24, ...venue('founders-mixer') },
  { eventId: 'h5', seriesId: 'trail-run', title: 'Saturday Trail Run', date: daysAgo(16), category: 'Sports', coAttendeeIds: ['1', '4', '6'], attendeeCount: 21, ...venue('trail-run') },
  { eventId: 'h6', seriesId: 'brunch-club', title: 'Sunday Brunch Club', date: daysAgo(13), category: 'Social', coAttendeeIds: ['2', '4'], attendeeCount: 14, ...venue('brunch-club') },
  { eventId: 'h7', seriesId: 'padel', title: 'Wednesday Padel', date: daysAgo(17), category: 'Sports', coAttendeeIds: ['1', '3'], attendeeCount: 6, ...venue('padel') },
  { eventId: 'h8', seriesId: 'sunset-walk', title: 'Douro Sunset Walk + Beers', date: daysAgo(22), category: 'Social', coAttendeeIds: ['1', '4'], attendeeCount: 11, ...venue('sunset-walk') },
  { eventId: 'h9', seriesId: 'climbing', title: 'Bouldering Night', date: daysAgo(28), category: 'Sports', coAttendeeIds: ['3'], attendeeCount: 9, ...venue('climbing') },
];

// Seed a per-participant recent history so their profile shows last attended + map
const makeHistory = (seeds: Array<{ s: keyof typeof VENUE_COORDS; title: string; cat: string; days: number; co: string[]; count: number }>): PastAttendance[] =>
  seeds.map((seed, i) => ({
    eventId: `p-${seed.s}-${i}`,
    seriesId: seed.s,
    title: seed.title,
    date: daysAgo(seed.days),
    category: seed.cat,
    coAttendeeIds: seed.co,
    attendeeCount: seed.count,
    ...VENUE_COORDS[seed.s],
  }));

// Attach to existing participants
mockParticipants[0].recentHistory = makeHistory([
  { s: 'trail-run', title: 'Saturday Trail Run', cat: 'Sports', days: 0, co: ['me', '4', '6'], count: 19 },
  { s: 'padel', title: 'Wednesday Padel', cat: 'Sports', days: 2, co: ['me', '3'], count: 8 },
  { s: 'trail-run', title: 'Saturday Trail Run', cat: 'Sports', days: 9, co: ['me', '6'], count: 17 },
  { s: 'brunch-club', title: 'Sunday Brunch Club', cat: 'Social', days: 20, co: ['2'], count: 13 },
]);
mockParticipants[1].recentHistory = makeHistory([
  { s: '5aside', title: 'Tuesday 5-a-side Football', cat: 'Sports', days: 1, co: ['4', '2'], count: 10 },
  { s: 'brunch-club', title: 'Sunday Brunch Club', cat: 'Social', days: 6, co: ['me', '4'], count: 12 },
  { s: '5aside', title: 'Tuesday 5-a-side Football', cat: 'Sports', days: 8, co: ['4'], count: 11 },
]);
mockParticipants[2].recentHistory = makeHistory([
  { s: 'padel', title: 'Wednesday Padel', cat: 'Sports', days: 2, co: ['me', '0'], count: 8 },
  { s: 'padel', title: 'Wednesday Padel', cat: 'Sports', days: 17, co: ['0'], count: 6 },
  { s: 'climbing', title: 'Bouldering Night', cat: 'Sports', days: 28, co: ['me'], count: 9 },
]);
mockParticipants[3].recentHistory = makeHistory([
  { s: 'surf', title: 'Matosinhos Surf', cat: 'Sports', days: 1, co: ['5'], count: 7 },
  { s: 'trail-run', title: 'Saturday Trail Run', cat: 'Sports', days: 0, co: ['me', '0', '5'], count: 19 },
  { s: 'brunch-club', title: 'Sunday Brunch Club', cat: 'Social', days: 6, co: ['me', '1'], count: 12 },
  { s: 'founders-mixer', title: 'Outdoor Founders Mixer', cat: 'Networking', days: 12, co: ['me', '0'], count: 24 },
]);
mockParticipants[4].recentHistory = makeHistory([
  { s: '5aside', title: 'Tuesday 5-a-side Football', cat: 'Sports', days: 1, co: ['1', '2'], count: 10 },
  { s: '5aside', title: 'Tuesday 5-a-side Football', cat: 'Sports', days: 8, co: ['1'], count: 11 },
]);
mockParticipants[5].recentHistory = makeHistory([
  { s: 'trail-run', title: 'Saturday Trail Run', cat: 'Sports', days: 0, co: ['me', '0', '3'], count: 19 },
  { s: 'surf', title: 'Matosinhos Surf', cat: 'Sports', days: 1, co: ['3'], count: 7 },
  { s: 'founders-mixer', title: 'Outdoor Founders Mixer', cat: 'Networking', days: 12, co: ['me', '0'], count: 24 },
  { s: 'trail-run', title: 'Saturday Trail Run', cat: 'Sports', days: 16, co: ['me', '0'], count: 21 },
]);

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Saturday Trail Run',
    description: 'Weekly 10km trail run along the coast — same crew most weeks. Easy, moderate, and faster pace groups, coffee after.',
    date: new Date('2026-06-06'),
    time: '8:00 AM',
    location: 'Parque da Cidade, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop',
    source: 'meetup',
    activityLevel: 'high',
    intensity: 'energetic',
    groupSize: 'medium',
    maxParticipants: 30,
    currentParticipants: 19,
    participants: [mockParticipants[0], mockParticipants[3], mockParticipants[5], mockParticipants[2]],
    category: 'Sports',
    tags: ['running', 'outdoors', 'recurring'],
    seriesId: 'trail-run',
    recurrence: 'weekly',
  },
  {
    id: '2',
    title: 'Tuesday 5-a-side Football',
    description: 'Casual 5-a-side with the same regulars every Tuesday. Mixed levels, real games, beers after.',
    date: new Date('2026-06-09'),
    time: '7:30 PM',
    location: 'Campo de Boavista, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop',
    source: 'meetup',
    activityLevel: 'high',
    intensity: 'energetic',
    groupSize: 'medium',
    maxParticipants: 12,
    currentParticipants: 9,
    participants: [mockParticipants[1], mockParticipants[4], mockParticipants[2]],
    category: 'Sports',
    tags: ['football', 'recurring'],
    seriesId: '5aside',
    recurrence: 'weekly',
  },
  {
    id: '3',
    title: 'Wednesday Padel',
    description: 'Reserved courts every Wednesday. Rotating doubles so you play with everyone — perfect for building a regular crew.',
    date: new Date('2026-06-10'),
    time: '7:00 PM',
    location: 'Padel Boavista, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?w=600&h=400&fit=crop',
    source: 'eventbrite',
    activityLevel: 'high',
    intensity: 'energetic',
    groupSize: 'small',
    maxParticipants: 8,
    currentParticipants: 6,
    participants: [mockParticipants[0], mockParticipants[2], mockParticipants[5]],
    category: 'Sports',
    tags: ['padel', 'recurring'],
    seriesId: 'padel',
    recurrence: 'weekly',
  },
  {
    id: '4',
    title: 'Sunday Brunch Club',
    description: 'Same long table every Sunday. Familiar faces, new ones too — show up enough and you have a crew.',
    date: new Date('2026-06-14'),
    time: '11:00 AM',
    location: 'Café Candelabro, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=400&fit=crop',
    source: 'luma',
    activityLevel: 'low',
    intensity: 'social',
    groupSize: 'medium',
    maxParticipants: 16,
    currentParticipants: 12,
    participants: [mockParticipants[1], mockParticipants[3], mockParticipants[0]],
    category: 'Social',
    tags: ['brunch', 'recurring'],
    seriesId: 'brunch-club',
    recurrence: 'weekly',
  },
  {
    id: '5',
    title: 'Matosinhos Surf',
    description: 'Saturday morning surf with the same Atlantic regulars. Boards available, all levels.',
    date: new Date('2026-06-13'),
    time: '7:30 AM',
    location: 'Praia de Matosinhos, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=400&fit=crop',
    source: 'meetup',
    activityLevel: 'high',
    intensity: 'energetic',
    groupSize: 'small',
    maxParticipants: 10,
    currentParticipants: 7,
    participants: [mockParticipants[3], mockParticipants[5]],
    category: 'Sports',
    tags: ['surf', 'recurring'],
    seriesId: 'surf',
    recurrence: 'weekly',
  },
  {
    id: '6',
    title: 'Outdoor Founders Mixer',
    description: 'Garden mixer for founders and operators. Drinks, real conversations, no pitch decks.',
    date: new Date('2026-06-12'),
    time: '7:00 PM',
    location: 'Miragaia Rooftop, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop',
    source: 'luma',
    activityLevel: 'low',
    intensity: 'social',
    groupSize: 'medium',
    maxParticipants: 30,
    currentParticipants: 21,
    participants: [mockParticipants[1], mockParticipants[5], mockParticipants[3]],
    category: 'Networking',
    tags: ['tech', 'founders'],
    recurrence: 'monthly',
    seriesId: 'founders-mixer',
  },
  {
    id: '7',
    title: 'Bouldering Night',
    description: 'Casual bouldering session — climb, eat, repeat. Beginners welcome.',
    date: new Date('2026-06-18'),
    time: '7:30 PM',
    location: 'Vertigo Climbing, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&h=400&fit=crop',
    source: 'eventbrite',
    activityLevel: 'high',
    intensity: 'energetic',
    groupSize: 'small',
    maxParticipants: 14,
    currentParticipants: 8,
    participants: [mockParticipants[0], mockParticipants[2], mockParticipants[4]],
    category: 'Sports',
    tags: ['climbing'],
    recurrence: 'one-off',
  },
  {
    id: '8',
    title: 'Douro Sunset Walk + Beers',
    description: 'Easy riverside walk at golden hour, ending at a cervejaria. Good way to log a chill social evening.',
    date: new Date('2026-06-11'),
    time: '7:00 PM',
    location: 'Ribeira, Porto',
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd81?w=600&h=400&fit=crop',
    source: 'meetup',
    activityLevel: 'low',
    intensity: 'chill',
    groupSize: 'medium',
    maxParticipants: 18,
    currentParticipants: 11,
    participants: [mockParticipants[0], mockParticipants[3]],
    category: 'Social',
    tags: ['walk', 'beer'],
    recurrence: 'one-off',
  },
];

export const interests: Interest[] = [
  { id: '1', label: 'Fitness', icon: '💪' },
  { id: '2', label: 'Networking', icon: '🤝' },
  { id: '3', label: 'Arts & Culture', icon: '🎨' },
  { id: '4', label: 'Outdoors', icon: '🌲' },
  { id: '5', label: 'Food & Drinks', icon: '🍷' },
  { id: '6', label: 'Music', icon: '🎵' },
  { id: '7', label: 'Languages', icon: '🗣️' },
  { id: '8', label: 'Tech', icon: '💻' },
  { id: '9', label: 'Wellness', icon: '🧘' },
  { id: '10', label: 'Photography', icon: '📷' },
  { id: '11', label: 'Travel', icon: '✈️' },
  { id: '12', label: 'Games', icon: '🎮' },
];
