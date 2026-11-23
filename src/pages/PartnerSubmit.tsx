import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { primaryCta } from '@/lib/ctaStyles';
import syncWordmark from '@/assets/sync-wordmark-v2.png';
import { supabase } from '@/integrations/supabase/client';

/**
 * /submit/<token>: where a SYNC partner adds their upcoming events, one form per
 * event, with fields in the order of SYNC's events table. Several events go in
 * one send. They land in Emilie's Waiting queue; nothing publishes from here.
 */

/** Must match the onboarding interests (src/lib/userProfile.ts). */
const CATEGORIES = [
  'Arts & culture', 'Charity & non-profit', 'Cultural exchange', 'Dance', 'Dining & cooking', 'Education', 'Games',
  'Health & wellness', 'Languages', 'Music & live events', 'Outdoors activities', 'Pop-up events',
  'Professional development', 'Religion', 'Social networking', 'Spirituality', 'Sports', 'Tech & AI',
];

interface EventForm {
  source_url: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  location: string;
  photo: string | null;
  category: string;
  price_label: string;
  capacity: string;
  recurrence: string;
  repeat_until: string;
  women_only: boolean;
  lgbtq_friendly: boolean;
  pet_friendly: boolean;
  register_url: string;
  english: string;
}

const blank = (): EventForm => ({
  source_url: '',
  title: '',
  description: '',
  date: '',
  start_time: '',
  end_time: '',
  venue_name: '',
  location: '',
  photo: null,
  category: '',
  price_label: '',
  capacity: '',
  recurrence: 'one-off',
  repeat_until: '',
  women_only: false,
  lgbtq_friendly: false,
  pet_friendly: false,
  register_url: '',
  english: '',
});

const MAX_EVENTS = 15;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('partner-submit', { body });
  if (error) {
    let message = 'Something went wrong. Please try again.';
    try {
      const ctx = (error as { context?: Response }).context;
      const parsed = ctx ? await ctx.json() : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      /* keep the default */
    }
    throw new Error(message);
  }
  return data;
}

const readPhoto = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (file.size > MAX_PHOTO_BYTES) return reject(new Error('Photos can be up to 5 MB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.readAsDataURL(file);
  });

/** What still needs filling in before an event can be sent. */
const missing = (f: EventForm) =>
  [
    !f.title.trim() && 'title',
    !f.description.trim() && 'description',
    !f.date && 'date',
    !f.start_time && 'start time',
    !f.venue_name.trim() && 'venue',
    !f.category && 'category',
    !f.price_label.trim() && 'price',
    !f.english && 'language',
  ].filter(Boolean) as string[];

const Req = () => <span className="text-destructive" aria-hidden="true"> *</span>;

export default function PartnerSubmit() {
  const { token = '' } = useParams();
  const [partner, setPartner] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [forms, setForms] = useState<EventForm[]>([blank()]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ saved: string[]; problems: string[] } | null>(null);

  useEffect(() => {
    call({ token, action: 'info' })
      .then((d) => setPartner(d.partner))
      .catch((e) => setLinkError(e.message));
  }, [token]);

  const update = (i: number, patch: Partial<EventForm>) =>
    setForms((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  // A copy keeps everything but the date and times, for a series of similar events.
  const duplicate = (i: number) =>
    setForms((list) => [
      ...list.slice(0, i + 1),
      { ...list[i], date: '', start_time: '', end_time: '' },
      ...list.slice(i + 1),
    ]);

  const send = async () => {
    setShowErrors(true);
    if (forms.some((f) => missing(f).length)) {
      setError('Some events still need details (marked in red).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setSent(await call({ token, action: 'submit', events: forms }));
      setForms([blank()]);
      setShowErrors(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (i: number, name: string) => `${name}-${i}`;

  return (
    <main className="min-h-screen bg-[#FCFAF3]">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex justify-center">
          <img src={syncWordmark} alt="SYNC" className="h-8 w-auto" />
        </header>

        {linkError ? (
          <div className="bg-card rounded-2xl shadow-card p-6 text-center">
            <h1 className="font-display text-2xl font-light">This link isn't working</h1>
            <p className="mt-3 text-sm text-muted-foreground">{linkError}</p>
          </div>
        ) : !partner ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : sent ? (
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h1 className="font-display text-2xl font-light">Thank you, {partner}</h1>
            {sent.saved.length > 0 && (
              <div className="text-sm">
                <p>SYNC received {sent.saved.length === 1 ? 'this event' : `these ${sent.saved.length} events`}:</p>
                <ul className="mt-2 list-disc pl-5">
                  {sent.saved.map((t, k) => (
                    <li key={k}>{t}</li>
                  ))}
                </ul>
                <p className="mt-3 text-muted-foreground">
                  We'll check the details and publish them in SYNC, usually within a day.
                </p>
              </div>
            )}
            {sent.problems.length > 0 && (
              <div className="text-sm text-destructive">
                <p>Not sent:</p>
                <ul className="mt-1 list-disc pl-5">
                  {sent.problems.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" onClick={() => setSent(null)}>
              Add more events
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display text-[26px] leading-8 font-light sm:text-4xl">Add your events to SYNC</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Hi {partner}! Fill in one form per event. Use "Add another event" for more, or "Copy" to repeat
                one on another date. Fields marked <span className="text-destructive">*</span> are required.
              </p>
            </div>

            {forms.map((f, i) => {
              const gaps = showErrors ? missing(f) : [];
              const bad = (k: string) => (gaps.includes(k) ? 'border-destructive' : '');
              return (
                <section key={i} className="bg-card rounded-2xl shadow-card p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">Event {i + 1}</h2>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicate(i)}
                        disabled={forms.length >= MAX_EVENTS}
                      >
                        <Copy className="h-4 w-4 mr-1" /> Copy
                      </Button>
                      {forms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setForms((list) => list.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'source_url')}>Event page link</Label>
                    <Input
                      id={field(i, 'source_url')}
                      type="url"
                      placeholder="https:// (Instagram post, website, Luma…)"
                      value={f.source_url}
                      onChange={(e) => update(i, { source_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'title')}>
                      Title<Req />
                    </Label>
                    <Input
                      id={field(i, 'title')}
                      maxLength={80}
                      className={bad('title')}
                      value={f.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Short is best: 10 words at most.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'description')}>
                      Description<Req />
                    </Label>
                    <Textarea
                      id={field(i, 'description')}
                      rows={4}
                      className={bad('description')}
                      placeholder="What happens, who it's for, what's included."
                      value={f.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'date')}>
                        Date<Req />
                      </Label>
                      <Input
                        id={field(i, 'date')}
                        type="date"
                        className={bad('date')}
                        value={f.date}
                        onChange={(e) => update(i, { date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'start_time')}>
                        Starts<Req />
                      </Label>
                      <Input
                        id={field(i, 'start_time')}
                        type="time"
                        className={bad('start time')}
                        value={f.start_time}
                        onChange={(e) => update(i, { start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'end_time')}>Ends</Label>
                      <Input
                        id={field(i, 'end_time')}
                        type="time"
                        value={f.end_time}
                        onChange={(e) => update(i, { end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'venue_name')}>
                        Venue<Req />
                      </Label>
                      <Input
                        id={field(i, 'venue_name')}
                        className={bad('venue')}
                        value={f.venue_name}
                        onChange={(e) => update(i, { venue_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'location')}>Address</Label>
                      <Input
                        id={field(i, 'location')}
                        value={f.location}
                        onChange={(e) => update(i, { location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'photo')}>Photo</Label>
                    {f.photo && <img src={f.photo} alt="" className="h-32 w-full rounded-lg object-cover" />}
                    <Input
                      id={field(i, 'photo')}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          update(i, { photo: await readPhoto(file) });
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor={field(i, 'category')}>
                        Category<Req />
                      </Label>
                      <Select value={f.category || undefined} onValueChange={(v) => update(i, { category: v })}>
                        <SelectTrigger id={field(i, 'category')} className={bad('category')}>
                          <SelectValue placeholder="Choose" />
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
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'price_label')}>
                        Price<Req />
                      </Label>
                      <Input
                        id={field(i, 'price_label')}
                        placeholder="Free, €20…"
                        className={bad('price')}
                        value={f.price_label}
                        onChange={(e) => update(i, { price_label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'capacity')}>Spots</Label>
                      <Input
                        id={field(i, 'capacity')}
                        type="number"
                        min={1}
                        placeholder="e.g. 10"
                        value={f.capacity}
                        onChange={(e) => update(i, { capacity: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={field(i, 'recurrence')}>Repeats</Label>
                      <Select value={f.recurrence} onValueChange={(v) => update(i, { recurrence: v })}>
                        <SelectTrigger id={field(i, 'recurrence')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-off">Doesn't repeat</SelectItem>
                          <SelectItem value="weekly">Every week</SelectItem>
                          <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                          <SelectItem value="monthly">Every month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {f.recurrence !== 'one-off' && (
                      <div className="space-y-2">
                        <Label htmlFor={field(i, 'repeat_until')}>Until</Label>
                        <Input
                          id={field(i, 'repeat_until')}
                          type="date"
                          value={f.repeat_until}
                          onChange={(e) => update(i, { repeat_until: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">This event is</legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      {(
                        [
                          ['women_only', 'Women only'],
                          ['lgbtq_friendly', 'LGBTQ+ friendly'],
                          ['pet_friendly', 'Pet friendly'],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                          <Checkbox checked={f[key]} onCheckedChange={(v) => update(i, { [key]: v === true })} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'register_url')}>Sign-up or ticket link</Label>
                    <Input
                      id={field(i, 'register_url')}
                      type="url"
                      placeholder="https://"
                      value={f.register_url}
                      onChange={(e) => update(i, { register_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={field(i, 'english')}>
                      Language<Req />
                    </Label>
                    <Select value={f.english || undefined} onValueChange={(v) => update(i, { english: v })}>
                      <SelectTrigger id={field(i, 'english')} className={bad('language')}>
                        <SelectValue placeholder="Does it run in English?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">In English</SelectItem>
                        <SelectItem value="partly">English and Portuguese</SelectItem>
                        <SelectItem value="no">Portuguese only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gaps.length > 0 && <p className="text-xs text-destructive">Still needed: {gaps.join(', ')}</p>}
                </section>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setForms((list) => [...list, blank()])}
              disabled={forms.length >= MAX_EVENTS}
            >
              <Plus className="h-4 w-4 mr-1" /> Add another event
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className={primaryCta} disabled={busy} onClick={send}>
              {busy ? 'Sending…' : `Send ${forms.length === 1 ? 'event' : `${forms.length} events`} to SYNC`}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
