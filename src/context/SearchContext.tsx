import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { Event } from '@/types/event';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';
import { searchEvents } from '@/lib/search';

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  /** All events matching the current query, from the same daily-rotating set the homepage shows. */
  results: Event[];
}

const SearchContext = createContext<SearchContextValue>({
  query: '',
  setQuery: () => {},
  results: [],
});

export const useSearch = () => useContext(SearchContext);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [query, setQuery] = useState('');

  // Same deterministic per-day rotation the homepage uses, computed once.
  const events = useMemo(() => getDailyRotatingEvents(mockEvents), []);
  const results = useMemo(() => searchEvents(events, query), [events, query]);

  return (
    <SearchContext.Provider value={{ query, setQuery, results }}>
      {children}
    </SearchContext.Provider>
  );
};