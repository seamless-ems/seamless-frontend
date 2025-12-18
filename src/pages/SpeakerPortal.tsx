import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateSpeaker } from "@/lib/api";
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

// Speaker data will be fetched from the API per route params

export default function SpeakerPortal() {
  const { id, speakerId } = useParams();

  const { data: speaker, isLoading, error } = useQuery<Speaker | null, Error>({
    queryKey: ["event", id, "speaker", speakerId],
    queryFn: () => getJson<Speaker>(`/events/${id}/speakers/${speakerId}`),
    enabled: Boolean(id && speakerId),
  });

  // Normalize API snake_case response to UI-friendly fields
  const s = speaker
    ? {
      id: speaker.id,
      name: `${(speaker as any).first_name ?? ((speaker as any).name ?? "")} ${(speaker as any).last_name ?? ""}`.trim(),
      firstName: (speaker as any).first_name ?? undefined,
      lastName: (speaker as any).last_name ?? undefined,
      email: (speaker as any).email ?? (speaker as any).email_address ?? "",
      title: (speaker as any).title ?? "",
      company: (speaker as any).company ?? "",
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
  const [editFirstName, setEditFirstName] = useState<string>(s?.firstName ?? "");
  const [editLastName, setEditLastName] = useState<string>(s?.lastName ?? "");
  const [editEmail, setEditEmail] = useState<string>(s?.email ?? "");
  const [editTitle, setEditTitle] = useState<string>(s?.title ?? "");
  const [editCompany, setEditCompany] = useState<string>(s?.company ?? "");
  const [editLinkedin, setEditLinkedin] = useState<string>(s?.linkedin ?? "");

  useEffect(() => {
    setEditFirstName(s?.firstName ?? "");
    setEditLastName(s?.lastName ?? "");
    setEditEmail(s?.email ?? "");
    setEditTitle(s?.title ?? "");
    setEditCompany(s?.company ?? "");
    setEditLinkedin(s?.linkedin ?? "");
  }, [s]);

  return (
    <DashboardLayout eventId={id}>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/event/${id}/speakers`}>
              <ChevronLeft className="h-4 w-4" />
              Back to Speakers
            </Link>
          </Button>
        </div>

        {/* Speaker Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={s?.headshot ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">
                  {(s?.firstName || s?.lastName) ? `${(s.firstName ?? "")[0] ?? ""}${(s.lastName ?? "")[0] ?? ""}` : "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : "Loading…"}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {s ? `${s.title ?? ""}${s.company ? ` at ${s.company}` : ""}` : ""}
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

        {/* Edit Dialog */}
        <Dialog open={Boolean(editOpen)} onOpenChange={(v) => setEditOpen(Boolean(v))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Speaker</DialogTitle>
              <DialogDescription>Update speaker details</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id || !speakerId) return;
                try {
                  await updateSpeaker(id, speakerId, {
                    first_name: editFirstName,
                    last_name: editLastName,
                    email: editEmail,
                    title: editTitle,
                    company: editCompany,
                    linkedin: editLinkedin,
                  });
                  queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                  queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                  setEditOpen(false);
                  toast({ title: "Speaker updated" });
                } catch (err: any) {
                  toast({ title: "Failed to update speaker", description: String(err?.message || err) });
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="First name" />
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Last name" />
              </div>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" />
              </div>
              <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="LinkedIn URL" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Main Content Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="info">Speaker Info</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="embed">Embed Codes</TabsTrigger>
          </TabsList>

          {/* Speaker Info Tab */}
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
                      <Label>Title</Label>
                      <Input value={s?.title ?? ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={s?.company ?? ""} readOnly />
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

          {/* Assets Tab */}
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
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      Replace
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
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      Replace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Website Card */}
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
                  {/* Preview Card */}
                  <div className="rounded-xl border border-border bg-card p-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/5 flex-shrink-0">
                        {s?.headshot ? (
                          <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
                        ) : (
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary/10 text-primary font-display">
                              {s?.firstName || s?.lastName ? `${(s.firstName ?? "")[0] ?? ""}${(s.lastName ?? "")[0] ?? ""}` : "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {s?.title ?? ""}
                        </p>
                        <p className="text-sm text-primary flex items-center gap-2">
                          {s?.company ?? ""}
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

              {/* Promo Card */}
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
                  {/* Promo Card Preview */}
                  <div className="relative aspect-[4/5] rounded-xl text-primary-foreground p-6 flex flex-col justify-end mb-4 overflow-hidden">
                    {/* Full-bleed headshot background when available */}
                    {s?.headshot ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${s.headshot})` }}
                        aria-hidden
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" aria-hidden />
                    )}

                    {/* subtle dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10 pointer-events-none" />

                    {/* Decorative company logo in corner */}
                    {s?.companyLogo && (
                      <img
                        src={s.companyLogo}
                        alt="Company logo"
                        className="absolute top-3 right-3 h-12 w-auto opacity-90 object-contain z-10"
                      />
                    )}

                    {/* content (above overlays) */}
                    <div className="relative z-20 space-y-2">
                      <h4 className="font-display text-xl font-bold drop-shadow-md">
                        {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                      </h4>
                      <p className="text-sm opacity-90 drop-shadow-sm">{s?.title ?? ""}</p>
                      <p className="text-sm font-semibold drop-shadow-sm">
                        {s?.company ?? ""}
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

          {/* Embed Codes Tab */}
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
                    {`<iframe src="https://seamlessevents.io/embed/speaker/${s?.id ?? ""}" width="300" height="200" frameborder="0"></iframe>`}
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
                    {`<iframe src="https://seamlessevents.io/embed/promo/${s?.id ?? ""}" width="400" height="500" frameborder="0"></iframe>`}
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
    </DashboardLayout>
  );
}
