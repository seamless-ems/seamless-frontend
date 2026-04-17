import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  Bell,
  Shield,
  Palette,
  Upload,
  Mail,
  Globe,
} from "lucide-react";
import TeamSection from "@/components/organizer/TeamSection";

export default function Settings() {
  const qc = useQueryClient();

  const { data: me } = useQuery<any, Error>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: settings } = useQuery<any, Error>({ queryKey: ["settings"], queryFn: () => getSettings(), enabled: !!me });
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam(), enabled: !!me });
  const updateMeMut = useMutation({
    mutationFn: (body: any) => updateMe(body),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
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
      await updateMeMut.mutateAsync(  { name: vals.name, email: vals.email });
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
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences</p>
        </div>

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
            <CardDescription>Your personal information and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{me?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{me?.email ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Member since</div>
                <div className="font-medium">{me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Billing
            </CardTitle>
            <CardDescription>Manage subscription and payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Billing Portal</p>
                <p className="text-sm text-muted-foreground">Open your billing dashboard to manage invoices and your previous orders.</p>
              </div>
              <Button onClick={() => billingMut.mutate()} disabled={billingMut.isLoading}>
                {billingMut.isLoading ? 'Opening…' : 'Open Billing Portal'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div id="team-section">
          <TeamSection />
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
