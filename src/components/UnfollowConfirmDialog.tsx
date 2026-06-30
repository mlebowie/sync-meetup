import { Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  name: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const UnfollowConfirmDialog = ({ open, name, onOpenChange, onConfirm }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Unfollow {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            You won't see updates from {name} in your feed anymore. You can follow them again anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="No, keep following"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            aria-label="Yes, unfollow"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnfollowConfirmDialog;
