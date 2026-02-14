import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSpeaker } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function AddSpeakerDialog({ eventId }: { eventId?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({ firstName: "", lastName: "", email: "", companyName: "", companyRole: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Speaker
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Speaker</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!eventId) return;
            setCreating(true);
            try {
              await createSpeaker(eventId, {
                id: crypto.randomUUID(), // Required field - backend expects client-generated UUID
                firstName: newSpeaker.firstName,
                lastName: newSpeaker.lastName,
                email: newSpeaker.email,
                companyName: newSpeaker.companyName,
                companyRole: newSpeaker.companyRole,
                formType: "speaker-info", // Required field - indicates this is a confirmed speaker, not a call-for-speakers application
              });
              toast({ title: "Speaker added" });
              queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
              setOpen(false);
              setNewSpeaker({ firstName: "", lastName: "", email: "", companyName: "", companyRole: "" });
            } catch (err: any) {
              console.error("Failed to add speaker - full error:", err);
              console.error("Error message:", err?.message);
              toast({ title: "Failed to add speaker", description: String(err?.message || err) });
            } finally {
              setCreating(false);
            }
          }}
          className="space-y-4"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm">First name</label>
              <Input value={newSpeaker.firstName} onChange={(e) => setNewSpeaker((s) => ({ ...s, firstName: e.target.value }))} required />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Last name</label>
              <Input value={newSpeaker.lastName} onChange={(e) => setNewSpeaker((s) => ({ ...s, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <Input type="email" value={newSpeaker.email} onChange={(e) => setNewSpeaker((s) => ({ ...s, email: e.target.value }))} required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Company Name" value={newSpeaker.companyName} onChange={(e) => setNewSpeaker((s) => ({ ...s, companyName: e.target.value }))} />
            <Input placeholder="Company Role" value={newSpeaker.companyRole} onChange={(e) => setNewSpeaker((s) => ({ ...s, companyRole: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="outline" className="border-[1.5px]" type="submit" disabled={creating}>{creating ? "Adding…" : "Add Speaker"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
