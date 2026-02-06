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
}

const ParticipantAvatars = ({ 
  participants, 
  maxVisible = 4, 
  totalCount 
}: ParticipantAvatarsProps) => {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = (totalCount || participants.length) - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant, index) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <div
                className="relative w-8 h-8 rounded-full border-2 border-card overflow-hidden transition-transform hover:scale-110 hover:z-10 cursor-pointer"
                style={{ zIndex: maxVisible - index }}
              >
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{participant.name}</p>
              {participant.bio && (
                <p className="text-xs text-muted-foreground">{participant.bio}</p>
              )}
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
