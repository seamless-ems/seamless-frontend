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
import { updateSpeaker, uploadFile, getSpeakerContent, createSpeakerContent, getContentHistory, createNewContentVersion } from "@/lib/api";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
    
} from "@/components/ui/dialog";
import MissingFormDialog from "@/components/MissingFormDialog";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

  const { data: formConfig } = useQuery<any>({
    queryKey: ["formConfig", id, "speaker-info"],
    queryFn: async () => {
      const { getFormConfigForEvent } = await import("@/lib/api");
      const data = await getFormConfigForEvent(id!, "speaker-info");
      return data;
    },
    enabled: Boolean(id),
    onError: (err: any) => {
      if (err && (err.status === 404 || err?.status === 404)) {
        setMissingFormDialogOpen(true);
      }
    },
  });

  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);

  // Normalize formConfig to a fields array (support multiple API shapes)
  const configFields: any[] = (() => {
    if (!formConfig) return [];
    if (Array.isArray(formConfig)) return formConfig as any[];
    if (Array.isArray((formConfig as any).config)) return (formConfig as any).config as any[];
    if (Array.isArray((formConfig as any).fields)) return (formConfig as any).fields as any[];
    // support nested shape: { config: { fields: [...] } }
    if (Array.isArray((formConfig as any).config?.fields)) return (formConfig as any).config.fields as any[];
    return [];
  })();

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
      customFields: (speaker as any).customFields ?? (speaker as any).custom_fields ?? {},
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
  const [uploadingContent, setUploadingContent] = useState(false);
  const contentInputRef = useRef<HTMLInputElement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDocumentId, setHistoryDocumentId] = useState<string | null>(null);
  const historyUploadRef = useRef<HTMLInputElement | null>(null);
  // TODO: Replace with API data when available - speaker status and internal notes fields missing
  const [internalNotes, setInternalNotes] = useState("");

  function ContentList({ speakerId }: { speakerId: string }) {
    const { data: contentItems, isLoading: contentLoading } = useQuery<any[]>({
      queryKey: ["content", speakerId],
      queryFn: () => getSpeakerContent(speakerId),
      enabled: Boolean(speakerId),
    });

    if (!speakerId) return <div className="text-sm text-muted-foreground">No speaker selected</div>;
    if (contentLoading) return <div className="text-sm text-muted-foreground">Loading content…</div>;
    if (!contentItems || contentItems.length === 0) return <div className="text-sm text-muted-foreground">No content uploaded</div>;

    return (
      <div className="space-y-2">
        {contentItems.map((c: any) => {
          const url = c.content ?? c.url ?? c.publicUrl ?? c.public_url ?? "";
          const label = (() => {
            try {
              const u = new URL(url, window.location.href);
              return decodeURIComponent(u.pathname.split("/").pop() || url);
            } catch (e) {
              return url;
            }
          })();
          const docId = c.documentId ?? c.document_id ?? c.id;
          return (
            <div key={c.id ?? url} className="flex items-center justify-between gap-4 p-2 border rounded">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{c.contentType ?? c.content_type ?? ''}</div>
                <div className="text-xs text-muted-foreground">Version {c.version}</div>
                <div className="text-xs text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open</a>
                <Button size="sm" variant="ghost" onClick={() => {
                  setHistoryDocumentId(docId ?? null);
                  setHistoryOpen(true);
                }}>History</Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function HistoryDialog() {
    const docId = historyDocumentId;
    const { data: versions, isLoading: versionsLoading } = useQuery<any[]>({
      queryKey: ["content", speakerId, docId, "history"],
      queryFn: () => getContentHistory(String(speakerId), String(docId)),
      enabled: Boolean(historyOpen && speakerId && docId),
    });

    return (
      <Dialog open={Boolean(historyOpen)} onOpenChange={(v) => setHistoryOpen(Boolean(v))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document History</DialogTitle>
            <DialogDescription>View previous versions and upload a new version</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{docId}</div>
              <div>
                <input ref={historyUploadRef} type="file" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !speakerId || !docId) return;
                  try {
                    setUploadingContent(true);
                    const res = await uploadFile(file, speakerId, id);
                    const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                    if (!url) throw new Error('Upload did not return a file URL');
                    await createNewContentVersion(String(speakerId), String(docId), { content: url, contentType: file.type || 'application/octet-stream' });
                    queryClient.invalidateQueries({ queryKey: ["content", speakerId] });
                    queryClient.invalidateQueries({ queryKey: ["content", speakerId, docId, "history"] });
                    toast({ title: 'New version uploaded' });
                  } catch (err: any) {
                    toast({ title: 'Failed to upload new version', description: String(err?.message || err) });
                  } finally {
                    setUploadingContent(false);
                    if (e.target) e.target.value = "";
                  }
                }} />
                <Button size="sm" onClick={() => historyUploadRef.current?.click()}>Upload new version</Button>
              </div>
            </div>

            <div className="space-y-2">
              {versionsLoading && <div className="text-sm text-muted-foreground">Loading versions…</div>}
              {!versionsLoading && (!versions || versions.length === 0) && <div className="text-sm text-muted-foreground">No versions found</div>}
              {!versionsLoading && versions && versions.map((v: any) => (
                <div key={v.id ?? v.version} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium">Version {v.version}</div>
                    <div className="text-xs text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</div>
                  </div>
                  <div>
                    <a href={v.content ?? v.publicUrl ?? v.public_url ?? ''} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Approval state - both cards approved together
  const isApproved = s?.websiteCardApproved && s?.promoCardApproved;
  const canApprove = Boolean(s?.headshot); // Can only approve if headshot exists

  const infoStatus = s?.intakeFormStatus || "pending";
  const websiteApproved = s?.websiteCardApproved || false;
  const promoApproved = s?.promoCardApproved || false;
  const headshotUrl = s?.headshot || s?.headshotUrl || s?.headshot_url || null;
  const embedEnabled = s?.embedEnabled ?? s?.embed_enabled ?? false;
  const speakerStatus = (() => {
    if (infoStatus === "pending" || !headshotUrl) return { label: "Info Pending", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Waiting for the speaker to submit their information" };
    if (!websiteApproved || !promoApproved) return { label: "Card Approval Pending", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review and approve this speaker's cards" };
    if (!embedEnabled) return { label: "Cards Approved", cls: "bg-success/10 text-success border-success/30", tooltip: "Cards approved — add to your embed to publish" };
    return { label: "Published", cls: "bg-success/10 text-success border-success/30", tooltip: "Live on your website embed" };
  })();

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!id || !speakerId) return;

    const isHeadshot = cropType === "headshot";
    try {
      if (isHeadshot) {
        setUploadingHeadshot(true);
      } else {
        setUploadingLogo(true);
      }

      // Convert blob to file and preserve original mime/extension when possible
      const mime = (croppedBlob as Blob & { type?: string }).type || "image/jpeg";
      console.log("Cropped image mime type:", mime);
      const rawExt = mime.includes("/") ? mime.split("/")[1] : "jpeg";
      const ext = rawExt.split("+")[0] === "jpeg" ? "jpg" : rawExt.split("+")[0];
      const fileName = `${cropType}.${ext}`;
      const file = new File([croppedBlob], fileName, { type: mime });
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
      // Prepare payload so we only send the intended fields
      const payload: any = {
        id: speakerId,
        firstName: s?.firstName ?? "",
        lastName: s?.lastName ?? "",
        email: s?.email ?? "",
        formType: s?.formType ?? "speaker-info",
        websiteCardApproved: !isApproved,
        promoCardApproved: !isApproved,
      };

      // When approving, notify backend via speakerInformationStatus
      if (!isApproved) {
        payload.speakerInformationStatus = 'cards_approved';
      }

      await updateSpeaker(id, speakerId, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"], exact: false });
      toast({ title: isApproved ? "Cards unapproved" : "Cards approved for embed" });
    } catch (err: any) {
      toast({ title: "Failed to update approval", description: String(err?.message || err) });
    }
  };

  return (
    <div className="space-y-6">
      <MissingFormDialog open={missingFormDialogOpen} onOpenChange={setMissingFormDialogOpen} eventId={String(id)} />
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
            <div title={speakerStatus.tooltip}>
              <Badge variant="outline" className={`text-xs font-medium ${speakerStatus.cls}`}>
                {speakerStatus.label}
              </Badge>
            </div>
          </div>

          {/* Three-column grid: Info | Headshot | Logo (extracted) */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-8">
            <div>
              <SpeakerInfoCard
                s={s}
                formConfig={configFields}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Upload content files (PDF, image, video)</div>
                  <div>
                    <input
                      ref={contentInputRef}
                      type="file"
                      id="content-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !speakerId || !id) return;
                        try {
                          setUploadingContent(true);
                          const res = await uploadFile(file, speakerId, id);
                          const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                          if (!url) throw new Error('Upload did not return a file URL');
                          // Post metadata to content endpoint
                          await createSpeakerContent(speakerId, { content: url, contentType: file.type || undefined });
                          queryClient.invalidateQueries({ queryKey: ["event", id, "speaker", speakerId] });
                          queryClient.invalidateQueries({ queryKey: ["content", speakerId] });
                          toast({ title: 'Content uploaded' });
                        } catch (err: any) {
                          toast({ title: 'Failed to upload content', description: String(err?.message || err) });
                        } finally {
                          setUploadingContent(false);
                          if (e.target) e.target.value = "";
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => contentInputRef.current?.click()}>Choose file</Button>
                  </div>
                </div>

                {/* Content list */}
                <div>
                  <ContentList speakerId={speakerId ?? ""} />
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
              // Map custom fields: backend returns keys without underscores, but form config has underscores
              // So we need to map backend keys back to form config field IDs
              ...(() => {
                const customFieldValues: Record<string, any> = {};
                const customFields = s?.customFields || {};
                // use normalized `configFields` defined above

                // For each custom field in the config, try to find its value in the backend data
                configFields.forEach((field: any) => {
                  if (field.custom && field.enabled && field.type !== 'file') {
                    // Try exact match first
                    if (customFields[field.id]) {
                      customFieldValues[field.id] = customFields[field.id];
                    } else {
                      // Try without underscores (backend strips them)
                      const keyWithoutUnderscore = field.id.replace(/_/g, '');
                      if (customFields[keyWithoutUnderscore]) {
                        customFieldValues[field.id] = customFields[keyWithoutUnderscore];
                      }
                    }
                  }
                });

                return customFieldValues;
              })(),
            }}
            formConfig={configFields}
            submitLabel="Save"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values) => {
              if (!id || !speakerId) return;
              try {
                // Collect custom fields (any field not in the standard mapping)
                const standardKeys = ['firstName', 'lastName', 'email', 'companyName', 'companyRole', 'linkedin', 'bio'];
                const customFields: Record<string, any> = {};
                Object.keys(values).forEach(key => {
                  if (!standardKeys.includes(key)) {
                    customFields[key] = values[key];
                  }
                });

                // Check if all required fields are filled to determine status
                const requiredFields = configFields.filter((f: any) => f.required && f.enabled) || [];
                const allRequiredFilled = requiredFields.every((field: any) => {
                  const key = field.id === 'first_name' ? 'firstName' :
                              field.id === 'last_name' ? 'lastName' :
                              field.id === 'company_name' ? 'companyName' :
                              field.id === 'company_role' ? 'companyRole' :
                              field.id;
                  const value = standardKeys.includes(key) ? values[key] : customFields[key];
                  return value && value.trim() !== '';
                });

                // Prepare payload
                const payload: any = {
                  id: speakerId,
                  firstName: values.firstName,
                  lastName: values.lastName,
                  email: values.email,
                  companyName: values.companyName || null,
                  companyRole: values.companyRole || null,
                  linkedin: values.linkedin || null,
                  bio: values.bio || null,
                  formType: s?.formType || "speaker-info",
                  intakeFormStatus: allRequiredFilled ? "submitted" : "pending", // Update status based on required fields
                };

                // Add customFields if any exist
                if (Object.keys(customFields).length > 0) {
                  payload.customFields = customFields;
                }

                await updateSpeaker(id, speakerId, payload);
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
        {/* Content history dialog */}
        <HistoryDialog />
    </div>
  );
}
