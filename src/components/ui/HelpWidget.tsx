import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { sendHelp } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

const STORAGE_KEY = "seamless-help-widget-dismissed";

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setDismissed(v === "1");
    } catch {}
  }, []);

  const mut = useMutation({
    mutationFn: (body: { message: string }) => sendHelp(body),
    onSuccess: () => {
      toast({ title: "Help request sent", description: "Thanks — we will get back to you." });
      setMessage("");
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send help message", description: String(err?.message || err), variant: 'destructive' });
    }
  });

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div>
      {/* Floating action button */}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="w-[320px] max-w-[90vw] rounded-lg border border-border bg-card shadow-lg p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Label className="text-sm">Quick help</Label>
                <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue briefly" />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button variant="ghost" onClick={() => { setOpen(false); setMessage(""); }}>Close</Button>
                  <Button
                    onClick={() => mut.mutate({ message })}
                    disabled={!message.trim() || mut.isLoading}
                  >{mut.isLoading ? 'Sending…' : 'Send'}</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOpen((v) => !v)} className="h-10 px-3">
            Help
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="h-10 px-2">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
