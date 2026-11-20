import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import { IntentAction, setPendingIntent } from '@/lib/pendingIntent';
import { startTime24 } from '@/lib/startTime';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignupSheetProps {
  event: Event;
  action: IntentAction;
  priceLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<IntentAction, { title: string; text: string }> = {
  register: {
    title: 'Create a free account to register',
    text: 'Two quick steps: your interests and your account. Then you’re registered.',
  },
  tickets: {
    title: 'Create a free account to get tickets',
    text: 'Two quick steps: your interests and your account. Then we take you to the ticket site, and once you’re going you can join the group chat and meet people there.',
  },
  waitlist: {
    title: 'Create a free account to join the waitlist',
    text: 'Two quick steps: your interests and your account. Then you’re on the waitlist.',
  },
};

const BENEFITS = ['Save your spot and see who’s going', 'Join the event’s group chat', 'Keep all your events in one calendar'];

/**
 * Shown to logged-out visitors who tap Register / Get tickets on an event
 * (Figma "G1/G2 · Sign-up sheet"). Remembers the event so the app can finish
 * the action once they've signed up.
 */
const SignupSheet = ({ event, action, priceLabel, open, onOpenChange }: SignupSheetProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleBusy, setGoogleBusy] = useState(false);
  const copy = COPY[action];

  const remember = () => setPendingIntent({ eventId: event.id, eventTitle: event.title, action });

  const withGoogle = async () => {
    remember();
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/signup?via=google` },
    });
    if (error) {
      setGoogleBusy(false);
      toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
    }
    // On success the browser goes to Google, then back to /signup.
  };

  const go = (path: string) => {
    remember();
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-event-card text-event-card-foreground border-0 rounded-2xl p-5 md:p-6 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle className="text-xl font-bold leading-snug text-foreground pr-6">{copy.title}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{copy.text}</DialogDescription>

        {action !== 'tickets' && (
          <ul className="flex flex-col gap-1.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-sage-deep" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border border-sage bg-white/70 px-4 py-3 flex flex-col gap-1">
          <p className="font-display text-[15px] font-semibold text-primary-text">{event.title}</p>
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-sage-deep">
            <span>
              {format(event.date, 'EEE, MMM d')} · {startTime24(event.time)}
            </span>
            {priceLabel && <span className="text-base font-bold text-foreground whitespace-nowrap">{priceLabel}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="h-11 text-[15px] font-medium bg-white border-sage-deep text-foreground hover:bg-white hover:brightness-95"
            onClick={withGoogle}
            disabled={googleBusy}
          >
            {googleBusy ? 'Opening Google…' : 'Continue with Google'}
          </Button>
          <div className="flex items-center gap-3 text-xs text-sage-deep" aria-hidden="true">
            <span className="h-px flex-1 bg-sage" />
            or
            <span className="h-px flex-1 bg-sage" />
          </div>
          <Button
            variant="outline"
            className="h-11 text-[15px] font-medium bg-peach border-primary-text text-primary-text hover:bg-peach hover:brightness-95 hover:text-primary-text"
            onClick={() => go('/signup')}
          >
            Sign up with email
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button type="button" className="font-semibold text-primary-text hover:underline" onClick={() => go('/login')}>
            Log in
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default SignupSheet;
