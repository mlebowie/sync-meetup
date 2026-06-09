import { Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { MapPin, Check, UserPlus, MessageCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDM?: (participantId: string) => void;
}

const ParticipantProfileDialog = ({ participant, open, onOpenChange, onOpenDM }: Props) => {
  const { following, isMutual, toggleFollow, currentUser } = useSocial();
  const { toast } = useToast();

  if (!participant) return null;
  const isMe = participant.id === currentUser.id;
  const isFollowing = following.has(participant.id);
  const mutual = isMutual(participant.id);

  const handleFollow = () => {
    toggleFollow(participant.id);
    if (!isFollowing) {
      // simulate that some already follow back
      const wouldBeMutual = isMutual(participant.id) || ['1', '2', '4', '6'].includes(participant.id);
      toast({
        title: wouldBeMutual ? `You & ${participant.name} follow each other 🎉` : `Following ${participant.name}`,
        description: wouldBeMutual
          ? 'You can now send each other direct messages.'
          : 'They’ll see you’re interested in connecting.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{participant.name}'s profile</DialogTitle>
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
          {participant.bio && (
            <p className="text-sm text-muted-foreground mt-3 max-w-sm">{participant.bio}</p>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {participant.preferredActivities && participant.preferredActivities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Preferred activities
              </h4>
              <div className="flex flex-wrap gap-2">
                {participant.preferredActivities.map(a => (
                  <span key={a} className="px-2.5 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {participant.pastEvents && participant.pastEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Previously attended
              </h4>
              <ul className="space-y-1.5">
                {participant.pastEvents.map(e => (
                  <li key={e} className="text-sm text-foreground flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!isMe && (
          <div className="flex gap-2 mt-6">
            <Button
              variant={isFollowing ? 'attend' : 'default'}
              className="flex-1"
              onClick={handleFollow}
            >
              {isFollowing ? (
                <><Check className="h-4 w-4 mr-1" /> Following</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-1" /> Follow</>
              )}
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
            Once {participant.name.split(' ')[0]} follows you back, you can DM each other.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantProfileDialog;
