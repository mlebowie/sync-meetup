import { useMemo, useState } from 'react';
import { Calendar, MapPin, Clock, Bell, Mail, MessageSquare, X, Check, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Event } from '@/types/event';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAttending, ReminderMethod } from '@/context/AttendingContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EventDetailsModal from '@/components/EventDetailsModal';
import OrganizerMessageDialog from '@/components/OrganizerMessageDialog';

interface Props {
  allEvents: Event[];
}

const ComingUpSection = ({ allEvents }: Props) => {
  const { getAttendingEvents, getPrefs, updatePrefs, setAttending } = useAttending();

  const events = useMemo(() => {
    const now = Date.now();
    return getAttendingEvents(allEvents)
      .filter(e => e.date.getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allEvents, getAttendingEvents]);

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Coming Up</h2>
        {events.length > 0 && (
          <span className="text-sm text-muted-foreground">({events.length})</span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-2xl bg-card/40">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nothing on your calendar yet.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Tap "Attend" on any event to add it here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map(event => (
            <ComingUpCard
              key={event.id}
              event={event}
              prefs={getPrefs(event.id)}
              onUpdate={(patch) => updatePrefs(event.id, patch)}
              onRemove={() => setAttending(event.id, false)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

interface CardProps {
  event: Event;
  prefs: ReturnType<ReturnType<typeof useAttending>['getPrefs']>;
  onUpdate: (patch: Partial<{ reminder: ReminderMethod; push: boolean; contact: string }>) => void;
  onRemove: () => void;
}

const ComingUpCard = ({ event, prefs, onUpdate, onRemove }: CardProps) => {
  const [showContact, setShowContact] = useState(prefs.reminder !== 'none');
  const [submitted, setSubmitted] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const { toast } = useToast();

  const pickReminder = (method: ReminderMethod) => {
    onUpdate({ reminder: method });
    setShowContact(method !== 'none');
    setSubmitted(false);
  };

  const handleSubmitReminder = () => {
    if (!prefs.contact || prefs.contact.trim().length === 0) {
      toast({
        title: 'Contact info needed',
        description: `Add a ${prefs.reminder === 'sms' ? 'phone number' : 'email address'} to receive your reminder.`,
        variant: 'destructive',
      });
      return;
    }
    setSubmitted(true);
    toast({
      title: '24-hour reminder set',
      description: `We'll ${prefs.reminder === 'sms' ? 'text' : 'email'} you 24 hours before "${event.title}".`,
    });
  };

  const handleCancel = () => {
    onRemove();
    toast({
      title: 'Registration cancelled',
      description: `The organizer of "${event.title}" has been notified.`,
    });
  };

  return (
    <>
      <div className="p-4 rounded-xl border bg-card hover:shadow-card-hover transition-shadow">
        <div className="flex items-start gap-3">
          <img src={event.imageUrl} alt={event.title} className="h-16 w-16 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm line-clamp-2">{event.title}</p>
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove from coming up"
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {format(event.date, 'EEE, MMM d')}
              <Clock className="h-3 w-3 ml-2" />
              {event.time}
            </div>
            {event.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Eye className="h-3 w-3" />
                View more
              </button>
              {event.organizer && (
                <button
                  type="button"
                  onClick={() => setMsgOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Send className="h-3 w-3" />
                  Message organizer
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Set a 24 hour reminder</p>
            <div className="flex gap-1.5">
              {(['none', 'sms', 'email'] as ReminderMethod[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickReminder(m)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    prefs.reminder === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {m === 'sms' && <MessageSquare className="h-3 w-3" />}
                  {m === 'email' && <Mail className="h-3 w-3" />}
                  {m === 'none' ? 'Off' : m === 'sms' ? 'Text' : 'Email'}
                </button>
              ))}
            </div>
            {showContact && prefs.reminder !== 'none' && (
              <div className="mt-2 flex gap-1.5">
                <Input
                  className="h-8 text-xs"
                  placeholder={prefs.reminder === 'sms' ? 'Phone number' : 'Email address'}
                  value={prefs.contact ?? ''}
                  onChange={(e) => { onUpdate({ contact: e.target.value }); setSubmitted(false); }}
                  type={prefs.reminder === 'sms' ? 'tel' : 'email'}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs shrink-0"
                  onClick={handleSubmitReminder}
                  disabled={submitted}
                >
                  {submitted ? (<><Check className="h-3 w-3 mr-1" />Set</>) : 'Submit'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Push notifications</span>
            </div>
            <Switch
              checked={prefs.push}
              onCheckedChange={(checked) => onUpdate({ push: checked })}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="w-full h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel registration
          </Button>
        </div>
      </div>

      <EventDetailsModal
        event={event}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isAttending={true}
        onAttend={onRemove}
      />
      {event.organizer && (
        <OrganizerMessageDialog
          organizer={event.organizer}
          eventTitle={event.title}
          open={msgOpen}
          onOpenChange={setMsgOpen}
        />
      )}
    </>
  );
};

export default ComingUpSection;
