import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import { PriceInfo } from '@/lib/price';
import { siteName, ticketUrl } from '@/lib/ticketing';
import { startTime24 } from '@/lib/startTime';

interface TicketSheetProps {
  event: Event;
  price: PriceInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the person heads to the ticket site, so the card can ask "Got your ticket?" later. */
  onContinue: () => void;
}

/**
 * Explains that a paid event's tickets are sold elsewhere before sending the
 * person there (Figma: "1 · Get tickets sheet").
 */
const TicketSheet = ({ event, price, open, onOpenChange, onContinue }: TicketSheetProps) => {
  const url = ticketUrl(event);
  const site = siteName(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-event-card text-event-card-foreground border-0 rounded-2xl p-5 md:p-6 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle className="text-xl font-bold leading-snug text-foreground pr-6">
          Tickets are sold on {site}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
          SYNC doesn't sell tickets for this event. You'll finish booking on {site} in a new tab, then come back here to
          mark yourself as going.
        </DialogDescription>

        <div className="rounded-xl border border-sage bg-white/70 px-4 py-3.5 flex flex-col gap-1.5">
          <p className="font-display text-[15px] font-semibold text-primary-text">{event.title}</p>
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-sage-deep">
            <span>
              {format(event.date, 'EEE, MMM d')} · {startTime24(event.time)}
            </span>
            {price && <span className="text-lg font-bold text-foreground whitespace-nowrap">{price.label}</span>}
          </div>
          {price?.kind === 'amount' && (
            <p className="text-xs leading-relaxed text-sage-deep">
              Price as listed by the organiser. {site} may add fees.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="h-11 text-[15px] font-medium shadow-none">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onContinue();
                onOpenChange(false);
              }}
            >
              Continue to {site}
            </a>
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-sm font-semibold text-primary-text hover:bg-primary/10 hover:text-primary-text"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketSheet;
