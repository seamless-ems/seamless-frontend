import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { getJson, getSpeakerContent, uploadFile, createSpeakerContent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Download, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  eventId: string;
}

function normaliseSpeakers(raw: any): any[] {
  if (!raw) return [];
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw.items)) arr = raw.items;
  else if (Array.isArray(raw.results)) arr = raw.results;
  else if (Array.isArray(raw.speakers)) arr = raw.speakers;
  else if (Array.isArray(raw.data)) arr = raw.data;
  return arr.map((s: any) => ({
    ...s,
    name: [s.first_name ?? s.firstName, s.last_name ?? s.lastName].filter(Boolean).join(" ") || s.name || s.email || "Speaker",
  }));
}

function resolveUrl(item: any): string | null {
  return item.content ?? item.url ?? item.publicUrl ?? item.public_url ?? null;
}

function itemFilename(item: any): string {
  if (item.name) return item.name;
  const url = resolveUrl(item);
  if (url) {
    try {
      return decodeURIComponent(new URL(url, window.location.href).pathname.split("/").pop() || `file-${item.id}`);
    } catch {}
  }
  return `file-${item.id}`;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

// Accordion row — fetches content only when expanded
function SpeakerContentRow({ speaker, eventId, defaultExpanded = false }: {
  speaker: any;
  eventId: string;
  defaultExpanded?: boolean;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["content", speaker.id],
    queryFn: async () => {
      try {
        const res = await getSpeakerContent(speaker.id);
        return (Array.isArray(res) ? res : []).filter((i: any) => !i.archived);
      } catch {
        return [];
      }
    },
    enabled: expanded,
    staleTime: 30_000,
    retry: false,
  });

  const items = data ?? [];
  const contentUrl = `/organizer/event/${eventId}/speakers/${speaker.id}/content`;

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-3 w-8">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          />
        </td>
        <td className="px-3 py-3">
          <span className="text-sm font-medium text-foreground">{speaker.name}</span>
        </td>
        <td className="px-5 py-3 text-sm text-muted-foreground">
          {expanded && !isLoading
            ? items.length > 0
              ? `${items.length} file${items.length !== 1 ? "s" : ""}`
              : "No content yet"
            : null}
        </td>
        <td className="px-5 py-3 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(contentUrl); }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Open
          </button>
        </td>
      </tr>

      {expanded && (
        isLoading ? (
          <tr key={`l-${speaker.id}`} className="border-b border-border bg-muted/10">
            <td />
            <td colSpan={3} className="px-5 py-3">
              <div className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </td>
          </tr>
        ) : items.length === 0 ? (
          <tr key={`e-${speaker.id}`} className="border-b border-border bg-muted/10">
            <td />
            <td colSpan={3} className="px-5 py-3 text-sm text-muted-foreground">
              No content yet —{" "}
              <button
                className="underline hover:text-foreground transition-colors"
                onClick={() => navigate(contentUrl)}
              >
                upload from their profile
              </button>
            </td>
          </tr>
        ) : (
          items.map((item: any) => {
            const url = resolveUrl(item);
            const name = itemFilename(item);
            const updated = formatDate(item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at);
            return (
              <tr key={item.id} className="border-b border-border last:border-0 bg-muted/10 hover:bg-muted/20 transition-colors">
                <td />
                <td className="px-5 py-2.5">
                  <span className="text-sm text-foreground">{name}</span>
                </td>
                <td className="px-5 py-2.5 text-sm text-muted-foreground">{updated}</td>
                <td className="px-5 py-2.5 text-right">
                  {url && (
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = url; a.download = name; a.target = "_blank";
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      }}
                      className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })
        )
      )}
    </>
  );
}

export default function EventContentTab({ eventId }: Props) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSpeakerId, setUploadSpeakerId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const { data: rawSpeakers, isFetching } = useQuery<any>({
    queryKey: ["event", eventId, "speakers", "speakers"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers?form_type=speaker-info`),
    enabled: Boolean(eventId),
    staleTime: 5 * 60_000,
  });

  const speakers = normaliseSpeakers(rawSpeakers);

  const resetUpload = () => { setUploadSpeakerId(""); setUploadName(""); setUploadFileObj(null); };

  const handleUpload = async () => {
    if (!uploadFileObj || !uploadName.trim() || !uploadSpeakerId) return;
    setUploading(true);
    try {
      const res = await uploadFile(uploadFileObj, uploadSpeakerId, eventId);
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error("Upload did not return a file URL");
      await createSpeakerContent(uploadSpeakerId, {
        content: url,
        contentType: uploadFileObj.type || undefined,
        name: uploadName.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["content", uploadSpeakerId] });
      toast({ title: "File uploaded" });
      setUploadOpen(false);
      resetUpload();
      navigate(`/organizer/event/${eventId}/speakers/${uploadSpeakerId}/content`);
    } catch (err: any) {
      toast({ title: "Upload failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      // Fetch all speakers' content in parallel — only happens on click
      const results = await Promise.all(
        speakers.map(async (s) => {
          try {
            const res = await getSpeakerContent(s.id);
            const items = (Array.isArray(res) ? res : []).filter((i: any) => !i.archived);
            // Populate cache while we're at it
            queryClient.setQueryData(["content", s.id], items);
            return { speaker: s, items };
          } catch {
            return { speaker: s, items: [] };
          }
        })
      );

      const allWithUrls = results.flatMap(({ speaker, items }) =>
        items.map((item: any) => ({ speaker, item, url: resolveUrl(item) })).filter((x) => x.url)
      );

      if (!allWithUrls.length) {
        toast({ title: "No downloadable content found" });
        return;
      }

      const zip = new JSZip();
      await Promise.all(
        allWithUrls.map(async ({ speaker, item, url }) => {
          const blob = await fetchBlob(url!);
          if (blob) zip.file(`${speaker.name ?? speaker.id}/${itemFilename(item)}`, blob);
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "all-speaker-content.zip";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-4 pt-6">
      <input ref={uploadInputRef} type="file" className="hidden" onChange={(e) => setUploadFileObj(e.target.files?.[0] ?? null)} />

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) resetUpload(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Content</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Speaker</Label>
              <Select value={uploadSpeakerId} onValueChange={setUploadSpeakerId}>
                <SelectTrigger><SelectValue placeholder="Select a speaker…" /></SelectTrigger>
                <SelectContent>
                  {speakers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">File name</Label>
              <Input placeholder="e.g. Keynote Slides, Run of Show" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">File</Label>
              {uploadFileObj ? (
                <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                  <span className="text-sm truncate">{uploadFileObj.name}</span>
                  <button onClick={() => setUploadFileObj(null)} className="text-xs text-muted-foreground hover:text-destructive ml-2 shrink-0">Remove</button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" />Choose file
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetUpload(); }}>Cancel</Button>
            <Button disabled={!uploadFileObj || !uploadName.trim() || !uploadSpeakerId || uploading} onClick={handleUpload}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {speakers.length > 0
            ? `${speakers.length} speaker${speakers.length !== 1 ? "s" : ""}`
            : isFetching ? "Loading…" : "No speakers yet"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)} disabled={speakers.length === 0}>
            <Upload className="h-3.5 w-3.5" />Upload Content
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={downloadingAll || speakers.length === 0}
            onClick={handleDownloadAll}
          >
            <Download className="h-3.5 w-3.5" />{downloadingAll ? "Preparing…" : "Download All"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/30 border-b border-border">
            <tr>
              <th className="w-8" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Speaker</th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">Content</th>
              <th className="px-5 py-2.5 w-[80px]" />
            </tr>
          </thead>
          <tbody>
            {speakers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                  {isFetching ? "Loading…" : "No speakers yet"}
                </td>
              </tr>
            ) : (
              speakers.map((s) => (
                <SpeakerContentRow key={s.id} speaker={s} eventId={eventId} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
