import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { mockParticipants } from '@/data/mockData';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, MapPin, Users, Calendar } from 'lucide-react';


const ActivityFeed = () => {
  const { history, seriesCount } = useActivityHistory();

  const items = [...history].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

  return (
    <section className="py-8 md:py-12">
      <div className="container px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Your activity</h2>
            <span className="text-xs text-muted-foreground">What you've done lately</span>
          </div>

          <ol className="space-y-3">
            {items.map((h, idx) => {
              const co = h.coAttendeeIds
                .map(id => mockParticipants.find(p => p.id === id))
                .filter(Boolean)
                .slice(0, 4);
              const seriesIdx = h.seriesId
                ? items.slice(idx).filter(x => x.seriesId === h.seriesId).length
                : 0;
              return (
                <li key={h.eventId} className="bg-card rounded-xl p-4 shadow-card flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{h.title}</span>
                      {h.seriesId && (
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary font-medium">
                          {ordinal(seriesCount(h.seriesId) - seriesIdx + 1)} time
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(h.date, 'MMM d')} · {formatDistanceToNow(h.date, { addSuffix: true })}
                      </span>
                      {typeof h.attendeeCount === 'number' && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {h.attendeeCount} attended
                        </span>
                      )}
                      {h.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {h.location}
                        </span>
                      )}
                    </p>

                    {co.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-2">
                          {co.map(p => (
                            <img key={p!.id} src={p!.avatar} alt={p!.name} className="w-6 h-6 rounded-full border-2 border-card object-cover" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          with {co.map(p => p!.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default ActivityFeed;
