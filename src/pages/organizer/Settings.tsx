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
import { getMe, updateMe, getSettings, updateSettings } from "@/lib/api";
import {
  User,
  Bell,
  Shield,
  Palette,
  Upload,
  Mail,
  Globe,
} from "lucide-react";
import OrganizationSection from "@/components/organizer/OrganizationSection";
import TeamSection from "@/components/organizer/TeamSection";

export default function Settings() {
  const qc = useQueryClient();

  const { data: me } = useQuery<any, Error>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: settings } = useQuery<any, Error>({ queryKey: ["settings"], queryFn: () => getSettings(), enabled: !!me });
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

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences</p>
        </div>

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
        <div className="space-y-8">
          <OrganizationSection />
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
