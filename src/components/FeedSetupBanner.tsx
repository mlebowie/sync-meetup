import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { ONBOARDING_INTERESTS } from '@/lib/userProfile';
import { getFilterTourState, setFilterTourState, startFilterTour } from '@/lib/filterTour';

interface Props {
  interests: string[];
}

const FeedSetupBanner = ({ interests }: Props) => {
  const [dismissed, setDismissed] = useState(() => getFilterTourState() !== 'unseen');

  if (dismissed) return null;

  const labels = interests
    .map(id => ONBOARDING_INTERESTS.find(i => i.id === id)?.label)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');

  const close = () => {
    setFilterTourState('skipped');
    setDismissed(true);
  };

  return (
    <section className="py-6">
      <div className="container px-4 md:px-6">
        <div className="max-w-5xl mx-auto relative bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5 pr-10">
          <button
            onClick={close}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Your feed is ready
          </div>
          <h3 className="text-lg font-semibold text-foreground mt-1">
            Your feed is set to: {labels || 'your interests'}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            That's your starting point. Scroll down to Upcoming events to fine-tune by vibe, group size
            and distance.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              onClick={() => {
                setDismissed(true);
                startFilterTour();
              }}
            >
              Show me how
            </Button>
            <Button variant="ghost" onClick={close}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeedSetupBanner;
