import { Event } from '@/types/event';

type Toast = (opts: { title: string; description?: string }) => unknown;

/** Opens the native share sheet, or copies a deep link to the event and confirms with a toast. */
export async function shareEvent(event: Pick<Event, 'id' | 'title'>, toast: Toast) {
  const url = `${window.location.origin}/?q=${encodeURIComponent(event.title)}&event=${event.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: event.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Share it with a friend.' });
  } catch {
    /* share sheet dismissed */
  }
}
