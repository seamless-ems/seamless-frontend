import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MissingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export default function MissingFormDialog({
  open,
  onOpenChange,
  eventId,
}: MissingFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Speaker Form Not Found
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            We couldn't find a saved "Speaker Information" form for this
            event. Please create and save your speaker information form first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                window.location.href = `/organizer/event/${eventId}/speakers/forms`;
              }}
            >
              Go to Forms
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
