import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ExternalLink, ImagePlus, Loader2, Save, Undo2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/categories';
import {
  BULK_FIELDS,
  MISSING_LABELS,
  applyBulk,
  draftToPatch,
  missingFields,
  sameDraft,
  toDraft,
  type BulkField,
  type PartnerDraft,
  type PartnerRow,
} from '@/lib/partnerReview';

const VIBE = ['chill', 'social', 'lively'];
const GROUP = ['small', 'medium', 'large'];
const FLAGS: { key: 'women_only' | 'lgbtq_friendly' | 'pet_friendly' | 'good_first_event'; label: string }[] = [
  { key: 'women_only', label: 'Women only' },
  { key: 'lgbtq_friendly', label: 'LGBTQ+ friendly' },
  { key: 'pet_friendly', label: 'Pet friendly' },
  { key: 'good_first_event', label: 'Good first event' },
];

const sentLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Lisbon' });

interface Props {
  /** Tells /curate how many submissions are waiting, for the tab label. */
  onCount?: (n: number) => void;
}

/**
 * Events partners sent through their /submit link, in one table to check and
 * complete before publishing. Edits stay local until Save; select rows to set
 * one value on all of them, then publish or hide them together. An event can
 * only be published once nothing is missing.
 */
export default function PartnerSubmissionsPanel({ onCount }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PartnerDraft>>({});
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [bulkField, setBulkField] = useState<BulkField>('price_label');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [bulkFlag, setBulkFlag] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: ps }] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('review_status', 'pending')
        .not('submitted_by', 'is', null)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(300),
      supabase.from('partner_organisers').select('id,name'),
    ]);
    if (error) toast({ title: 'Could not load partner submissions', description: error.message });
    const list = ((data ?? []) as unknown as PartnerRow[]).map((r) => ({
      ...r,
      category: r.category ? normalizeCategory(r.category, r.title) : r.category,
    }));
    setRows(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.id, toDraft(r)])));
    setPartners(Object.fromEntries((ps ?? []).map((p) => [p.id, p.name])));
    setSelected(new Set());
    setLoading(false);
    onCount?.(list.length);
  }, [toast, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  const original = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, toDraft(r)])), [rows]);
  const dirtyIds = useMemo(
    () => rows.filter((r) => drafts[r.id] && !sameDraft(drafts[r.id], original[r.id])).map((r) => r.id),
    [rows, drafts, original],
  );

  const partnerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => r.submitted_by && counts.set(r.submitted_by, (counts.get(r.submitted_by) ?? 0) + 1));
    return Array.from(counts, ([id, n]) => ({ id, name: partners[id] ?? 'Partner', n })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rows, partners]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (partnerFilter === 'all' || r.submitted_by === partnerFilter) &&
          (!onlyIncomplete || missingFields(drafts[r.id] ?? toDraft(r)).length > 0),
      ),
    [rows, drafts, partnerFilter, onlyIncomplete],
  );

  const selectedVisible = visible.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allChecked = visible.length > 0 && selectedVisible.length === visible.length;

  const edit = (id: string, patch: Partial<PartnerDraft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const applyToSelected = () => {
    const meta = BULK_FIELDS.find((f) => f.field === bulkField)!;
    const value = meta.kind === 'flag' ? bulkFlag : bulkValue;
    setDrafts((d) => applyBulk(d, selectedVisible, bulkField, value));
    toast({
      title: `${meta.label} set on ${selectedVisible.length} event${selectedVisible.length === 1 ? '' : 's'}`,
      description: 'Not saved yet. Check the rows, then Save changes.',
    });
  };

  /** Saves the given drafts; returns the ids that failed. */
  const save = async (ids: string[]) => {
    const failed: string[] = [];
    for (const id of ids) {
      const d = drafts[id];
      if (!d.date || !d.start || !d.title.trim()) {
        failed.push(id);
        continue;
      }
      const { error } = await supabase
        .from('events')
        .update({ ...draftToPatch(d), reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) failed.push(id);
    }
    return failed;
  };

  const saveAll = async () => {
    setBusy('save');
    const failed = await save(dirtyIds);
    setBusy(null);
    if (failed.length) {
      toast({ title: `${failed.length} event${failed.length === 1 ? '' : 's'} could not be saved`, description: 'Each needs a title, date and start time.' });
    } else {
      toast({ title: `${dirtyIds.length} change${dirtyIds.length === 1 ? '' : 's'} saved` });
    }
    // Keep unsaved drafts that failed; reload the rest.
    const keep = Object.fromEntries(failed.map((id) => [id, drafts[id]]));
    await load();
    if (failed.length) setDrafts((d) => ({ ...d, ...keep }));
  };

  const publish = async (ids: string[]) => {
    const ready = ids.filter((id) => missingFields(drafts[id]).length === 0);
    const skipped = ids.length - ready.length;
    if (!ready.length) {
      toast({ title: 'Nothing published', description: 'Fill in the missing details first.' });
      return;
    }
    setBusy('publish');
    const failed = await save(ready.filter((id) => dirtyIds.includes(id)));
    const toPublish = ready.filter((id) => !failed.includes(id));
    const { error } = await supabase
      .from('events')
      .update({ review_status: 'approved', reviewed_at: new Date().toISOString(), review_note: null })
      .in('id', toPublish);
    setBusy(null);
    if (error) {
      toast({ title: 'Publish failed', description: error.message });
      return;
    }
    toast({
      title: `${toPublish.length} event${toPublish.length === 1 ? '' : 's'} published`,
      description: skipped ? `${skipped} still missing details and stayed here.` : undefined,
    });
    await load();
  };

  const hide = async (ids: string[]) => {
    setBusy('hide');
    const { error } = await supabase
      .from('events')
      .update({ review_status: 'rejected', reviewed_at: new Date().toISOString(), review_note: 'Hidden in partner review' })
      .in('id', ids);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not hide', description: error.message });
      return;
    }
    toast({ title: `${ids.length} event${ids.length === 1 ? '' : 's'} hidden` });
    await load();
  };

  const uploadPhoto = async (id: string, file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ title: 'Choose an image under 5 MB', description: 'JPG, PNG, WebP or GIF.' });
      return;
    }
    setBusy(id);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('event-images').upload(path, file, { contentType: file.type, upsert: true });
    setBusy(null);
    if (error) {
      toast({ title: 'Could not upload the photo', description: error.message });
      return;
    }
    edit(id, { image_url: supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl });
  };

  const bulkMeta = BULK_FIELDS.find((f) => f.field === bulkField)!;

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No partner submissions waiting.</p>;
  }

  const cellInput = 'h-8 text-xs px-2';

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Events partners sent through their link. The automatic curator never publishes these. An event can be published
        once nothing is marked missing; anything still here 24 hours before it starts is hidden.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners ({rows.length})</SelectItem>
            {partnerOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.n})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={onlyIncomplete} onCheckedChange={setOnlyIncomplete} />
          Only incomplete
        </label>
        <div className="ml-auto flex items-center gap-2">
          {dirtyIds.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDrafts(original)} disabled={!!busy}>
                <Undo2 className="h-4 w-4 mr-1" /> Discard
              </Button>
              <Button size="sm" onClick={saveAll} disabled={!!busy}>
                {busy === 'save' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save changes ({dirtyIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedVisible.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
          <span className="text-sm font-medium px-1">{selectedVisible.length} selected</span>
          <Select value={bulkField} onValueChange={(v) => { setBulkField(v as BulkField); setBulkValue(''); }}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULK_FIELDS.map((f) => (
                <SelectItem key={f.field} value={f.field}>
                  Set {f.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bulkMeta.kind === 'flag' ? (
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={bulkFlag} onCheckedChange={setBulkFlag} /> {bulkFlag ? 'On' : 'Off'}
            </label>
          ) : bulkMeta.kind === 'category' || bulkMeta.kind === 'vibe' || bulkMeta.kind === 'group' ? (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {(bulkMeta.kind === 'category' ? EVENT_CATEGORIES : bulkMeta.kind === 'vibe' ? VIBE : GROUP).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 text-xs w-[240px]"
              type={bulkMeta.kind === 'time' ? 'time' : bulkMeta.kind === 'url' ? 'url' : 'text'}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkMeta.kind === 'url' ? 'https://…' : bulkMeta.label}
            />
          )}
          <Button size="sm" variant="outline" onClick={applyToSelected}>
            Apply
          </Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => publish(selectedVisible)}>
              <Check className="h-4 w-4 mr-1" /> Publish selected
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => hide(selectedVisible)}>
              <X className="h-4 w-4 mr-1" /> Hide selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full min-w-[1240px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="p-2 w-8">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) =>
                    setSelected(v === true ? new Set([...selected, ...visible.map((r) => r.id)]) : new Set())
                  }
                  aria-label="Select all"
                />
              </th>
              <th className="p-2 w-6" />
              <th className="p-2 w-12">Photo</th>
              <th className="p-2">Title</th>
              <th className="p-2 w-[130px]">Date</th>
              <th className="p-2 w-[88px]">Starts</th>
              <th className="p-2 w-[88px]">Ends</th>
              <th className="p-2">Venue</th>
              <th className="p-2">Address</th>
              <th className="p-2 w-[110px]">Price</th>
              <th className="p-2 w-[170px]">Category</th>
              <th className="p-2 w-[150px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const d = drafts[r.id];
              if (!d) return null;
              const missing = missingFields(d);
              const dirty = dirtyIds.includes(r.id);
              const expanded = open.has(r.id);
              const soon = new Date(r.starts_at).getTime() - Date.now() < 24 * 3600_000;
              const bad = (k: keyof typeof MISSING_LABELS) => (missing.includes(k) ? 'border-destructive' : '');
              return (
                <Fragment key={r.id}>
                  <tr className={`border-t align-top ${dirty ? 'bg-amber-50/60' : ''} ${selected.has(r.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-2">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => setSelected((s) => toggle(s, r.id))}
                        aria-label={`Select ${d.title}`}
                      />
                    </td>
                    <td className="p-2">
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setOpen((s) => toggle(s, r.id))}
                        aria-label={expanded ? 'Hide details' : 'Show details'}
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-2">
                      {d.image_url ? (
                        <img src={d.image_url} alt="" className="h-9 w-12 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="h-9 w-12 rounded border border-dashed border-destructive grid place-items-center text-[10px] text-destructive">
                          none
                        </div>
                      )}
                    </td>
                    <td className="p-2 min-w-[180px]">
                      <Input className={`${cellInput} ${bad('title')}`} value={d.title} onChange={(e) => edit(r.id, { title: e.target.value })} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {partners[r.submitted_by ?? ''] ?? r.organizer_name} · sent {sentLabel(r.created_at)}
                      </p>
                    </td>
                    <td className="p-2">
                      <Input type="date" className={`${cellInput} ${bad('when')}`} value={d.date} onChange={(e) => edit(r.id, { date: e.target.value })} />
                    </td>
                    <td className="p-2">
                      <Input type="time" className={`${cellInput} ${bad('when')}`} value={d.start} onChange={(e) => edit(r.id, { start: e.target.value })} />
                    </td>
                    <td className="p-2">
                      <Input type="time" className={cellInput} value={d.end} onChange={(e) => edit(r.id, { end: e.target.value })} />
                    </td>
                    <td className="p-2 min-w-[130px]">
                      <Input className={`${cellInput} ${bad('where')}`} value={d.venue_name} onChange={(e) => edit(r.id, { venue_name: e.target.value })} />
                    </td>
                    <td className="p-2 min-w-[150px]">
                      <Input className={`${cellInput} ${bad('where')}`} value={d.location} onChange={(e) => edit(r.id, { location: e.target.value })} />
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <Input className={`${cellInput} ${bad('price_label')}`} value={d.price_label} onChange={(e) => edit(r.id, { price_label: e.target.value })} />
                    </td>
                    <td className="p-2">
                      <Select value={d.category} onValueChange={(v) => edit(r.id, { category: v })}>
                        <SelectTrigger className={`h-8 text-xs ${bad('category')}`}>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 space-y-1">
                      {missing.length ? (
                        <Badge className="block w-fit rounded-md bg-red-100 text-red-900 border-red-300 hover:bg-red-100 text-[11px] font-normal leading-snug">
                          Missing: {missing.map((k) => MISSING_LABELS[k]).join(', ')}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-100 text-[11px] font-normal">
                          Ready
                        </Badge>
                      )}
                      {dirty && <Badge variant="outline" className="text-[11px] font-normal">Unsaved</Badge>}
                      {soon && <Badge variant="outline" className="text-[11px] font-normal">Starts within 24h</Badge>}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className={`border-t-0 ${dirty ? 'bg-amber-50/60' : ''}`}>
                      <td colSpan={2} />
                      <td colSpan={10} className="p-2 pb-4">
                        <div className="grid gap-3 md:grid-cols-2 max-w-[1080px]">
                          <label className="space-y-1 text-xs text-muted-foreground md:row-span-2">
                            Description
                            <Textarea
                              rows={7}
                              className={bad('description')}
                              value={d.description}
                              onChange={(e) => edit(r.id, { description: e.target.value })}
                            />
                          </label>
                          <div className="space-y-2">
                            <label className="block space-y-1 text-xs text-muted-foreground">
                              Cover image link
                              <div className="flex gap-2">
                                <Input
                                  className={`h-8 text-xs ${bad('image_url')}`}
                                  type="url"
                                  value={d.image_url}
                                  onChange={(e) => edit(r.id, { image_url: e.target.value })}
                                  placeholder="https://…"
                                />
                                <Button size="sm" variant="outline" asChild disabled={busy === r.id}>
                                  <label className="cursor-pointer whitespace-nowrap">
                                    {busy === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      className="sr-only"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = '';
                                        if (f) uploadPhoto(r.id, f);
                                      }}
                                    />
                                  </label>
                                </Button>
                              </div>
                            </label>
                            <label className="block space-y-1 text-xs text-muted-foreground">
                              Registration link
                              <Input
                                className="h-8 text-xs"
                                type="url"
                                value={d.register_url}
                                onChange={(e) => edit(r.id, { register_url: e.target.value })}
                                placeholder="https://…"
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {(
                                [
                                  ['vibe', VIBE, 'Vibe'],
                                  ['group_size', GROUP, 'Group size'],
                                ] as const
                              ).map(([field, options, label]) => (
                                <Select key={field} value={d[field]} onValueChange={(v) => edit(r.id, { [field]: v })}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder={label} />
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
                          </div>
                          <div className="space-y-2">
                            <label className="block space-y-1 text-xs text-muted-foreground">
                              Host bio (optional)
                              <Textarea
                                rows={2}
                                maxLength={1500}
                                value={d.organizer_bio}
                                onChange={(e) => edit(r.id, { organizer_bio: e.target.value })}
                              />
                            </label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {FLAGS.map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 text-xs">
                                  <Checkbox checked={d[key]} onCheckedChange={(v) => edit(r.id, { [key]: v === true })} />
                                  {label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {r.review_note && <span className="text-xs text-muted-foreground">Note: {r.review_note}</span>}
                          <div className="ml-auto flex gap-2">
                            <Button size="sm" variant="ghost" asChild>
                              <a href={r.source_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" /> Original
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => hide([r.id])}>
                              <X className="h-4 w-4 mr-1" /> Hide
                            </Button>
                            <Button size="sm" disabled={!!busy || missing.length > 0} onClick={() => publish([r.id])}>
                              <Check className="h-4 w-4 mr-1" /> {dirty ? 'Save and publish' : 'Publish'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
