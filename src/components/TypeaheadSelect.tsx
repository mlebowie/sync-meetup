import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TypeaheadOption {
  value: string;
  label: string;
  leading?: React.ReactNode; // e.g. flag emoji
  sub?: string; // secondary text
  searchText?: string; // extra text matched on
}

interface TypeaheadSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: TypeaheadOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
allowFreeText?: boolean; // accept arbitrary typed input as the value
  showChevron?: boolean; // render a dropdown chevron on the right side
}

export const TypeaheadSelect = ({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyText = 'No matches',
  disabled,
allowFreeText = false,
  showChevron = false,
}: TypeaheadSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Selected option's display (for leading flag etc)
  const selected = useMemo(
    () => options.find(o => o.value.toLowerCase() === value.toLowerCase()),
    [options, value]
  );

  const display = open ? query : (selected?.label ?? value);

  const filtered = useMemo(() => {
    const q = (open ? query : '').trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      `${o.label} ${o.sub ?? ''} ${o.searchText ?? ''}`.toLowerCase().includes(q)
    );
  }, [options, query, open]);

  const handleSelect = (opt: TypeaheadOption) => {
    onChange(opt.value);
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQuery(selected?.label ?? value ?? ''); }}>
      <PopoverTrigger asChild>
        <div className="relative">
          {selected?.leading && !open && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
              {selected.leading}
            </span>
          )}
{showChevron && (
            <ChevronDown
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-transform',
                open && 'rotate-180'
              )}
            />
          )}
          <Input
            id={id}
            value={display}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => {
              setOpen(true);
              setQuery(e.target.value);
              if (allowFreeText) onChange(e.target.value);
            }}
            onFocus={() => setOpen(true)}
            className={cn(selected?.leading && !open && 'pl-9', showChevron && 'pr-9')}
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <ul className="py-1">
            {filtered.map(opt => {
              const isSel = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors',
                      isSel && 'bg-accent/60'
                    )}
                  >
                    {opt.leading && <span className="text-base">{opt.leading}</span>}
                    <span className="flex-1">
                      <span className="text-foreground">{opt.label}</span>
                      {opt.sub && <span className="ml-2 text-xs text-muted-foreground">{opt.sub}</span>}
                    </span>
                    {isSel && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
