import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { mockParticipants } from '@/data/mockData';
import { Flame, Repeat, Users } from 'lucide-react';

const MomentumPanel = () => {
  const { history, topCoAttendees, categoryAffinity } = useActivityHistory();

  const last30 = history.filter(h => (Date.now() - h.date.getTime()) < 1000 * 60 * 60 * 24 * 30).length;
  const series: Record<string, { title: string; count: number }> = {};
  history.forEach(h => {
    if (!h.seriesId) return;
    series[h.seriesId] ??= { title: h.title, count: 0 };
    series[h.seriesId].count += 1;
  });
  const topSeries = Object.values(series).sort((a, b) => b.count - a.count)[0];

  const topPeople = topCoAttendees().slice(0, 3)
    .map(c => mockParticipants.find(p => p.id === c.id))
    .filter(Boolean);

  const topCategory = Object.entries(categoryAffinity()).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <section className="py-8 md:py-12 bg-secondary/30">
      <div className="container px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Your momentum</h2>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Last 30 days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <Flame className="h-4 w-4 text-primary" /> Showing up
              </div>
              <div className="text-3xl font-bold text-foreground">{last30}</div>
              <p className="text-sm text-muted-foreground mt-1">events attended this month</p>
              {topCategory && (
                <p className="text-xs text-muted-foreground mt-2">Mostly {topCategory.toLowerCase()}</p>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <Repeat className="h-4 w-4 text-accent-strong" /> Your weekly anchor
              </div>
              <div className="text-lg font-semibold text-foreground line-clamp-1">
                {topSeries?.title || 'Pick a recurring event'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {topSeries ? `${topSeries.count}× in a row` : 'Find one below to build a habit'}
              </p>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <Users className="h-4 w-4 text-success" /> Familiar faces
              </div>
              <div className="flex -space-x-2 mt-1">
                {topPeople.map((p) => (
                  <img
                    key={p!.id}
                    src={p!.avatar}
                    alt={p!.name}
                    className="w-9 h-9 rounded-full border-2 border-card object-cover"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {topPeople.length > 0
                  ? `You keep crossing paths with ${topPeople.map(p => p!.name.split(' ')[0]).join(', ')}`
                  : 'No recurring crew yet — show up twice and watch it form'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MomentumPanel;
