import { Compass, SlidersHorizontal, MessagesSquare, Users2 } from 'lucide-react';

const STEPS = [
  {
    icon: Compass,
    step: 'Step 1',
    title: 'Curate your feed',
    body: 'Choose your interests and your neighborhood. SYNC builds a feed of what is actually happening near you.',
  },
  {
    icon: SlidersHorizontal,
    step: 'Step 2',
    title: 'Register for the right event',
    body: 'Filter by activity level, social intensity, age range, recurring series, and inclusivity — pet-friendly, LGBTQI+ friendly, women only.',
  },
  {
    icon: MessagesSquare,
    step: 'Step 3',
    title: 'Chat before and after',
    body: 'Every event opens a group chat with the organizer and attendees, so you arrive knowing names — and keep talking afterwards.',
  },
  {
    icon: Users2,
    step: 'Step 4',
    title: 'Build your crew',
    body: 'Tag the people you clicked with. Repeat attendance and mutual tags form crews that organize their own events together.',
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
              Four steps from new in town to{' '}
              <span className="text-primary font-normal">a crew that expects you.</span>
            </h2>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 rounded-2xl overflow-hidden">
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
