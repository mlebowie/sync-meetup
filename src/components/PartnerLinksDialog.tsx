import { useCallback, useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Partner {
  id: string;
  name: string;
  submit_token: string | null;
  submit_enabled: boolean;
}

/** Same shape as the database's new_submit_token(): name, then six random characters. */
const newToken = (name: string) =>
  `${name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).padStart(6, '0').slice(0, 6)}`;

const linkFor = (token: string) => `${window.location.origin}/submit/${token}`;

/**
 * Each SYNC partner's private link for sending their events. Copy a link to
 * share it, switch one off, or replace it if it was shared too widely.
 */
export default function PartnerLinksDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('partner_organisers')
      .select('id,name,submit_token,submit_enabled')
      .order('name');
    if (error) toast({ title: 'Could not load partners', description: error.message });
    setPartners((data ?? []) as Partner[]);
  }, [toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const copy = async (p: Partner) => {
    if (!p.submit_token) return;
    try {
      await navigator.clipboard.writeText(linkFor(p.submit_token));
      toast({ title: 'Link copied', description: `Send it to ${p.name}.` });
    } catch {
      toast({ title: 'Copy this link', description: linkFor(p.submit_token) });
    }
  };

  const save = async (id: string, patch: Partial<Partner>) => {
    const { error } = await supabase.from('partner_organisers').update(patch).eq('id', id);
    if (error) toast({ title: 'Could not save', description: error.message });
    load();
  };

  const addPartner = async () => {
    const name = newName.trim();
    if (!name) return;
    const match = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[[:space:]]*');
    const { error } = await supabase
      .from('partner_organisers')
      .insert({ name, match, submit_token: newToken(name), auto_merge: false });
    if (error) {
      toast({ title: 'Could not add partner', description: error.code === '23505' ? 'That partner is already here.' : error.message });
      return;
    }
    setNewName('');
    load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-1" /> Partner links
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partner links</DialogTitle>
          <DialogDescription>
            Each partner's own link for sending events. What they send lands in Waiting for you to check.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {partners.map((p) => (
            <li key={p.id} className="py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm">{p.name}</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {p.submit_enabled ? 'On' : 'Off'}
                  <Switch checked={p.submit_enabled} onCheckedChange={(v) => save(p.id, { submit_enabled: v })} />
                </label>
              </div>
              {p.submit_token ? (
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {linkFor(p.submit_token)}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => copy(p)} disabled={!p.submit_enabled}>
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => save(p.id, { submit_token: newToken(p.name) })}
                    title="The old link stops working"
                  >
                    New link
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => save(p.id, { submit_token: newToken(p.name) })}>
                  Create link
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 pt-2">
          <Input placeholder="New partner's name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={addPartner} disabled={!newName.trim()}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
