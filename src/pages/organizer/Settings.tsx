import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getMe, updateMe, getSettings, updateSettings, getTeam, getBillingPortal } from "@/lib/api";
import {
  User,
  Globe,
  HelpCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import TeamSection from "@/components/organizer/TeamSection";

export default function Settings() {
  const qc = useQueryClient();

  const { data: me } = useQuery<any, Error>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: settings } = useQuery<any, Error>({ queryKey: ["settings"], queryFn: () => getSettings(), enabled: !!me });
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam(), enabled: !!me });

  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");

  React.useEffect(() => {
    if (me?.name) setNameValue(me.name);
  }, [me?.name]);

  const updateMeMut = useMutation({
    mutationFn: (body: any) => updateMe(body),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      setEditingName(false);
    },
    onError: (err: any) => {
      toast.error(String(err));
    },
  });

  const updateSettingsMut = useMutation({
    mutationFn: (body: any) => updateSettings(body),
    onSuccess: () => {
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: any) => {
      toast.error(String(err));
    },
  });

  const form = useForm<any>({
    defaultValues: {
      name: me?.name ?? "",
      email: me?.email ?? "",
      createdAt: me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "",
    },
  });

  React.useEffect(() => {
    form.reset({
      name: me?.name ?? "",
      email: me?.email ?? "",
      createdAt: me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, settings]);

  const onSave = form.handleSubmit(async (vals) => {
    try {
      await updateMeMut.mutateAsync({ name: vals.name, email: vals.email });
      await updateSettingsMut.mutateAsync(vals.notifications ?? settings ?? {});
    } catch (e) {
      // handled by mutation onError
    }
  });

  // Billing portal
  const billingMut = useMutation({
    mutationFn: () => getBillingPortal(),
    onSuccess: (res: any) => {
      const url = res?.url ?? res?.portalUrl ?? res?.portal_url;
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        toast.error('Billing portal did not return a URL');
      }
    },
    onError: (err: any) => {
      toast.error(String(err?.message || err));
    },
  });

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Warning when user has no teams */}
        {Array.isArray(teams) && teams.length === 0 && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Team Required</CardTitle>
              <CardDescription className="text-destructive">You don't belong to a team yet. Create one below to get started with events and speakers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => {
                  const el = document.getElementById("team-section");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Create a team
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm items-center">
              <span className="text-muted-foreground">Name</span>
              <div className="flex items-center gap-1.5">
                {editingName ? (
                  <>
                    <Input
                      autoFocus
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMeMut.mutate({ name: nameValue });
                        if (e.key === "Escape") { setNameValue(me?.name ?? ""); setEditingName(false); }
                      }}
                      className="h-7 w-56"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => updateMeMut.mutate({ name: nameValue })} disabled={updateMeMut.isPending}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setNameValue(me?.name ?? ""); setEditingName(false); }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{me?.name ?? "—"}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(true)}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </div>
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{me?.email ?? "—"}</span>
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}</span>
            </div>
          </CardContent>
        </Card>
        <div id="team-section">
          <TeamSection />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.open("mailto:support@seamlessevents.io", "_blank")}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Get Help
          </Button>
          <Button variant="outline" onClick={() => billingMut.mutate()} disabled={billingMut.isPending}>
            <Globe className="h-4 w-4 mr-2" />
            {billingMut.isPending ? 'Opening…' : 'Billing Portal'}
          </Button>
        </div>
        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
