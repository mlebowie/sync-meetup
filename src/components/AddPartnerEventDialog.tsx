import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lisbonToIso } from '@/lib/lisbonTime';
import EventFlagToggles from '@/components/EventFlagToggles';
import RepeatFields, { type RepeatValue } from '@/components/RepeatFields';
import { EVENT_CATEGORIES } from '@/lib/categories';
import { AlertTriangle, Loader2, Plus, Sparkles } from 'lucide-react';

/** Partners whose events are pasted in by hand. Add new partners here. */
const PARTNERS: { value: string; label: string; source: 'expat-girls-porto' | 'partner' }[] = [
  { value: 'expat-girls-porto', label: 'Expat Girls Porto', source: 'expat-girls-porto' },
  { value: 'workin-matosinhos', label: 'SYNC × Workin Matosinhos', source: 'partner' },
  { value: 'other', label: 'Other partner…', source: 'partner' },
];

const CATEGORIES = EVENT_CATEGORIES;

interface Draft {
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  location: string | null;
  price_label: string | null;
  category: string;
  vibe: string;
  group_size: string;
  women_only: boolean;
  organizer_bio?: string | null;
  lgbtq_friendly?: boolean;
  pet_friendly?: boolean;
  registration_url: string | null;
  image_url?: string | null;
  warnings: string[];
}

const slug = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

interface Props {
  onAdded: () => void;
}

const AddPartnerEventDialog = ({ onAdded }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [partner, setPartner] = useState(PARTNERS[0].value);
  const [partnerName, setPartnerName] = useState('');
  const [pasted, setPasted] = useState('');
  const [link, setLink] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [repeat, setRepeat] = useState<RepeatValue>({ recurrence: 'one-off', until: '' });
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);

  const chosen = PARTNERS.find((p) => p.value === partner) ?? PARTNERS[0];
  const isOther = chosen.value === 'other';
  const organizer = isOther ? partnerName.trim() : chosen.label;
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const reset = () => {
    setPasted('');
    setLink('');
    setDraft(null);
    setBusy(null);
    setFeatured(false);
    setImageUrl('');
    setRepeat({ recurrence: 'one-off', until: '' });
  };

  const read = async () => {
    setBusy('reading');
    const { data, error } = await supabase.functions.invoke('parse-event', {
      body: { text: pasted, url: link.trim() || undefined, organizer: organizer || undefined },
    });
    setBusy(null);
    if (error || !data?.draft) {
      let message = error?.message ?? 'No draft came back';
      try {
        const ctx = (error as { context?: Response })?.context;
        if (ctx) message = (await ctx.json())?.error ?? message;
      } catch {
        // keep the generic message
      }
      toast({ title: 'Could not read the event', description: message });
      return;
    }
    const parsed = data.draft as Draft;
    const next: Draft = {
      ...parsed,
      // Expat Girls events are for women unless the curator switches it off.
      women_only: !!parsed.women_only || chosen.source === 'expat-girls-porto',
      lgbtq_friendly: !!parsed.lgbtq_friendly,
      pet_friendly: !!parsed.pet_friendly,
    };
    setDraft(next);
    if (next.image_url && !imageUrl.trim()) setImageUrl(next.image_url);
  };

  const save = async (status: 'pending' | 'approved') => {
    if (!draft) return;
    const url = (draft.registration_url ?? link).trim();
    if (!draft.title.trim() || !draft.date || !draft.start_time) {
      toast({ title: 'Title, date and start time are needed' });
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      toast({ title: 'Add the registration link', description: 'It becomes the button people tap to sign up.' });
      return;
    }
    if (isOther && !organizer) {
      toast({ title: 'Name the partner', description: 'It is shown as the organiser on the event.' });
      return;
    }

    setBusy('saving');
    const startsAt = lisbonToIso(draft.date, draft.start_time);
    const sourceEventId = `${slug(organizer)}-${draft.date}-${draft.start_time.replace(':', '')}-${slug(draft.title)}`;
    const repeating = repeat.recurrence !== 'one-off';
    const seriesKey = `${chosen.source}:${sourceEventId}`;
    const { error } = await supabase.from('events').insert({
      source: chosen.source,
      source_event_id: sourceEventId,
      ...(repeating
        ? { recurrence: repeat.recurrence, repeat_until: repeat.until || null, series_key: seriesKey, generate_dates: true }
        : {}),
      source_url: url,
      title: draft.title.trim(),
      description: draft.description,
      starts_at: startsAt,
      ends_at: draft.end_time ? lisbonToIso(draft.date, draft.end_time) : null,
      time_label: draft.end_time ? `${draft.start_time}–${draft.end_time}` : draft.start_time,
      venue_name: draft.venue_name,
      image_url: /^https?:\/\//.test(imageUrl.trim()) ? imageUrl.trim() : null,
      location: draft.location ?? 'Porto',
      organizer_name: organizer,
      organizer_bio: draft.organizer_bio?.trim() ? draft.organizer_bio.trim() : null,
      category: draft.category,
      price_label: draft.price_label,
      vibe: draft.vibe,
      group_size: draft.group_size,
      women_only: draft.women_only,
      lgbtq_friendly: !!draft.lgbtq_friendly,
      pet_friendly: !!draft.pet_friendly,
      tags: featured ? ['sync-partner', 'featured'] : ['sync-partner'],
      classified: true,
      review_status: status,
      reviewed_at: status === 'approved' ? new Date().toISOString() : null,
    });
    setBusy(null);

    if (error) {
      toast({
        title: 'Could not save',
        description: error.code === '23505' ? 'This event is already in SYNC.' : error.message,
      });
      return;
    }
    // A repeating event gets its upcoming dates now, with the same status.
    let added = 0;
    if (repeating) {
      const { data } = await supabase.rpc('extend_event_series', { _series_key: seriesKey });
      added = data ?? 0;
    }
    toast({
      title: status === 'approved' ? 'Event published' : 'Added to Waiting',
      description: added ? `${added} upcoming date${added === 1 ? '' : 's'} added as well.` : undefined,
    });
    reset();
    setOpen(false);
    onAdded();
  };

  const field = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add partner event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a partner event</DialogTitle>
          <DialogDescription>
            Paste the details as the partner shared them. SYNC drafts the listing; you check it before it goes in.
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Partner</Label>
                <Select value={partner} onValueChange={setPartner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isOther && (
                <div className="space-y-1.5">
                  <Label htmlFor="partner-name">Partner name</Label>
                  <Input
                    id="partner-name"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Another Porto"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-link">Registration link</Label>
              <Input
                id="reg-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pasted">Event details</Label>
              <Textarea
                id="pasted"
                rows={9}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste the caption, message or email here — any language is fine."
              />
            </div>
            <DialogFooter>
              <Button onClick={read} disabled={busy !== null || pasted.trim().length < 10}>
                {busy === 'reading' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Read details
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {draft.warnings.length > 0 && (
              <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm space-y-1">
                {draft.warnings.map((w) => (
                  <p key={w} className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {w}
                  </p>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => field('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={draft.date ?? ''} onChange={(e) => field('date', e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input
                  type="time"
                  value={draft.start_time ?? ''}
                  onChange={(e) => field('start_time', e.target.value || null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ends</Label>
                <Input
                  type="time"
                  value={draft.end_time ?? ''}
                  onChange={(e) => field('end_time', e.target.value || null)}
                />
              </div>
            </div>
            <RepeatFields value={repeat} onChange={setRepeat} date={draft.date ?? ''} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Input value={draft.venue_name ?? ''} onChange={(e) => field('venue_name', e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={draft.location ?? ''} onChange={(e) => field('location', e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  value={draft.price_label ?? ''}
                  onChange={(e) => field('price_label', e.target.value || null)}
                  placeholder="Free"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(v) => field('category', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Registration link</Label>
              <Input
                type="url"
                value={draft.registration_url ?? ''}
                onChange={(e) => field('registration_url', e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image-url">Cover image</Label>
              {/^https?:\/\//.test(imageUrl.trim()) && (
                <img
                  src={imageUrl.trim()}
                  alt="Cover preview"
                  className="h-32 w-full rounded-lg object-cover border border-border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  onLoad={(e) => (e.currentTarget.style.display = '')}
                />
              )}
              <Input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Found from the link automatically, or paste an image address"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <Label htmlFor="featured">Feature on SYNC</Label>
                <p className="text-xs text-muted-foreground">Pins it to the Featured spotlight at the top of the feed.</p>
              </div>
              <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
            </div>
            <div className="space-y-1.5">
              <Label>Filters</Label>
              <EventFlagToggles
                value={{
                  women_only: draft.women_only,
                  lgbtq_friendly: !!draft.lgbtq_friendly,
                  pet_friendly: !!draft.pet_friendly,
                }}
                onChange={(flags) => setDraft((d) => (d ? { ...d, ...flags } : d))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={draft.description ?? ''}
                onChange={(e) => field('description', e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="host-bio">Host bio (optional)</Label>
              <Textarea
                id="host-bio"
                rows={3}
                maxLength={1500}
                value={draft.organizer_bio ?? ''}
                onChange={(e) => field('organizer_bio', e.target.value || null)}
                placeholder={`A few lines from ${organizer || 'the host'} about themselves. Shown as "About the host".`}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy !== null}>
                Back
              </Button>
              <Button variant="outline" onClick={() => save('pending')} disabled={busy !== null}>
                Add to Waiting
              </Button>
              <Button onClick={() => save('approved')} disabled={busy !== null}>
                {busy === 'saving' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Publish now
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPartnerEventDialog;
