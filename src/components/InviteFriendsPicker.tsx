import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Send, Users } from 'lucide-react';
import { Event } from '@/types/event';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useInvites } from '@/context/InvitesContext';
import { useInviteCandidates } from '@/hooks/useInviteCandidates';
import { initials, namesSummary, sharedEventsLabel } from '@/lib/invites';
import { cn } from '@/lib/utils';

interface Props {
  event: Event;
  /** Called the first time the person picks someone (e.g. to hold off the auto-opening chat). */
  onEngage?: () => void;
  /** Called after invites are sent. */
  onSent?: (ids: string[]) => void;
  /** Taller list in the standalone dialog, shorter inside the Attend pop-up. */
  listClassName?: string;
}

/** Pick mutual connections and send them an invite to `event`. */
const InviteFriendsPicker = ({ event, onEngage, onSent, listClassName }: Props) => {
  const candidates = useInviteCandidates(event);
  const { invite, uninvite } = useInvites();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (selected.size === 0) onEngage?.();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const send = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const names = candidates.filter(c => selected.has(c.participant.id)).map(c => c.participant.name);
    invite(event.id, ids);
    setSelected(new Set());
    toast({
      title: `Invite${ids.length === 1 ? '' : 's'} sent to ${namesSummary(names)}`,
      description: event.title,
      action: (
        <ToastAction altText="Undo the invites" onClick={() => uninvite(event.id, ids)}>
          Undo
        </ToastAction>
      ),
    });
    onSent?.(ids);
  };

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground flex items-start gap-3">
        <Users className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <p>
          Once you and someone you've met connect with each other, you can invite them here.{' '}
          <Link to="/profile/connections" className="font-medium text-primary hover:underline">See your connections</Link>
        </p>
      </div>
    );
  }

  const count = selected.size;

  return (
    <div className="space-y-3">
      <ul className={cn('space-y-1 max-h-64 overflow-y-auto -mx-1 px-1', listClassName)} aria-label="Your mutual connections">
        {candidates.map(({ participant: p, sharedEvents, alreadyGoing, alreadyInvited }) => {
          const disabled = alreadyGoing || alreadyInvited;
          const checked = selected.has(p.id);
          const inputId = `invite-${event.id}-${p.id}`;
          return (
            <li key={p.id}>
              <label
                htmlFor={inputId}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-2 py-2 min-h-[56px] border-2 transition-colors',
                  checked ? 'border-primary bg-primary/5' : 'border-transparent',
                  disabled ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-muted/60',
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar} alt="" />
                  <AvatarFallback>{initials(p.name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{sharedEventsLabel(sharedEvents)}</span>
                </span>
                {alreadyGoing ? (
                  <span className="text-xs font-semibold text-accent-strong shrink-0">Already going</span>
                ) : alreadyInvited ? (
                  <span className="text-xs font-semibold text-muted-foreground shrink-0 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" aria-hidden="true" /> Invited
                  </span>
                ) : (
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={() => toggle(p.id)}
                    className="h-6 w-6 rounded-full shrink-0"
                    aria-label={`Invite ${p.name}`}
                  />
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <Button className="w-full" onClick={send} disabled={count === 0}>
        <Send className="h-4 w-4 mr-2" />
        {count === 0 ? 'Choose who to invite' : `Send ${count} invite${count === 1 ? '' : 's'}`}
      </Button>
    </div>
  );
};

export default InviteFriendsPicker;
