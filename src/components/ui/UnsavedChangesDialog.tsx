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
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  /** Save changes then leave */
  onSave?: () => void;
  /** Leave without saving */
  onDiscard: () => void;
  /** Stay on the page */
  onCancel: () => void;
}

export function UnsavedChangesDialog({ open, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <AlertDialogCancel onClick={onCancel} className="mt-0">
            Keep editing
          </AlertDialogCancel>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={onDiscard}>
              Discard changes
            </Button>
            {onSave && (
              <AlertDialogAction onClick={onSave}>
                Save changes
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
