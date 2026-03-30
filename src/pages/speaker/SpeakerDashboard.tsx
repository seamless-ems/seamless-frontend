import React, { useEffect, useState } from "react";
import { getSpeakerAppearances, updateSpeakerAppearance } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SpeakerForm from "@/components/SpeakerForm";
import SpeakerContentTab from "@/components/organizer/SpeakerContentTab";
import SpeakerAssets from "@/components/organizer/SpeakerAssets";
import { uploadFile } from "@/lib/api";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

export default function SpeakerDashboard() {
  const [speakers, setSpeakers] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<any | null>(null);
  const [contentOpen, setContentOpen] = useState(false);
  const [managingSpeaker, setManagingSpeaker] = useState<any | null>(null);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [managingAssetsSpeaker, setManagingAssetsSpeaker] = useState<any | null>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSpeakerAppearances()
      .then((res) => {
        if (!mounted) return;
        setSpeakers(res || []);
        setError(null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || String(err));
        setSpeakers([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Speaker Dashboard</h1>
      <p className="mt-4 text-muted-foreground">Manage your profile, view upcoming & past events.</p>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Your Speaker Appearances</h2>

        {loading && <p className="mt-3 text-sm text-muted-foreground">Loading appearances…</p>}

        {error && <div className="mt-3 text-sm text-destructive">Failed to load appearances: {error}</div>}

        {!loading && !error && (
          <div className="mt-3 grid grid-cols-1 gap-4">
            {(!speakers || speakers.length === 0) && (
              <div className="text-sm text-muted-foreground">No appearances found for your account.</div>
            )}

            {speakers && speakers.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary/30 border-b border-border">
                    <tr>
                      <th className="px-5 py-3 text-left">Speaker</th>
                      <th className="px-5 py-3 text-left">Event</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Files</th>
                      <th className="px-5 py-3 text-left">Updated</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map((s: any) => {
                      const key = s.id || s.userId || s.email || JSON.stringify(s);
                      const headshotUrl = s.headshot || s.photoUrl || s.avatarUrl || s.image || null;
                      const speakerName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email || "Unnamed";
                      const status = (s.speakerInformationStatus && s.speakerInformationStatus) || s.callForSpeakersStatus || null;
                      const updated = s.updatedAt || s.updated_at || s.createdAt || null;
                      const fileCount = (s.contentItems || []).filter((i: any) => !i.archived).length;

                      return (
                        <tr key={key} className="border-b border-border hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <Avatar className="h-10 w-10">
                                {headshotUrl ? <AvatarImage src={headshotUrl} alt={speakerName} /> : <AvatarFallback className="text-xs">{(speakerName.split(" ").map((p:any)=>p?.[0]).slice(0,2).join("")||"—")}</AvatarFallback>}
                              </Avatar>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{speakerName}</div>
                              <div className="text-xs text-muted-foreground">{s.companyRole || s.companyName || ""}</div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            {s.events && s.events[0] ? (() => {
                              const ev = s.events[0];
                              const name = ev.name || ev.title || "Unnamed event";
                              const startRaw = ev.startsAt || ev.start_date || ev.date || ev.starts_at || ev.startDate || ev.start;
                              const endRaw = ev.endsAt || ev.end_date || ev.ends_at || ev.endDate || ev.end;
                              const startText = formatDate(startRaw);
                              const endText = formatDate(endRaw);
                              return (
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground truncate">{name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {startRaw ? startText : ""}
                                    {startRaw && endRaw ? ` — ${endText}` : ""}
                                    {!startRaw && !endRaw ? "—" : ""}
                                  </span>
                                </div>
                              );
                            })() : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="outline" className="text-xs">{status ?? "—"}</Badge>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{fileCount}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{updated ? new Date(updated).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingSpeaker(s); setEditOpen(true); }}>Edit</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setManagingSpeaker(s); setContentOpen(true); }}>Files</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setManagingAssetsSpeaker(s); setAssetsOpen(true); }}>Assets</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit dialog for speaker appearance */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) { setEditingSpeaker(null); } setEditOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit your speaker details</DialogTitle>
          </DialogHeader>
          {editingSpeaker && (
            <div className="space-y-6">
              <SpeakerForm
              initialValues={{
                firstName: editingSpeaker.firstName || "",
                lastName: editingSpeaker.lastName || "",
                email: editingSpeaker.email || "",
                companyName: editingSpeaker.companyName || null,
                companyRole: editingSpeaker.companyRole || null,
                linkedin: editingSpeaker.linkedin || null,
                bio: editingSpeaker.bio || null,
              }}
              formConfig={
                // Use the first event's speaker intake form config if available
                (editingSpeaker.events || []).find((ev: any) => ev?.speakerIntakeFormConfig)?.speakerIntakeFormConfig?.config?.fields || []
              }
              submitLabel="Save"
              onCancel={() => { setEditOpen(false); setEditingSpeaker(null); }}
              onSubmit={async (values) => {
                if (!editingSpeaker?.id) return;
                try {
                  const payload: any = {
                    id: editingSpeaker.id,
                    firstName: values.firstName || null,
                    lastName: values.lastName || null,
                    email: values.email || null,
                    companyName: values.companyName || null,
                    companyRole: values.companyRole || null,
                    linkedin: values.linkedin || null,
                    bio: values.bio || null,
                    formType: editingSpeaker.formType || 'speaker-info',
                  };

                  const updated = await updateSpeakerAppearance(editingSpeaker.id, payload);
                  // update local list
                  setSpeakers((prev) => {
                    if (!prev) return [updated];
                    return prev.map((p) => (p.id === updated.id ? updated : p));
                  });
                  toast({ title: "Saved" });
                  setEditOpen(false);
                  setEditingSpeaker(null);
                } catch (err: any) {
                  toast({ title: "Save failed", description: String(err?.message || err) });
                }
              }}
            />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Files dialog (separate) */}
      <Dialog open={contentOpen} onOpenChange={(v) => { if (!v) { setManagingSpeaker(null); } setContentOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage files</DialogTitle>
          </DialogHeader>
          {managingSpeaker && (
            <SpeakerContentTab
              eventId={(managingSpeaker.events && managingSpeaker.events[0] && managingSpeaker.events[0].id) || ''}
              speakerId={managingSpeaker.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assets dialog (headshot / logo) */}
      <Dialog open={assetsOpen} onOpenChange={(v) => { if (!v) { setManagingAssetsSpeaker(null); } setAssetsOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage assets</DialogTitle>
          </DialogHeader>
          {managingAssetsSpeaker && (
            <SpeakerAssets
              s={managingAssetsSpeaker}
              headshotInputRef={headshotInputRef}
              logoInputRef={logoInputRef}
              uploadingHeadshot={uploadingHeadshot}
              uploadingLogo={uploadingLogo}
              onSelectFile={async (fileType, dataUrl, file) => {
                if (!file) {
                  toast({ title: 'No file selected' });
                  return;
                }
                const speakerId = managingAssetsSpeaker.id;
                const eventId = (managingAssetsSpeaker.events && managingAssetsSpeaker.events[0] && managingAssetsSpeaker.events[0].id) || undefined;
                try {
                  if (fileType === 'headshot') setUploadingHeadshot(true);
                  else setUploadingLogo(true);

                  // Normalize filename to match other upload flows (headshot.<ext> / company_logo.<ext>)
                  const mime = (file as File).type || "image/jpeg";
                  const rawExt = mime.includes("/") ? mime.split("/")[1] : "jpeg";
                  const ext = rawExt.split("+")[0] === "jpeg" ? "jpg" : rawExt.split("+")[0];
                  const normalizedName = fileType === 'headshot' ? `headshot.${ext}` : `company_logo.${ext}`;
                  const renamedFile = new File([file], normalizedName, { type: mime });
                  const res = await uploadFile(renamedFile, speakerId, eventId, `${managingAssetsSpeaker.firstName || ''} ${managingAssetsSpeaker.lastName || ''}`.trim());
                  const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                  if (!url) throw new Error('Upload did not return a URL');

                  const payload: any = {
                    id: speakerId,
                    firstName: managingAssetsSpeaker.firstName || null,
                    lastName: managingAssetsSpeaker.lastName || null,
                    email: managingAssetsSpeaker.email || null,
                    formType: managingAssetsSpeaker.formType || 'speaker-info',
                  };
                  if (fileType === 'headshot') payload.headshot = url;
                  else payload.companyLogo = url;

                  const updated = await updateSpeakerAppearance(speakerId, payload);
                  setSpeakers((prev) => prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated]);
                  toast({ title: 'Asset uploaded' });
                } catch (err: any) {
                  toast({ title: 'Upload failed', description: String(err?.message || err), variant: 'destructive' });
                } finally {
                  setUploadingHeadshot(false);
                  setUploadingLogo(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
