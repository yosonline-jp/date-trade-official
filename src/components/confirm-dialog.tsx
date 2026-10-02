import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AlertDialogProps = {
  title: string;
  description: string;
  open: boolean;
  closeText?: string;
  confirmText?: string;
  confirmClassName?: string;
  confirmAction: () => void;
  onOpenChange: (open: boolean) => void;
};

export const ConfirmDialog = ({
  title,
  description,
  open,
  closeText = "Cancel",
  confirmText = "Continue",
  confirmClassName = "bg-destructive text-white hover:bg-destructive/80",
  confirmAction,
  onOpenChange,
}: AlertDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{closeText}</AlertDialogCancel>
          <AlertDialogAction
            className={confirmClassName}
            onClick={confirmAction}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
