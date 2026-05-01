import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MissingFormDialogProps {
  open: boolean;
  eventId: string;
}

export default function MissingFormDialog({
  open,
  eventId,
}: MissingFormDialogProps) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="[&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive">Intake Form required</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            You need a Speaker Intake Form before you can build a card template.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/organizer/event/${eventId}/speakers`)}
            >
              Back to Speakers
            </Button>
            <Button
              variant="destructive"
              onClick={() => navigate(`/organizer/event/${eventId}/speakers?edit-form=speaker-info`)}
            >
              Set up Intake Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
