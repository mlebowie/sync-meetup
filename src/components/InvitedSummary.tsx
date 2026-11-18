import { Event } from '@/types/event';
import { mockParticipants } from '@/data/mockData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInvites } from '@/context/InvitesContext';
import { initials, namesSummary } from '@/lib/invites';
import { cn } from '@/lib/utils';

/** Avatars and "You invited Priya and Tom" for an event; nothing if no one is invited. */
const InvitedSummary = ({ event, className, emptyText }: { event: Event; className?: string; emptyText?: string }) => {
  const { getInvited } = useInvites();
  const people = getInvited(event.id)
    .map(id => mockParticipants.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  if (people.length === 0) {
    return emptyText ? <span className={cn('text-xs text-muted-foreground', className)}>{emptyText}</span> : null;
  }

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div className="flex -space-x-2 shrink-0">
        {people.slice(0, 3).map(p => (
          <Avatar key={p.id} className="h-7 w-7 border-2 border-card">
            <AvatarImage src={p.avatar} alt="" />
            <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="text-xs text-muted-foreground truncate">
        You invited {namesSummary(people.map(p => p.name))}
      </span>
    </div>
  );
};

export default InvitedSummary;
