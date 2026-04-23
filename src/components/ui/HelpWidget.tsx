import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { sendHelp, getMe } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export const HELP_WIDGET_OPEN_EVENT = "seamless:open-help";

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(HELP_WIDGET_OPEN_EVENT, handler);
    return () => window.removeEventListener(HELP_WIDGET_OPEN_EVENT, handler);
  }, []);

  const mut = useMutation({
    mutationFn: (body: { message: string }) => sendHelp(body),
    onSuccess: () => {
      toast({ title: "Message sent" });
      setMessage("");
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: String(err?.message || err), variant: "destructive" });
    },
  });

  const handleClose = () => { setOpen(false); setMessage(""); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Talk to Team Seamless</DialogTitle>
            {me?.email && (
              <p className="text-sm text-muted-foreground">Submitting as <span className="font-medium text-foreground">{me.email}</span></p>
            )}
          </DialogHeader>
          <Textarea
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue…"
            className="resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => mut.mutate({ message })} disabled={!message.trim() || mut.isPending}>
              {mut.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed right-4 bottom-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="h-10 w-10 rounded-full bg-primary text-accent-foreground shadow-md flex items-center justify-center hover:bg-accent/90 transition-colors text-base font-semibold"
          aria-label="Help"
        >
          ?
        </button>
      </div>
    </>
  );
}
