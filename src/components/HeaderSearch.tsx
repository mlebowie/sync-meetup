import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search, X, CalendarDays, MapPin } from 'lucide-react';
import { useSearch } from '@/context/SearchContext';
import { startTime24 } from '@/lib/startTime';

interface HeaderSearchProps {
  /** Extra classes for the icon button, e.g. light icons over the hero or bottom-bar sizing. */
  triggerClassName?: string;
  /** Which way the results panel opens: down from the header, or up from the bottom bar. */
  side?: 'top' | 'bottom';
}

const HeaderSearch = ({ triggerClassName, side = 'bottom' }: HeaderSearchProps) => {
  const { query, setQuery, results } = useSearch();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

const select = (eventId: string) => {
    setOpen(false);
    if (location.pathname === '/') {
      const target =
        document.getElementById(`event-${eventId}`) ??
        document.getElementById('upcoming') ??
        document.getElementById('happening-porto');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      navigate(`/?q=${encodeURIComponent(query)}&event=${eventId}`);
    }
  };

  const shown = results.slice(0, 6);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName} aria-label="Search events" title="Search events">
          <Search className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side={side} sideOffset={side === 'top' ? 12 : 4} className="w-[min(92vw,420px)] p-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search events, locations, organisers…"
            className="border-0 focus-visible:ring-0 px-0 shadow-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {!query ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Search by event, location or organiser
            </div>
          ) : shown.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No events match “{query}”
            </div>
          ) : (
            shown.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => select(e.id)}
                className="w-full text-left px-4 py-3 hover:bg-secondary/60 border-b border-border/50 last:border-0 transition"
              >
                <p className="text-sm font-medium text-foreground line-clamp-1">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
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
      </PopoverContent>
    </Popover>
  );
};

export default HeaderSearch;