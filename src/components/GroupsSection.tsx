import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { suggestGroups } from '@/lib/groupFormation';
import { mockParticipants } from '@/data/mockData';
import { useSocial } from '@/context/SocialContext';
import { Users2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect } from 'react';
import { Group } from '@/types/event';
import CrewChatDialog from './CrewChatDialog';

interface Props {
  onOpenDM?: (id: string) => void;
}

const GroupsSection = ({ onOpenDM: _onOpenDM }: Props) => {
  const { history, tags, hasTaggedMe } = useActivityHistory();
  const { followers, following, ensureCrewChat } = useSocial();
  const [activeCrew, setActiveCrew] = useState<Group | null>(null);

  const mutualSet = useMemo(() => {
    const s = new Set<string>();
    followers.forEach(id => { if (following.has(id)) s.add(id); });
    tags.forEach(t => { if (hasTaggedMe(t.participantId)) s.add(t.participantId); });
    return s;
  }, [followers, following, tags, hasTaggedMe]);

  const groups = useMemo(() => suggestGroups(history, tags, mutualSet), [history, tags, mutualSet]);

  if (groups.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-secondary/30">
      <div className="container px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Users2 className="h-5 w-5 text-accent" />
              Your crews
            </h2>
            <span className="text-xs text-muted-foreground">Auto-formed from your history</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(g => {
              const members = g.memberIds
                .map(id => mockParticipants.find(p => p.id === id))
                .filter(Boolean);
              return (
                <div key={g.id} className="bg-card rounded-2xl p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{g.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{g.reason}</p>
                    </div>
                    <div className="flex -space-x-2 shrink-0">
                      {members.slice(0, 4).map(m => (
                        <img key={m!.id} src={m!.avatar} alt={m!.name} className="w-8 h-8 rounded-full border-2 border-card object-cover" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">{members.length} regulars</span>
                    {members[0] && (
                      <Button variant="outline" size="sm" onClick={() => onOpenDM?.(members[0]!.id)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message crew
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GroupsSection;
