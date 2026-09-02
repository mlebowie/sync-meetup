import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Event } from '@/types/event';

interface CancelRegistrationDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const CancelRegistrationDialog = ({ event, open, onOpenChange, onConfirm }: CancelRegistrationDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Leave this event?</AlertDialogTitle>
        <AlertDialogDescription>
          You're about to cancel your registration for <strong>{event.title}</strong>. You'll lose access to
          the event group chat, and your spot may be taken by someone on the waitlist.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep my spot</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Yes, cancel registration
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default CancelRegistrationDialog;
