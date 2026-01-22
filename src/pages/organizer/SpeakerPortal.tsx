import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SpeakerForm from "@/components/SpeakerForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  CheckCircle,
  Clock,
  Edit,
  AlertCircle,
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

  const { data: eventData } = useQuery<any>({
    queryKey: ["event", id],
    queryFn: async () => {
      const data = await getJson<any>(`/events/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const s = speaker
    ? {
      id: speaker.id,
      name: `${(speaker as any).firstName ?? (speaker as any).first_name ?? ((speaker as any).name ?? "")} ${(speaker as any).lastName ?? (speaker as any).last_name ?? ""}`.trim(),
      firstName: (speaker as any).firstName ?? (speaker as any).first_name ?? undefined,
      lastName: (speaker as any).lastName ?? (speaker as any).last_name ?? undefined,
      email: (speaker as any).email ?? (speaker as any).email_address ?? "",
      companyName: (speaker as any).companyName ?? (speaker as any).company_name ?? "",
      companyRole: (speaker as any).companyRole ?? (speaker as any).company_role ?? "",
      headshot: (speaker as any).headshot ?? (speaker as any).headshotUrl ?? (speaker as any).headshot_url ?? null,
      companyLogo: (speaker as any).companyLogo ?? (speaker as any).company_logo ?? null,
      linkedin: (speaker as any).linkedin ?? null,
      bio: (speaker as any).bio ?? "",
      intakeFormStatus: (speaker as any).intakeFormStatus ?? (speaker as any).intake_form_status ?? "",
      websiteCardApproved: (speaker as any).websiteCardApproved ?? (speaker as any).website_card_approved ?? false,
      promoCardApproved: (speaker as any).promoCardApproved ?? (speaker as any).promo_card_approved ?? false,
    }
    : null;

  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"headshot" | "logo" | null>(null);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // TODO: Replace with API data when available - speaker status and internal notes fields missing
  const [internalNotes, setInternalNotes] = useState("");

  // Approval state - both cards approved together
  const isApproved = s?.websiteCardApproved && s?.promoCardApproved;
  const canApprove = Boolean(s?.headshot); // Can only approve if headshot exists

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!id || !speakerId) return;

    const isHeadshot = cropType === "headshot";
    try {
      if (isHeadshot) {
        setUploadingHeadshot(true);
      } else {
        setUploadingLogo(true);
      }

      // Convert blob to file
      const file = new File([croppedBlob], `${cropType}.jpg`, { type: "image/jpeg" });
      const res = await uploadFile(file, "speaker", undefined, speakerId, id);
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error("Upload did not return a file url");

      const payload: any = {
        first_name: (speaker as any)?.first_name ?? (speaker as any)?.firstName ?? "",
        last_name: (speaker as any)?.last_name ?? (speaker as any)?.lastName ?? "",
        email: (speaker as any)?.email ?? "",
        company_name: (speaker as any)?.company ?? (speaker as any)?.company_name ?? "",
        company_role: (speaker as any)?.company_role ?? (speaker as any)?.companyRole ?? "",
        bio: (speaker as any)?.bio ?? "",
        linkedin: (speaker as any)?.linkedin ?? "",
      };

      if (isHeadshot) {
        payload.headshot = url;
        // Reset approval when new headshot is uploaded
        payload.website_card_approved = false;
        payload.promo_card_approved = false;
      } else {
        payload.company_logo = url;
      }

      await updateSpeaker(id, speakerId, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
      toast({ title: `${isHeadshot ? "Headshot" : "Company logo"} updated${isHeadshot ? " - approval reset" : ""}` });
    } catch (err: any) {
      toast({ title: `Failed to upload ${isHeadshot ? "headshot" : "logo"}`, description: String(err?.message || err) });
    } finally {
      if (isHeadshot) {
        setUploadingHeadshot(false);
        if (headshotInputRef.current) headshotInputRef.current.value = "";
      } else {
        setUploadingLogo(false);
        if (logoInputRef.current) logoInputRef.current.value = "";
      }
      setCropImageUrl(null);
      setCropType(null);
    }
  };

  const handleApproval = async () => {
    if (!id || !speakerId || !canApprove) return;

    try {
      const payload: any = {
        first_name: (speaker as any)?.first_name ?? (speaker as any)?.firstName ?? "",
        last_name: (speaker as any)?.last_name ?? (speaker as any)?.lastName ?? "",
        email: (speaker as any)?.email ?? "",
        company_name: (speaker as any)?.company ?? (speaker as any)?.company_name ?? "",
        company_role: (speaker as any)?.company_role ?? (speaker as any)?.companyRole ?? "",
        bio: (speaker as any)?.bio ?? "",
        linkedin: (speaker as any)?.linkedin ?? "",
        website_card_approved: !isApproved,
        promo_card_approved: !isApproved,
      };

      await updateSpeaker(id, speakerId, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
      toast({ title: isApproved ? "Cards unapproved" : "Cards approved for embed" });
    } catch (err: any) {
      toast({ title: "Failed to update approval", description: String(err?.message || err) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Speaker Information + Assets */}
      <Card>
        <CardContent className="p-6">
          {/* Header with Status Badge */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Speaker Information</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setEditOpen(true)}
              >
                <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-success text-white border-success hover:bg-success/90 hover:text-white"
              onClick={() => setStatusOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Ready
            </Button>
          </div>

          {/* Three-column grid: Info | Headshot | Logo */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-8">
            {/* Column 1: Speaker Information */}
            <div className="space-y-4">
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>First Name</div>
                <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{s?.firstName ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Name</div>
                <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{s?.lastName ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</div>
                <a
                  href={`mailto:${s?.email ?? ""}`}
                  style={{ fontSize: 'var(--font-body)', color: 'var(--primary)', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {s?.email ?? "-"}
                </a>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Title</div>
                <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{s?.companyRole ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Company</div>
                <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{s?.companyName ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>LinkedIn</div>
                <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{s?.linkedin ?? "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Bio</div>
                <Button variant="outline" size="sm" onClick={() => setBioOpen(true)}>View Bio</Button>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Internal Notes</div>
                <Button variant="outline" size="sm" onClick={() => setNotesOpen(true)}>View/Edit Notes</Button>
              </div>
            </div>

            {/* Column 2: Headshot */}
            <div className="text-center" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Headshot</div>
              <div
                className="relative w-[150px] h-[150px] rounded-lg border-2 border-border mb-2 overflow-hidden cursor-pointer bg-muted flex items-center justify-center"
                onClick={() => s?.headshot && window.open(s.headshot, '_blank')}
              >
                {s?.headshot ? (
                  <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
                ) : (
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">{s?.firstName?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <input
                ref={headshotInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setCropImageUrl(reader.result as string);
                    setCropType("headshot");
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => headshotInputRef.current?.click()}
                disabled={uploadingHeadshot}
              >
                {uploadingHeadshot ? "Uploading..." : "Replace"}
              </Button>
            </div>

            {/* Column 3: Company Logo */}
            <div className="text-center" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Logo</div>
              <div
                className="w-[150px] h-[150px] rounded-lg border-2 border-border mb-2 bg-white flex items-center justify-center p-4 cursor-pointer"
                onClick={() => s?.companyLogo && window.open(s.companyLogo, '_blank')}
              >
                {s?.companyLogo ? (
                  <img src={s.companyLogo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', lineHeight: 1.2 }}>
                    {s?.companyName ?? "No Logo"}
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setCropImageUrl(reader.result as string);
                    setCropType("logo");
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? "Uploading..." : "Replace"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Approval Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600, marginBottom: '4px' }}>
                Card Approval
              </h3>
              <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
                Approve this speaker to appear in public embeds (website and promo cards)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isApproved ? (
                <Button
                  variant="outline"
                  className="bg-success text-white border-success hover:bg-success/90 hover:text-white"
                  onClick={handleApproval}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approved for Embed
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleApproval}
                  disabled={!canApprove}
                >
                  {canApprove ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve for Embed
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Upload headshot to approve
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards 2-3: Website Card + Promo Card (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Website Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Website Card</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="bg-muted p-5 rounded-lg border-2 border-dashed border-border flex-1 flex flex-col">
              <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
                Final output: 600x280px
              </div>

              {/* Preview Card (Horizontal) */}
              <div className="bg-white rounded-lg p-5 flex gap-5 items-center shadow-sm mb-4">
                <div className="w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {s?.headshot ? (
                    <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
                  ) : (
                    <Avatar className="w-full h-full">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">{s?.firstName?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="flex-1">
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
                    {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    {s?.companyRole ?? ""}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
                    {s?.companyName ?? ""}
                  </div>
                  {s?.companyLogo && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                      <img src={s.companyLogo} alt="Company Logo" style={{ height: '24px', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Button variant="outline" className="flex-1">Download</Button>
                <Button variant="outline" className="flex-1">Embed</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promo Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Promo Card</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="bg-muted p-5 rounded-lg border-2 border-dashed border-border flex-1 flex flex-col">
              <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
                Final output: 1080x1080px
              </div>

              {/* Preview Card (Square) */}
              <div
                className="border-3 border-primary rounded-lg w-[200px] aspect-square mx-auto mb-4 relative overflow-hidden"
                style={{
                  backgroundImage: (eventData?.promo_card_template || eventData?.promoCardTemplate)
                    ? `url('${eventData?.promo_card_template ?? eventData?.promoCardTemplate}')`
                    : 'linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Optional overlay for better text readability */}
                <div className="absolute inset-0 bg-black/10"></div>

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 z-10">
                  <div className="w-[60px] h-[60px] rounded-lg mx-auto mb-2.5 overflow-hidden bg-white/90 border-2 border-white">
                    {s?.headshot ? (
                      <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar className="w-full h-full">
                        <AvatarFallback className="bg-primary/10 text-primary">{s?.firstName?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    {s?.firstName ? `${s.firstName} ${s.lastName ?? ""}` : ""}
                  </div>
                  <div style={{ fontSize: '10px', marginBottom: '2px', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {s?.companyRole ?? ""}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {s?.companyName ?? ""}
                  </div>
                  {s?.companyLogo && (
                    <div className="mt-2">
                      <img src={s.companyLogo} alt="Logo" className="h-6 mx-auto opacity-90" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Button variant="outline" className="flex-1">Download</Button>
                <Button variant="outline" className="flex-1">Embed</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 4: Content (Full Width) */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 px-8 bg-muted rounded-lg text-center">
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
              No active sessions
            </div>
            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Sessions will appear here when synced from Schedule module
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
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
                  company_name: values.companyName,
                  company_role: values.companyRole,
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

      <Dialog open={Boolean(bioOpen)} onOpenChange={(v) => setBioOpen(Boolean(v))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bio</DialogTitle>
          </DialogHeader>
          <Textarea
            value={s?.bio ?? ""}
            readOnly
            className="min-h-[200px]"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(notesOpen)} onOpenChange={(v) => setNotesOpen(Boolean(v))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal Notes</DialogTitle>
            <DialogDescription>Notes are only visible to your team</DialogDescription>
          </DialogHeader>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add internal notes about this speaker..."
            className="min-h-[150px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: "Internal notes feature coming soon", description: "Backend support needed" });
              setNotesOpen(false);
            }}>Save Notes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(statusOpen)} onOpenChange={(v) => setStatusOpen(Boolean(v))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Speaker Status</DialogTitle>
            <DialogDescription>Update the current status of this speaker</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-success/10 text-success border-success/20">
              <CheckCircle className="h-4 w-4 mr-2" />
              Ready
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Status tracking feature coming soon</p>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {cropImageUrl && (
        <ImageCropDialog
          open={Boolean(cropImageUrl)}
          onOpenChange={(open) => {
            if (!open) {
              setCropImageUrl(null);
              setCropType(null);
            }
          }}
          imageUrl={cropImageUrl}
          aspectRatio={cropType === "headshot" ? 1 : NaN}
          onCropComplete={handleCropComplete}
          title={cropType === "headshot" ? "Crop Headshot" : "Crop Company Logo"}
          instructions={
            cropType === "headshot"
              ? "Drag to reposition, scroll to zoom. Crop to square format for headshot."
              : "Drag to reposition, scroll to zoom. Crop to your preferred aspect ratio."
          }
        />
      )}
    </div>
  );
}
