import { StickyNote } from 'lucide-react';
import { NOTE_MAX, useConnectionNote } from '@/lib/connectionNotes';
import { cn } from '@/lib/utils';

interface Props {
  personId: string;
  firstName: string;
  className?: string;
}

/**
 * Keywords about how you met someone, private to you. The same note shows on the Connections page
 * and in your 1:1 chat with them; it saves as you type.
 */
const ConnectionNoteField = ({ personId, firstName, className }: Props) => {
  const [note, setNote] = useConnectionNote(personId);
  return (
    <label className={cn('flex items-center gap-2 rounded-full border border-border bg-white px-3', className)}>
      <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Your keywords about {firstName}</span>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={NOTE_MAX}
        placeholder={`How you met ${firstName}: salsa, from Berlin…`}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
};

export default ConnectionNoteField;
