import { Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { MapPin, Check, UserPlus, MessageCircle, Repeat, Trophy, Users, Calendar } from 'lucide-react';

// Inline brand icons for social handles (no extra dependency)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.25a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75Z" />
  </svg>
);
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8 18V9H5v9h3Zm-1.5-10.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 18v-5.07a2.96 2.96 0 0 0-2.96-2.96 3 3 0 0 0-2.54 1.54V9h-3v9h3v-4.5a1.5 1.5 0 0 1 3 0V18h3Z" />
  </svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.004 2C6.486 2 2 6.486 2 12c0 1.893.528 3.659 1.444 5.17L2 22l4.942-1.413A9.96 9.96 0 0 0 12.004 22c5.518 0 10-4.486 10-10s-4.482-10-10-10Zm4.36 14.28c-.22.622-1.274 1.183-1.78 1.26-.47.07-.913.35-3.068-.65-2.598-1.15-4.25-3.99-4.38-4.18-.125-.187-.997-1.32-.997-2.52 0-1.19.625-1.77.85-2.01.22-.235.48-.293.64-.293.16 0 .32 0 .46.008.15.006.35-.057.55.417.2.474.676 1.646.734 1.766.056.12.093.26.02.42-.075.16-.112.26-.225.398-.112.14-.236.312-.338.42-.112.12-.23.25-.104.49.127.24.566.933.964 1.21.664.471 1.21.513 1.472.57.157.034.318-.032.41-.14.12-.14.338-.38.53-.615.165-.202.28-.272.42-.473.14-.2.07-.38-.03-.53-.098-.15-.41-.52-.57-.707-.167-.19-.33-.16-.45-.18-.135-.025-.27-.065-.39-.11-.2-.08-.34-.117-.39-.217-.05-.1-.02-.36.1-.72.117-.36.35-.79.4-.87.065-.12.13-.24.19-.38.16-.36.08-.66-.04-.76-.12-.1-.32-.12-.64-.12-.29 0-.69.05-1.05.27-.36.22-.9.79-.9 1.8 0 1.02.74 2.02.84 2.16.1.14 1.46 2.23 3.54 3.13.49.21.88.34 1.18.44.49.16.94.14 1.29.09.39-.06 1.274-.52 1.454-1.02.18-.5.18-.93.13-1.02-.05-.09-.2-.14-.42-.24Z" />
  </svg>
);

import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import AttendedEventsMap from './AttendedEventsMap';
import UnfollowConfirmDialog from './UnfollowConfirmDialog';


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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
          {participant.social && (
            <div className="flex items-center gap-3 mt-3">
              {participant.social.instagram && (
                <a
                  href={`https://instagram.com/${participant.social.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={`@${participant.social.instagram}`}
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              )}
              {participant.social.linkedin && (
                <a
                  href={`https://linkedin.com/in/${participant.social.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={participant.social.linkedin}
                >
                  <LinkedInIcon className="h-5 w-5" />
                </a>
              )}
              {participant.social.whatsapp && (
                <a
                  href={`https://wa.me/${participant.social.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={participant.social.whatsapp}
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              )}
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

        {/* Last attended event card */}
        {(() => {
          const recent = [...(participant.recentHistory ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime());
          const last = recent[0];
          if (!last) return null;
          const timesAtSeries = last.seriesId
            ? recent.filter(r => r.seriesId === last.seriesId).length
            : 0;
          return (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Last attended
              </h4>
              <div className="rounded-xl border border-border bg-card p-3 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{last.title}</div>
                    {last.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{last.location}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(last.date, 'EEE, MMM d')} · {formatDistanceToNow(last.date, { addSuffix: true })}
                    </div>
                  </div>
                  {last.seriesId && timesAtSeries > 1 && (
                    <span className="shrink-0 px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                      <Repeat className="h-3 w-3" /> {timesAtSeries}× attended
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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

        {participant.recentHistory && participant.recentHistory.length > 0 ? (
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Recent history
            </h4>
            <ul className="space-y-2">
              {[...participant.recentHistory]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 5)
                .map(h => (
                  <li key={h.eventId} className="rounded-lg bg-secondary/40 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{h.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{format(h.date, 'MMM d')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {h.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {h.location}
                        </span>
                      )}
                      {h.attendeeCount != null && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {h.attendeeCount} attended
                        </span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ) : participant.pastEvents && participant.pastEvents.length > 0 && (
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

        {/* Map of attended locations with time filters */}
        {participant.recentHistory && participant.recentHistory.length > 0 && (
          <AttendedEventsMap history={participant.recentHistory} />
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
