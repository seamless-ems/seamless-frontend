import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SpeakerForm from "@/components/SpeakerForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  CheckCircle,
  Clock,
  Edit,
  AlertCircle,
} from "lucide-react";
// utils intentionally not used here
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
    
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import SpeakerInfoCard from "@/components/organizer/SpeakerInfoCard";
import SpeakerAssets from "@/components/organizer/SpeakerAssets";
import SpeakerApproval from "@/components/organizer/SpeakerApproval";
import SpeakerPreviews from "@/components/organizer/SpeakerPreviews";

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
    staleTime: 0, // Always refetch when component mounts
  });

  const s = speaker
    ? {
      id: speaker.id,
      name: `${(speaker as any).firstName ?? (speaker as any).first_name ?? ((speaker as any).name ?? "")} ${(speaker as any).lastName ?? (speaker as any).last_name ?? ""}`.trim(),
      firstName: (speaker as any).firstName ?? (speaker as any).first_name ?? undefined,
      lastName: (speaker as any).lastName ?? (speaker as any).last_name ?? undefined,
      email: (speaker as any).email ?? (speaker as any).email_address ?? "",
      formType: (speaker as any).formType ?? (speaker as any).form_type ?? "",
      companyName: (speaker as any).companyName ?? (speaker as any).company_name ?? "",
      companyRole: (speaker as any).companyRole ?? (speaker as any).company_role ?? "",
      headshot: (speaker as any).headshot ?? (speaker as any).headshotUrl ?? (speaker as any).headshot_url ?? null,
      companyLogo: (speaker as any).companyLogo ?? (speaker as any).company_logo ?? null,
      linkedin: (speaker as any).linkedin ?? null,
      bio: (speaker as any).bio ?? "",
      intakeFormStatus: (speaker as any).intakeFormStatus ?? (speaker as any).intake_form_status ?? "",
      websiteCardApproved: (speaker as any).websiteCardApproved ?? (speaker as any).website_card_approved ?? false,
      promoCardApproved: (speaker as any).promoCardApproved ?? (speaker as any).promo_card_approved ?? false,
      internalNotes: (speaker as any).internalNotes ?? (speaker as any).internal_notes ?? "",
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
      const res = await uploadFile(file, undefined, speakerId, id);
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error("Upload did not return a file url");

      if (isHeadshot) {
        s.headshot = url;
        // Reset approval when new headshot is uploaded
        s.websiteCardApproved = false;
        s.promoCardApproved = false;
      } else {
        s.companyLogo = url;
      }

      await updateSpeaker(id, speakerId, s);
      queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"], exact: false });
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
      s.websiteCardApproved = !isApproved;
      s.promoCardApproved = !isApproved; // Both cards approved together
      await updateSpeaker(id, speakerId, s);
      queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"], exact: false });
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

          {/* Three-column grid: Info | Headshot | Logo (extracted) */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-8">
            <div>
              <SpeakerInfoCard
                s={s}
                onEdit={() => setEditOpen(true)}
                onViewBio={() => setBioOpen(true)}
                onViewNotes={() => setNotesOpen(true)}
              />
            </div>

            <SpeakerAssets
              s={s}
              headshotInputRef={headshotInputRef}
              logoInputRef={logoInputRef}
              uploadingHeadshot={uploadingHeadshot}
              uploadingLogo={uploadingLogo}
              onSelectFile={(type, dataUrl) => {
                setCropImageUrl(dataUrl);
                setCropType(type);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Approval (extracted) */}
      <Card>
        <CardContent className="p-6">
          <SpeakerApproval
            isApproved={isApproved}
            canApprove={canApprove}
            onToggleApproval={handleApproval}
            onOpenStatus={() => setStatusOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Cards 2-3: Website Card + Promo Card (extracted) */}
      <SpeakerPreviews s={s} eventData={eventData} />

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
                queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"], exact: false });
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
            <Button onClick={async () => {
              if (!id || !speakerId) {
                toast({ title: "No event or speaker selected" });
                return;
              }
              try {
                s.internalNotes = internalNotes; // Optimistically update notes in UI
                await updateSpeaker(id, speakerId, s);
                queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"], exact: false });
                toast({ title: "Internal notes saved" });
                setNotesOpen(false);
              } catch (err: any) {
                toast({ title: "Failed to save notes", description: String(err?.message || err) });
              }
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
