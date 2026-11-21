import { useEffect, useState } from 'react';
import FilterTour, { TourStep } from './FilterTour';
import { START_FILTER_TOUR_EVENT, setFilterTourState } from '@/lib/filterTour';

/** First-run tour of the member homepage, started by "Show me" on the feed banner. */
const ALL_STEPS: TourStep[] = [
  {
    selector: '[data-tour="recommended"]',
    title: 'Recommended for you',
    body: 'Events that match your interests, with the ones people you know are going to first.',
  },
  {
    selector: '[data-tour="recommended"] [data-tour="vibe"]',
    title: 'Pick your vibe',
    body: 'Chill is relaxed, Social is built for chatting, and Lively is high energy. Pick the vibe that suits you.',
  },
  {
    selector: '[data-tour="happening-soon"]',
    title: 'Happening in the next 6 hours',
    body: 'Last-minute plans that start soon, for when you want to go out today.',
  },
  {
    selector: '[data-tour="popular"]',
    title: 'Popular & Trending',
    body: 'The events most people are joining right now. Grab a spot before they fill up.',
  },
  {
    selector: '[role="toolbar"][aria-label="Filter your feed"]',
    title: 'Filter your feed',
    body: 'Tap an interest, time or group size to narrow every section. It stays pinned as you scroll.',
  },
];

const HomeTour = () => {
  const [steps, setSteps] = useState<TourStep[] | null>(null);

  useEffect(() => {
    const start = () => {
      // Only include sections that are on the page right now (some hide when empty).
      const present = ALL_STEPS.filter(s => s.selector && document.querySelector(s.selector));
      if (present.length > 0) setSteps(present);
    };
    window.addEventListener(START_FILTER_TOUR_EVENT, start);
    return () => window.removeEventListener(START_FILTER_TOUR_EVENT, start);
  }, []);

  return (
    <FilterTour
      open={steps !== null}
      steps={steps ?? []}
      onClose={reason => {
        setSteps(null);
        setFilterTourState(reason);
      }}
    />
  );
};

export default HomeTour;
