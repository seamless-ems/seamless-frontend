import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SpeakerForm from "@/components/SpeakerForm";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Download,
  Code,
  CheckCircle,
  Clock,
  Upload,
  Image,
  FileText,
  Linkedin,
  Mail,
  Building,
  User,
  Edit,
  Eye,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Speaker } from "@/types/event";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateSpeaker, uploadFile } from "@/lib/api";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";

export default function SpeakerPortal() {
  const { id, speakerId } = useParams();

  const { data: speaker, isLoading, error } = useQuery<Speaker | null, Error>({
    queryKey: ["event", id, "speaker", speakerId],
    queryFn: () => getJson<Speaker>(`/events/${id}/speakers/${speakerId}`),
    enabled: Boolean(id && speakerId),
  });

  const s = speaker
    ? {
      id: speaker.id,
      name: `${(speaker as any).first_name ?? ((speaker as any).name ?? "")} ${(speaker as any).last_name ?? ""}`.trim(),
      firstName: (speaker as any).first_name ?? undefined,
      lastName: (speaker as any).last_name ?? undefined,
      email: (speaker as any).email ?? (speaker as any).email_address ?? "",
      companyName: (speaker as any).company_name ?? "",
      companyRole: (speaker as any).company_role ?? "",
      headshot: (speaker as any).headshot_url ?? (speaker as any).headshot ?? null,
      companyLogo: (speaker as any).company_logo ?? (speaker as any).companyLogo ?? null,
      linkedin: (speaker as any).linkedin ?? null,
      bio: (speaker as any).bio ?? "",
      intakeFormStatus: (speaker as any).intake_form_status ?? (speaker as any).intakeFormStatus ?? "",
      websiteCardApproved: (speaker as any).website_card_approved ?? (speaker as any).websiteCardApproved ?? false,
      promoCardApproved: (speaker as any).promo_card_approved ?? (speaker as any).promoCardApproved ?? false,
    }
    : null;

  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // No need to sync edit fields with s, SpeakerForm will handle initial values

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/organizer/event/${id}/speakers`}>
              <ChevronLeft className="h-4 w-4" />
              Back to Speakers
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={s?.headshot ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">{(s?.firstName || s?.lastName) ? `${(s.firstName ?? "")[0] ?? ""}${(s.lastName ?? "")[0] ?? ""}` : "?"}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : "Loading…"}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {s ? `${s.companyRole ?? ""}${s.companyName ? ` at ${s.companyName}` : ""}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{s?.email ?? ""}</span>
                  </div>
                  {s?.linkedin && (
                    <a
                      href={s.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {s?.intakeFormStatus === "submitted" || s?.intakeFormStatus === "approved" ? "Form Submitted" : "Form Pending"}
                  </Badge>
                  {s?.websiteCardApproved && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      Website Card Approved
                    </Badge>
                  )}
                  {s?.promoCardApproved && (
                    <Badge
                      variant="outline"
                      className="bg-accent/10 text-accent border-accent/20"
                    >
                      Promo Card Approved
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="teal" size="sm">
                  <Mail className="h-4 w-4" />
                  Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={Boolean(editOpen)} onOpenChange={(v) => setEditOpen(Boolean(v))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Speaker</DialogTitle>
              <DialogDescription>Update speaker details</DialogDescription>
            </DialogHeader>
            <SpeakerForm
              initialValues={{
                firstName: s?.firstName ?? "",
                lastName: s?.lastName ?? "",
                email: s?.email ?? "",
                companyName: s?.companyName ?? "",
                companyRole: s?.companyRole ?? "",
                linkedin: s?.linkedin ?? "",
                bio: s?.bio ?? "",
              }}
              submitLabel="Save"
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values) => {
                if (!id || !speakerId) return;
                try {
                  await updateSpeaker(id, speakerId, {
                    first_name: values.firstName,
                    last_name: values.lastName,
                    email: values.email,
                    companyName: values.companyName,
                    companyRole: values.companyRole,
                    linkedin: values.linkedin,
                    bio: values.bio,
                  });
                  queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                  queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                  setEditOpen(false);
                  toast({ title: "Speaker updated" });
                } catch (err: any) {
                  toast({ title: "Failed to update speaker", description: String(err?.message || err) });
                }
              }}
            />
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="info">Speaker Info</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="embed">Embed Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={s?.firstName ?? ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={s?.lastName ?? ""} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={s?.email ?? ""} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Role</Label>
                      <Input value={s?.companyRole ?? ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={s?.companyName ?? ""} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={s?.linkedin ?? ""} readOnly />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={speaker?.bio ?? ""}
                    readOnly
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Headshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square max-w-[300px] rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    {s?.headshot ? (
                      <img
                        src={s.headshot ?? undefined}
                        alt="Headshot"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No headshot uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      ref={headshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!id || !speakerId) return;
                        try {
                          setUploadingHeadshot(true);
                          const res = await uploadFile(file, "speaker", undefined, speakerId, id);
                          const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                          if (!url) throw new Error("Upload did not return a file url");
                          // Build full payload from existing speaker to satisfy backend validation
                          const payload: any = {
                            first_name: (speaker as any)?.first_name ?? (speaker as any)?.firstName ?? "",
                            last_name: (speaker as any)?.last_name ?? (speaker as any)?.lastName ?? "",
                            email: (speaker as any)?.email ?? (speaker as any)?.email_address ?? "",
                            company_name: (speaker as any)?.company ?? (speaker as any)?.company_name ?? "",
                            company_role: (speaker as any)?.company_role ?? (speaker as any)?.companyRole ?? (speaker as any)?.title ?? "",
                            bio: (speaker as any)?.bio ?? "",
                            linkedin: (speaker as any)?.linkedin ?? "",
                            headshot: url,
                          };
                          await updateSpeaker(id, speakerId, payload);
                          queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                          queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                          toast({ title: "Headshot replaced" });
                        } catch (err: any) {
                          toast({ title: "Failed to replace headshot", description: String(err?.message || err) });
                        } finally {
                          setUploadingHeadshot(false);
                          // clear the input so same file can be selected again
                          if (headshotInputRef.current) headshotInputRef.current.value = "";
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => headshotInputRef.current?.click()} disabled={uploadingHeadshot}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => headshotInputRef.current?.click()} disabled={uploadingHeadshot}>
                      <Upload className="h-4 w-4" />
                      {uploadingHeadshot ? "Uploading…" : "Replace"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Company Logo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video max-w-[300px] rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    {s?.companyLogo ? (
                      <img
                        src={s.companyLogo ?? undefined}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain p-4"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No logo uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!id || !speakerId) return;
                        try {
                          setUploadingLogo(true);
                          const res = await uploadFile(file, "speaker", undefined, speakerId, id);
                          const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                          if (!url) throw new Error("Upload did not return a file url");
                          const payload: any = {
                            first_name: (speaker as any)?.first_name ?? (speaker as any)?.firstName ?? "",
                            last_name: (speaker as any)?.last_name ?? (speaker as any)?.lastName ?? "",
                            email: (speaker as any)?.email ?? (speaker as any)?.email_address ?? "",
                            company_name: (speaker as any)?.company ?? (speaker as any)?.company_name ?? "",
                            company_role: (speaker as any)?.company_role ?? (speaker as any)?.companyRole ?? (speaker as any)?.title ?? "",
                            bio: (speaker as any)?.bio ?? "",
                            linkedin: (speaker as any)?.linkedin ?? "",
                            company_logo: url,
                          };
                          await updateSpeaker(id, speakerId, payload);
                          queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                          queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                          toast({ title: "Company logo replaced" });
                        } catch (err: any) {
                          toast({ title: "Failed to replace logo", description: String(err?.message || err) });
                        } finally {
                          setUploadingLogo(false);
                          if (logoInputRef.current) logoInputRef.current.value = "";
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? "Uploading…" : "Replace"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Website Card</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      s?.websiteCardApproved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    {s?.websiteCardApproved ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border bg-card p-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/5 flex-shrink-0">
                        {s?.headshot ? (
                          <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
                        ) : (
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary/10 text-primary font-display">{s?.firstName || s?.lastName ? `${(s.firstName ?? "")[0] ?? ""}${(s.lastName ?? "")[0] ?? ""}` : "?"}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {s?.companyRole ?? ""}
                        </p>
                        <p className="text-sm text-primary flex items-center gap-2">
                          {s?.companyName ?? ""}
                          {s?.companyLogo && (
                            <img src={s.companyLogo} alt="Company logo" className="h-4 object-contain ml-1" />
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {!s?.websiteCardApproved && (
                      <Button variant="teal" size="sm">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Promo Card</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      s?.promoCardApproved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    {s?.promoCardApproved ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-[4/5] rounded-xl text-primary-foreground p-6 flex flex-col justify-end mb-4 overflow-hidden">
                    {s?.headshot ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${s.headshot})` }}
                        aria-hidden
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" aria-hidden />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10 pointer-events-none" />

                    {s?.companyLogo && (
                      <img
                        src={s.companyLogo}
                        alt="Company logo"
                        className="absolute top-3 right-3 h-12 w-auto opacity-90 object-contain z-10"
                      />
                    )}

                    <div className="relative z-20 space-y-2">
                      <h4 className="font-display text-xl font-bold drop-shadow-md">
                        {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                      </h4>
                      <p className="text-sm opacity-90 drop-shadow-sm">{s?.companyRole ?? ""}</p>
                      <p className="text-sm font-semibold drop-shadow-sm">
                        {s?.companyName ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4" />
                      Email to Speaker
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Website Card Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-foreground">
                    {`<iframe src="${(typeof window !== 'undefined' ? window.location.origin : 'https://seamlessevents.io')}/event/${id}/speakers/embed/speaker/${speakerId ?? s?.id ?? ""}" width="300" height="200" frameborder="0"></iframe>`}
                  </code>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Copy className="h-4 w-4" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Promo Card Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-foreground">
                    {`<iframe src="${(typeof window !== 'undefined' ? window.location.origin : 'https://seamlessevents.io')}/event/${id}/speakers/embed/promo/${speakerId ?? s?.id ?? ""}" width="400" height="500" frameborder="0"></iframe>`}
                  </code>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Copy className="h-4 w-4" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
