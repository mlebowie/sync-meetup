import { Button } from '@/components/ui/button';

/** Shown in place of momentum and activity until the member has been to an event. */
const FindFirstEventPrompt = ({ text }: { text: string }) => (
  <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
    <Button
      type="button"
      variant="link"
      className="mt-2 h-auto p-0 font-semibold"
      onClick={() => {
        const target = document.getElementById('first-event');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      Find your first event
    </Button>
  </div>
);

export default FindFirstEventPrompt;
