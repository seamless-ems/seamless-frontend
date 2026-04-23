import { useState } from "react";
import { Link, Check, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "viewer" | "editor";

interface ShareEntry {
  email: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  viewer: "View only",
  editor: "Can edit",
};


export default function ShareDialog({
  open,
  onOpenChange,
  title = "Share",
  description = "Give teammates access to view or manage this content.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventName?: string;
  title?: string;
  description?: string;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [pendingRole, setPendingRole] = useState<Role>("viewer");
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [linkAccess, setLinkAccess] = useState<"restricted" | "anyone">("restricted");
  const [linkRole, setLinkRole] = useState<Role>("viewer");
  const [copied, setCopied] = useState(false);

  function addShare() {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    if (shares.some((s) => s.email === email)) return;
    setShares((prev) => [...prev, { email, role: pendingRole }]);
    setEmailInput("");
  }

  function updateRole(email: string, role: Role) {
    setShares((prev) => prev.map((s) => (s.email === email ? { ...s, role } : s)));
  }

  function removeShare(email: string) {
    setShares((prev) => prev.filter((s) => s.email !== email));
  }

  function copyLink() {
    // TODO: generate real shareable link
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Add people */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add people by email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addShare()}
                className="flex-1 h-9 text-sm"
              />
              <Select value={pendingRole} onValueChange={(v) => setPendingRole(v as Role)}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["viewer", "editor"] as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addShare} disabled={!emailInput.trim().includes("@")}>
                Add
              </Button>
            </div>
          </div>

          {/* People with access */}
          {shares.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">People with access</p>
              <div className="space-y-1 rounded-lg border border-border divide-y divide-border">
                {shares.map(({ email, role }) => (
                  <div key={email} className="flex items-center justify-between px-3 py-2.5 gap-3">
                    <span className="text-sm truncate flex-1">{email}</span>
                    <Select
                      value={role}
                      onValueChange={(v) => {
                        if (v === "__remove__") removeShare(email);
                        else updateRole(email, v as Role);
                      }}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs border-0 shadow-none px-2 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["viewer", "editor"] as Role[]).map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                        <SelectItem value="__remove__" className="text-xs text-destructive">
                          Remove access
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General access */}
          <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">General access</p>
          <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
            {linkAccess === "anyone"
              ? <Globe className="h-4 w-4 text-accent shrink-0" />
              : <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Select value={linkAccess} onValueChange={(v) => setLinkAccess(v as "restricted" | "anyone")}>
                <SelectTrigger className="w-auto h-auto p-0 border-0 shadow-none font-medium text-sm text-foreground focus:ring-0 [&>svg]:ml-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="anyone">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
              {linkAccess === "anyone" && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <Select value={linkRole} onValueChange={(v) => setLinkRole(v as Role)}>
                    <SelectTrigger className="w-auto h-auto p-0 border-0 shadow-none text-xs text-accent hover:text-accent/80 focus:ring-0 [&>svg]:ml-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["viewer", "editor"] as Role[]).map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
