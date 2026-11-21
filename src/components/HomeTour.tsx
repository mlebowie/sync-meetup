import { useEffect, useState } from 'react';
import FilterTour, { TourStep } from './FilterTour';
import { START_FILTER_TOUR_EVENT, setFilterTourState } from '@/lib/filterTour';

/** First-run tour of the member homepage, started by "Show me" on the feed banner. */
const ALL_STEPS: TourStep[] = [
  {
    selector: '[data-tour="recommended"]',
    title: 'Recommended for you',
    body: 'Events that match your interests. The ones people you know are going to come first.',
  },
  {
    selector: '[data-tour="recommended"] [data-tour="vibe"]',
    title: 'Pick your vibe',
    body: 'Every event has a vibe label. Chill is relaxed and low-pressure, Social is built around conversation, and Lively is high energy with crowds and music. Use it to choose the kind of interaction you want.',
  },
  {
    selector: '[data-tour="happening-soon"]',
    title: 'Happening in the next 6 hours',
    body: 'Last-minute plans that start soon, for when you want to go out today.',
  },
  {
    selector: '[data-tour="popular"]',
    title: 'Popular & Trending',
    body: 'What most people are joining right now.',
  },
  {
    selector: '[role="toolbar"][aria-label="Filter your feed"]',
    title: 'Filter your feed',
    body: 'This bar stays pinned as you scroll. Tap an interest, a time or a group size to narrow every section at once.',
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
