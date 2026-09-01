import { useEffect, useLayoutEffect, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TourStep {
  title: string;
  body: string;
  ref: RefObject<HTMLElement>;
}

interface Props {
  open: boolean;
  steps: TourStep[];
  onClose: (reason: 'completed' | 'skipped') => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;

const FilterTour = ({ open, steps, onClose }: Props) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const isMobile = useIsMobile();

  const step = steps[index];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Scroll the highlighted group into view whenever the step changes.
  useEffect(() => {
    if (!open || !step?.ref.current) return;
    step.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step?.ref.current) return;
    const measure = () => {
      const el = step.ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    const id = window.setInterval(measure, 100);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose('skipped');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !step) return null;

  const last = index === steps.length - 1;

  const card = (
    <div
      className="pointer-events-auto bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-4 w-[min(340px,calc(100vw-2rem))]"
      role="dialog"
      aria-label={step.title}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Step {index + 1} of {steps.length}
        </span>
        <button
          onClick={() => onClose('skipped')}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h4 className="text-base font-semibold mt-1">{step.title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
      <div className="flex items-center justify-between gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={() => onClose('skipped')}>
          Skip tour
        </Button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button variant="outline" size="sm" onClick={() => setIndex(i => i - 1)}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={() => (last ? onClose('completed') : setIndex(i => i + 1))}>
            {last ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );

  const cardStyle: React.CSSProperties = (() => {
    if (isMobile || !rect) return {};
    const below = rect.top + rect.height + 12;
    const fitsBelow = below + 200 < window.innerHeight;
    return {
      position: 'fixed',
      top: fitsBelow ? below : Math.max(16, rect.top - 212),
      left: Math.min(Math.max(16, rect.left), window.innerWidth - 356),
      zIndex: 101,
    };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim everything except the active filter group */}
      {rect ? (
        <div
          className="fixed rounded-2xl ring-2 ring-primary transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-foreground/55" />
      )}

      {isMobile ? (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-[101]">{card}</div>
      ) : (
        <div style={cardStyle}>{card}</div>
      )}
    </div>,
    document.body
  );
};

export default FilterTour;
