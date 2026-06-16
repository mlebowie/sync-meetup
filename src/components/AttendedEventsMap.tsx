import { useMemo, useState } from 'react';
import { PastAttendance } from '@/types/event';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  history: PastAttendance[];
}

type Range = '24h' | '7d' | '30d';

const RANGES: { id: Range; label: string; hours: number }[] = [
  { id: '24h', label: 'Last 24h', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
];

// HSL colors per category — kept inline so pins render reliably on the SVG.
const CATEGORY_COLOR: Record<string, string> = {
  Sports: '#ff6b5b',      // coral
  Social: '#14b8a6',      // teal
  Networking: '#f59e0b',  // amber
  Default: '#8b5cf6',     // violet
};

// Bounding box for Porto-area venues
const BOUNDS = { minLat: 41.135, maxLat: 41.195, minLng: -8.715, maxLng: -8.595 };

const project = (lat: number, lng: number, w: number, h: number) => {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w;
  const y = h - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h;
  return { x, y };
};

const AttendedEventsMap = ({ history }: Props) => {
  const [range, setRange] = useState<Range>('30d');

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGES.find(r => r.id === range)!.hours * 3600 * 1000;
    return history.filter(h => h.lat != null && h.lng != null && h.date.getTime() >= cutoff);
  }, [history, range]);

  const categories = useMemo(() => Array.from(new Set(filtered.map(h => h.category))), [filtered]);

  const W = 320;
  const H = 180;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> Places they've shown up
        </h4>
      </div>

      <div className="flex gap-1.5 mb-2">
        {RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
              range === r.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-border bg-secondary/30">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
          {/* Stylized Porto backdrop */}
          <defs>
            <linearGradient id="map-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dff5f1" />
              <stop offset="100%" stopColor="#cfe9f5" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#map-bg)" />
          {/* River Douro — a curve through the south */}
          <path
            d={`M 0 ${H * 0.78} Q ${W * 0.3} ${H * 0.68}, ${W * 0.55} ${H * 0.74} T ${W} ${H * 0.7}`}
            stroke="#7fb9d6"
            strokeWidth={10}
            fill="none"
            opacity={0.7}
          />
          {/* Atlantic — left edge */}
          <rect x={0} y={0} width={W * 0.08} height={H} fill="#7fb9d6" opacity={0.55} />
          {/* Faint grid */}
          {[0.25, 0.5, 0.75].map(p => (
            <line key={`v${p}`} x1={W * p} y1={0} x2={W * p} y2={H} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
          ))}
          {[0.25, 0.5, 0.75].map(p => (
            <line key={`h${p}`} x1={0} y1={H * p} x2={W} y2={H * p} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
          ))}

          {/* Pins */}
          {filtered.map(h => {
            const { x, y } = project(h.lat!, h.lng!, W, H);
            const color = CATEGORY_COLOR[h.category] || CATEGORY_COLOR.Default;
            return (
              <g key={h.eventId}>
                <circle cx={x} cy={y} r={10} fill={color} opacity={0.2} />
                <circle cx={x} cy={y} r={5} fill={color} stroke="#fff" strokeWidth={1.5}>
                  <title>{h.title} — {h.location}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/60">
            No events in this window
          </div>
        )}
      </div>

      {/* Legend */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CATEGORY_COLOR[cat] || CATEGORY_COLOR.Default }}
              />
              {cat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendedEventsMap;
