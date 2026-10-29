import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Check, X, Pencil, ExternalLink, RotateCcw, Clock, Loader2 } from 'lucide-react';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Row {
  id: string;
  source: string;
  source_url: string;
  title: string;
  description: string | null;
  starts_at: string;
  time_label: string | null;
  venue_name: string | null;
  location: string | null;
  image_url: string | null;
  organizer_name: string | null;
  category: string | null;
  price_label: string | null;
  activity_level: string | null;
  intensity: string | null;
  group_size: string | null;
  review_status: ReviewStatus;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  meetup: 'Meetup',
  eventbrite: 'Eventbrite',
  luma: 'Lu.ma',
  'agenda-porto': 'Agenda Porto',
  'porto-coffee-week': 'Porto Coffee Week',
  'expat-girls-porto': 'Expat Girls Porto',
};

const ACTIVITY = ['low', 'moderate', 'high'];
const INTENSITY = ['chill', 'social', 'energetic'];
const GROUP = ['small', 'medium', 'large'];

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  });

const CuratePage = () => {
  const { loading: authLoading, isAdmin, email } = useAdmin();
  const { toast } = useToast();
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Row>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('review_status', tab)
      .order('starts_at', { ascending: true })
      .limit(300);
    if (error) {
      toast({ title: 'Could not load events', description: error.message });
    }
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [tab, toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source))).sort(),
    [rows],
  );
  const visible = useMemo(
    () => (sourceFilter === 'all' ? rows : rows.filter((r) => r.source === sourceFilter)),
    [rows, sourceFilter],
  );

  const setStatus = async (ids: string[], status: ReviewStatus) => {
    setBusy(ids.length === 1 ? ids[0] : 'bulk');
    const { error } = await supabase
      .from('events')
      .update({ review_status: status, reviewed_at: new Date().toISOString() })
      .in('id', ids);
    setBusy(null);
    if (error) {
      toast({ title: 'Update failed', description: error.message });
      return;
    }
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    toast({
      title:
        status === 'approved'
          ? `${ids.length} event${ids.length > 1 ? 's' : ''} published`
          : status === 'rejected'
            ? `${ids.length} event${ids.length > 1 ? 's' : ''} hidden`
            : 'Moved back to review',
    });
  };

  const saveEdit = async (id: string) => {
    setBusy(id);
    const patch = {
      title: draft.title,
      description: draft.description,
      category: draft.category,
      activity_level: draft.activity_level,
      intensity: draft.intensity,
      group_size: draft.group_size,
    };
    const { error } = await supabase.from('events').update(patch).eq('id', id);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not save', description: error.message });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as Row : r)));
    setEditing(null);
    toast({ title: 'Changes saved' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Curation is admin-only</h1>
          <p className="text-sm text-muted-foreground">
            {email
              ? `${email} doesn't have curation access yet.`
              : 'Sign in with the account that has curation access to review new events.'}
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to the feed</Link>
          </Button>
        </div>
      </div>
    );
  }

  const stale = visible.filter(
    (r) => Date.now() - new Date(r.created_at).getTime() > 24 * 3600_000,
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 md:px-6 py-8 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Curate events</h1>
            <p className="text-sm text-muted-foreground">
              New events collected each morning wait here until you publish them.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Back to the feed</Link>
          </Button>
        </div>

        {tab === 'pending' && stale > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {stale} event{stale > 1 ? 's have' : ' has'} been waiting more than a day.
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus)} className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="pending">Waiting</TabsTrigger>
              <TabsTrigger value="approved">Published</TabsTrigger>
              <TabsTrigger value="rejected">Hidden</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tab === 'pending' && visible.length > 0 && (
                <Button
                  size="sm"
                  disabled={busy === 'bulk'}
                  onClick={() => setStatus(visible.map((r) => r.id), 'approved')}
                >
                  Publish all ({visible.length})
                </Button>
              )}
            </div>
          </div>

          <TabsContent value={tab} className="mt-5 space-y-4">
            {loading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {tab === 'pending'
                  ? 'Nothing waiting — you are all caught up.'
                  : 'No events here yet.'}
              </p>
            ) : (
              visible.map((row) => {
                const isEditing = editing === row.id;
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card overflow-hidden flex flex-col sm:flex-row"
                  >
                    {row.image_url && (
                      <img
                        src={row.image_url}
                        alt=""
                        className="h-40 sm:h-auto sm:w-44 object-cover shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{SOURCE_LABELS[row.source] ?? row.source}</Badge>
                        <span className="text-muted-foreground">{dayLabel(row.starts_at)}</span>
                        {row.price_label && (
                          <span className="text-muted-foreground">· {row.price_label}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={draft.title ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            placeholder="Title"
                          />
                          <Textarea
                            rows={4}
                            value={draft.description ?? ''}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, description: e.target.value }))
                            }
                            placeholder="Description"
                          />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Input
                              value={draft.category ?? ''}
                              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                              placeholder="Category"
                            />
                            {(
                              [
                                ['activity_level', ACTIVITY],
                                ['intensity', INTENSITY],
                                ['group_size', GROUP],
                              ] as const
                            ).map(([field, options]) => (
                              <Select
                                key={field}
                                value={(draft[field] as string) ?? ''}
                                onValueChange={(v) => setDraft((d) => ({ ...d, [field]: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={field.replace('_', ' ')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((o) => (
                                    <SelectItem key={o} value={o}>
                                      {o}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={busy === row.id} onClick={() => saveEdit(row.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="font-semibold text-foreground leading-snug">{row.title}</h2>
                          {row.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {row.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {[row.venue_name, row.location, row.organizer_name]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            {[row.category, row.activity_level, row.intensity, row.group_size]
                              .filter(Boolean)
                              .map((t) => (
                                <Badge key={t as string} variant="outline">
                                  {t}
                                </Badge>
                              ))}
                          </div>
                        </>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {tab !== 'approved' && (
                          <Button
                            size="sm"
                            disabled={busy === row.id}
                            onClick={() => setStatus([row.id], 'approved')}
                          >
                            <Check className="h-4 w-4 mr-1" /> Publish
                          </Button>
                        )}
                        {tab !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === row.id}
                            onClick={() => setStatus([row.id], 'rejected')}
                          >
                            <X className="h-4 w-4 mr-1" /> Hide
                          </Button>
                        )}
                        {tab !== 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === row.id}
                            onClick={() => setStatus([row.id], 'pending')}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" /> Back to review
                          </Button>
                        )}
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(row.id);
                              setDraft(row);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <a href={row.source_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> Original
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CuratePage;
