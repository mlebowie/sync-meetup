import { forwardRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Search, X } from 'lucide-react';
import { useSearch } from '@/context/SearchContext';
import { startTime24 } from '@/lib/startTime';

interface Props {
  onClose: () => void;
}

/**
 * Tablets and phones: search opened from the bottom bar. A full-width field pinned just under the header,
 * with results filling the space below it (above the bottom bar), so the keyboard never hides them.
 */
const MobileSearchBar = forwardRef<HTMLInputElement, Props>(({ onClose }, inputRef) => {
  const { query, setQuery, results } = useSearch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // While open, the homepage's filter chips move below the field and are switched off (greyed out in
  // index.css; `inert` stops taps and keyboard focus) until search is closed with the X.
  useEffect(() => {
    document.body.classList.add('mobile-search-open');
    const filters = document.querySelectorAll<HTMLElement>('[data-sticky-filters]');
    filters.forEach(el => {
      el.setAttribute('inert', '');
      el.setAttribute('aria-disabled', 'true');
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('mobile-search-open');
      filters.forEach(el => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-disabled');
      });
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const select = (eventId: string) => {
    onClose();
    if (pathname === '/') {
      const target =
        document.getElementById(`event-${eventId}`) ??
        document.getElementById('upcoming') ??
        document.getElementById('happening-porto');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      navigate(`/?q=${encodeURIComponent(query)}&event=${eventId}`);
    }
  };

  const shown = results.slice(0, 20);

  return (
    <div className="fixed inset-x-0 top-16 z-[45] lg:hidden">
      <div className="border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-lg">
        <div className="flex items-center gap-2 rounded-full bg-muted pl-4 pr-1">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search events, locations, organisers"
            aria-label="Search events"
            className="h-10 min-w-0 flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {/* The one way to close search: clears it and switches the filters back on. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/70 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {query && (
        // Fills the space between the field (61px) and the bottom bar (65px + the phone's home indicator); scrolls on its own.
        <div className="h-[calc(100dvh-64px-61px-65px-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain bg-background">
          {shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No events match “{query}”</p>
          ) : (
            shown.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => select(e.id)}
                className="w-full border-b border-border/50 px-4 py-3 text-left transition last:border-0 hover:bg-secondary/60"
              >
                <p className="line-clamp-1 text-[15px] font-medium text-foreground">{e.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {startTime24(e.time)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {e.location}
                  </span>
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});
MobileSearchBar.displayName = 'MobileSearchBar';

export default MobileSearchBar;
