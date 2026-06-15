import { Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { MapPin, Check, UserPlus, MessageCircle, Repeat, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDM?: (participantId: string) => void;
}

const ParticipantProfileDialog = ({ participant, open, onOpenChange, onOpenDM }: Props) => {
  const { following, isMutual, toggleFollow, currentUser } = useSocial();
  const { crossedPathsWith, isConnected, hasTaggedMe } = useActivityHistory();
  const { toast } = useToast();

  if (!participant) return null;
  const isMe = participant.id === currentUser.id;
  const isFollowing = following.has(participant.id);
  const mutual = isMutual(participant.id) || isConnected(participant.id);
  const crossed = crossedPathsWith(participant.id);

  const handleFollow = () => {
    toggleFollow(participant.id);
    if (!isFollowing) {
      const wouldBeMutual = isMutual(participant.id) || hasTaggedMe(participant.id);
      toast({
        title: wouldBeMutual ? `Connected with ${participant.name} 🎉` : `Following ${participant.name}`,
        description: wouldBeMutual
          ? 'DMs are unlocked — you can message each other now.'
          : 'They\'ll see you next time you cross paths at an event.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{participant.name}'s activity</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center">
          <img
            src={participant.avatar}
            alt={participant.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-card -mt-2"
          />
          <h3 className="mt-4 text-xl font-display">{participant.name}</h3>
          {participant.neighborhood && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{participant.neighborhood}</span>
            </div>
          )}
        </div>

        {/* Activity-history-first profile — no external interest tags */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-secondary/40 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{participant.totalAttended ?? 0}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Events attended</div>
          </div>
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-primary">{crossed}×</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">You've crossed paths</div>
          </div>
        </div>

        {participant.recurringSeries && participant.recurringSeries.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5" /> Shows up to
            </h4>
            <ul className="space-y-1.5">
              {participant.recurringSeries.map(s => (
                <li key={s} className="text-sm text-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {participant.pastEvents && participant.pastEvents.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Recent history
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {participant.pastEvents.slice(0, 6).map(e => (
                <span key={e} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">{e}</span>
              ))}
            </div>
          </div>
        )}

        {!isMe && (
          <div className="flex gap-2 mt-6">
            <Button
              variant={isFollowing ? 'attend' : 'default'}
              className="flex-1"
              onClick={handleFollow}
            >
              {isFollowing ? (<><Check className="h-4 w-4 mr-1" /> Following</>) : (<><UserPlus className="h-4 w-4 mr-1" /> Follow</>)}
            </Button>
            {mutual && onOpenDM && (
              <Button variant="outline" onClick={() => { onOpenChange(false); onOpenDM(participant.id); }}>
                <MessageCircle className="h-4 w-4 mr-1" /> Message
              </Button>
            )}
          </div>
        )}
        {!isMe && isFollowing && !mutual && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Show up to another event together — or tag each other after one — to unlock DMs.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantProfileDialog;
