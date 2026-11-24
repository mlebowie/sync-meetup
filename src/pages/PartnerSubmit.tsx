import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { primaryCta } from '@/lib/ctaStyles';
import syncWordmark from '@/assets/sync-wordmark-v2.png';
import { supabase } from '@/integrations/supabase/client';

/**
 * /submit/<token>: where a SYNC partner sends their upcoming events. They paste
 * the details (one event or a whole list), check the drafts SYNC makes, add a
 * photo and send. Events go to Emilie's Waiting queue; nothing publishes here.
 */

interface Draft {
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  location: string | null;
  price_label: string | null;
  is_paid: boolean | null;
  english: string | null;
  recurrence: string;
  category: string;
  registration_url: string | null;
  women_only: boolean;
  photo?: string | null;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('partner-submit', { body });
  if (error) {
    // The function answers with a readable message even on errors.
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

export default function PartnerSubmit() {
  const { token = '' } = useParams();
  const [partner, setPartner] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [link, setLink] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ saved: string[]; problems: string[] } | null>(null);

  useEffect(() => {
    call({ token, action: 'info' })
      .then((d) => setPartner(d.partner))
      .catch((e) => setLinkError(e.message));
  }, [token]);

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const makeDrafts = async () => {
    setError(null);
    setBusy('draft');
    try {
      const d = await call({ token, action: 'draft', text: pasted, link: link.trim() || null });
      setDrafts(d.events);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const missing = (d: Draft) =>
    [!d.title.trim() && 'title', !d.date && 'date', !d.start_time && 'start time', !d.english && 'language']
      .filter(Boolean)
      .join(', ');
  const ready = drafts.length > 0 && drafts.every((d) => !missing(d));

  const send = async () => {
    setError(null);
    setBusy('send');
    try {
      setSent(await call({ token, action: 'submit', events: drafts }));
      setDrafts([]);
      setPasted('');
      setLink('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

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
                  {sent.saved.map((t) => (
                    <li key={t}>{t}</li>
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
                  {sent.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" onClick={() => setSent(null)}>
              Send more events
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display text-[26px] leading-8 font-light sm:text-4xl">Share your events with SYNC</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Hi {partner}! Paste your upcoming events as you'd post them, in English or Portuguese. One event or
                a whole list is fine.
              </p>
            </div>

            {drafts.length === 0 && (
              <div className="bg-card rounded-2xl shadow-card p-5 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pasted">Event details</Label>
                  <Textarea
                    id="pasted"
                    rows={8}
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    placeholder={'Bag charm workshop\n28 November, 10:00–11:30\nAlice in Brewland, Porto\n€20, 10 places'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Sign-up or ticket link (optional)</Label>
                  <Input
                    id="link"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  className={primaryCta}
                  disabled={pasted.trim().length < 10 || busy !== null}
                  onClick={makeDrafts}
                >
                  {busy === 'draft' ? 'Reading your events…' : 'Continue'}
                </Button>
              </div>
            )}

            {drafts.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Check each event, add a photo and tell us whether it runs in English. You can change anything.
                </p>
                {drafts.map((d, i) => (
                  <section key={i} className="bg-card rounded-2xl shadow-card p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium">Event {i + 1}</h2>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`title-${i}`}>Title</Label>
                      <Input id={`title-${i}`} value={d.title} onChange={(e) => update(i, { title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`date-${i}`}>Date</Label>
                        <Input
                          id={`date-${i}`}
                          type="date"
                          value={d.date ?? ''}
                          onChange={(e) => update(i, { date: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`start-${i}`}>Starts</Label>
                        <Input
                          id={`start-${i}`}
                          type="time"
                          value={d.start_time ?? ''}
                          onChange={(e) => update(i, { start_time: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`end-${i}`}>Ends</Label>
                        <Input
                          id={`end-${i}`}
                          type="time"
                          value={d.end_time ?? ''}
                          onChange={(e) => update(i, { end_time: e.target.value || null })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`venue-${i}`}>Venue</Label>
                        <Input
                          id={`venue-${i}`}
                          value={d.venue_name ?? ''}
                          onChange={(e) => update(i, { venue_name: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`address-${i}`}>Address</Label>
                        <Input
                          id={`address-${i}`}
                          value={d.location ?? ''}
                          onChange={(e) => update(i, { location: e.target.value || null })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`price-${i}`}>Price</Label>
                        <Input
                          id={`price-${i}`}
                          value={d.price_label ?? ''}
                          placeholder="Free, €20…"
                          onChange={(e) => update(i, { price_label: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`english-${i}`}>Runs in English?</Label>
                        <Select value={d.english ?? undefined} onValueChange={(v) => update(i, { english: v })}>
                          <SelectTrigger id={`english-${i}`}>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="partly">English and Portuguese</SelectItem>
                            <SelectItem value="no">Portuguese only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`repeat-${i}`}>Repeats</Label>
                        <Select value={d.recurrence} onValueChange={(v) => update(i, { recurrence: v })}>
                          <SelectTrigger id={`repeat-${i}`}>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`desc-${i}`}>Description</Label>
                      <Textarea
                        id={`desc-${i}`}
                        rows={4}
                        value={d.description ?? ''}
                        onChange={(e) => update(i, { description: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`link-${i}`}>Sign-up or ticket link</Label>
                      <Input
                        id={`link-${i}`}
                        type="url"
                        value={d.registration_url ?? ''}
                        onChange={(e) => update(i, { registration_url: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`photo-${i}`}>Photo</Label>
                      {d.photo && <img src={d.photo} alt="" className="h-32 w-full rounded-lg object-cover" />}
                      <Input
                        id={`photo-${i}`}
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
                    {missing(d) && <p className="text-xs text-destructive">Still needed: {missing(d)}</p>}
                  </section>
                ))}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  <Button className={primaryCta} disabled={!ready || busy !== null} onClick={send}>
                    {busy === 'send'
                      ? 'Sending…'
                      : `Send ${drafts.length === 1 ? 'event' : `${drafts.length} events`} to SYNC`}
                  </Button>
                  <Button variant="ghost" onClick={() => setDrafts([])} disabled={busy !== null}>
                    Start again
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
