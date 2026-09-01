export type FilterTourState = 'unseen' | 'completed' | 'skipped';

const KEY = 'sync.filterTour.v1';
export const START_FILTER_TOUR_EVENT = 'sync:start-filter-tour';

export const getFilterTourState = (): FilterTourState => {
  if (typeof window === 'undefined') return 'unseen';
  const raw = window.localStorage.getItem(KEY);
  return raw === 'completed' || raw === 'skipped' ? raw : 'unseen';
};

export const setFilterTourState = (state: FilterTourState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, state);
};

export const startFilterTour = () => {
  window.dispatchEvent(new CustomEvent(START_FILTER_TOUR_EVENT));
};
