import { Compass, CalendarCheck, Users2 } from 'lucide-react';

const STEPS = [
  {
    icon: Compass,
    step: 'Step 1',
    title: 'Pick what you like doing',
    body: "Choose your interests and neighborhood. SYNC builds a feed of what's actually happening near you. No bio to write.",
  },
  {
    icon: CalendarCheck,
    step: 'Step 2',
    title: 'Go to a small event',
    body: 'Filter by vibe, group size and inclusivity. Every event opens a group chat, so you arrive already knowing a few names.',
  },
  {
    icon: Users2,
    step: 'Step 3',
    title: 'Keep meeting the same people',
    body: 'Tag the people you clicked with. Repeat events and mutual tags form crews that plan their own meetups.',
  },
];

const HowSyncWorks = () => {
  return (
    <section id="how-sync-works" className="py-14 md:py-20 border-b border-border/60">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10 md:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
              How SYNC works
            </p>
            <h2 className="text-2xl md:text-4xl font-light tracking-tight text-foreground">
              Three steps from new in town to{' '}
              <span className="text-primary font-normal">a crew that expects you.</span>
            </h2>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden">
            {STEPS.map(({ icon: Icon, step, title, body }, i) => (
              <li
                key={title}
                className="bg-card p-6 md:p-7 flex flex-col animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-4xl font-light text-muted-foreground/30 leading-none">
                    {i + 1}
                  </span>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                  {step}
                </p>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                <div className="mt-6 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default HowSyncWorks;
