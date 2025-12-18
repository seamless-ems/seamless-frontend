import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Settings() {
  const qc = useQueryClient();

  const { data: me, isLoading: loadingMe } = useQuery<any, Error>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: settings, isLoading: loadingSettings } = useQuery<any, Error>({ queryKey: ["settings"], queryFn: () => getSettings(), enabled: !!me });

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
      first_name: me?.first_name ?? "",
      last_name: me?.last_name ?? "",
      email: me?.email ?? "",
      company: me?.company ?? "",
      notifications: settings ?? {},
    },
  });

  // Update form values when me/settings load
  React.useEffect(() => {
    form.reset({
      first_name: me?.first_name ?? "",
      last_name: me?.last_name ?? "",
      email: me?.email ?? "",
      company: me?.company ?? "",
      notifications: settings ?? {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, settings]);

  const onSave = form.handleSubmit(async (vals) => {
    try {
      await updateMeMut.mutateAsync({ first_name: vals.first_name, last_name: vals.last_name, email: vals.email, company: vals.company });
      await updateSettingsMut.mutateAsync(vals.notifications ?? settings ?? {});
    } catch (e) {
      // handled by mutation onError
    }
  });

  return (
    <DashboardLayout>
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
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={me?.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-display">{(me?.first_name?.[0] ?? "").toUpperCase()}{(me?.last_name?.[0] ?? "").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">JPG, PNG or GIF. Max 2MB</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...form.register("first_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...form.register("last_name")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...form.register("company")} />
            </div>

            <Button variant="teal" onClick={onSave} disabled={updateMeMut.status === "pending" || updateSettingsMut.status === "pending"}>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notifications - render based on settings if available */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Choose what notifications you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries((settings && settings.notifications) || {
              email: true,
              speaker_submissions: true,
              weekly_digest: false,
              marketing: false,
            }).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{`Preference for ${key}`}</p>
                </div>
                <Switch {...form.register(`notifications.${key}`)} defaultChecked={Boolean(value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Other sections unchanged, but they can be hooked to API later */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Integrations
            </CardTitle>
            <CardDescription>Connect external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Google Workspace</p>
                  <p className="text-sm text-muted-foreground">Connect Google Drive and Sheets</p>
                </div>
              </div>
              <Button variant="outline">Connect</Button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Tito</p>
                  <p className="text-sm text-muted-foreground">Ticketing platform integration</p>
                </div>
              </div>
              <Button variant="outline">Connect</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Change Password</Label>
              <div className="flex gap-4">
                <Input type="password" placeholder="Current password" />
                <Input type="password" placeholder="New password" />
                <Button variant="outline">Update</Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline">Enable</Button>
            </div>
          </CardContent>
        </Card>

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
    </DashboardLayout>
  );
}
