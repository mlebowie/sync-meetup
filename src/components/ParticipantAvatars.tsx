import { Participant } from '@/types/event';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParticipantAvatarsProps {
  participants: Participant[];
  maxVisible?: number;
  totalCount?: number;
  onParticipantClick?: (participant: Participant) => void;
}

const ParticipantAvatars = ({
  participants,
  maxVisible = 4,
  totalCount,
  onParticipantClick,
}: ParticipantAvatarsProps) => {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = (totalCount || participants.length) - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant, index) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onParticipantClick?.(participant);
                }}
                className="relative w-8 h-8 rounded-full border-2 border-card overflow-hidden transition-transform hover:scale-110 hover:z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ zIndex: maxVisible - index }}
                aria-label={`View ${participant.name}'s profile`}
              >
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-full h-full object-cover"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{participant.name}</p>
              <p className="text-xs text-muted-foreground">Click to view profile</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <div className="relative w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantAvatars;
