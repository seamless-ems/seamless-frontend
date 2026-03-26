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
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export default function MissingFormDialog({
  open,
  onOpenChange,
  eventId,
}: MissingFormDialogProps) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up your Intake Form first</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            Before building your speaker card template, you need to set up your Speaker Intake form. This tells speakers what information to submit — like their bio, headshot, and company logo.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate(`/organizer/event/${eventId}/speakers?edit-form=speaker-info`);
              }}
            >
              Set up Intake Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
