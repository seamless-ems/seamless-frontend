import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { getJson, getEventContent, uploadFile, createSpeakerContent } from "@/lib/api";
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
      const last = decodeURIComponent(new URL(url, window.location.href).pathname.split("/").pop() || "");
      if (last) {
        // If last segment already contains an extension, use it
        if (/\.[a-z0-9]{1,6}$/i.test(last)) return last;
        // Otherwise try to preserve the name and add an extension inferred from content type
        const mime = item.contentType ?? item.content_type ?? item.type ?? item.mime ?? null;
        const ext = mime ? mimeToExtension(mime) : null;
        return ext ? `${last}.${ext}` : last;
      }
    } catch {}
  }
  // Fallback: use item.name if available, otherwise use id with inferred extension or .bin
  const mime = item.contentType ?? item.content_type ?? item.type ?? item.mime ?? null;
  const ext = mime ? mimeToExtension(mime) : null;
  return ext ? `file-${item.id}.${ext}` : `file-${item.id}.bin`;
}

function mimeToExtension(mime: string): string | null {
  const m = mime.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/zip": "zip",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
  };
  if (map[m]) return map[m];
  // try to extract subtype
  const parts = m.split("/");
  if (parts.length === 2 && parts[1] && parts[1].length <= 6) return parts[1].replace(/[^a-z0-9]/g, "");
  return null;
}

function parseFilenameFromContentDisposition(header: string): string | null {
  try {
    // Examples: attachment; filename="file.pdf"  or  attachment; filename*=UTF-8''file.pdf
    const fnStar = /filename\*=UTF-8''([^;\n\r]+)/i.exec(header);
    if (fnStar && fnStar[1]) return decodeURIComponent(fnStar[1].trim());
    const fn = /filename=(?:"([^"]+)"|([^;\n\r]+))/i.exec(header);
    if (fn) return decodeURIComponent((fn[1] || fn[2] || '').trim());
  } catch {}
  return null;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

async function fetchBlob(url: string): Promise<{ blob: Blob; contentType?: string; filenameFromHeader?: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return { blob, contentType: res.headers.get("content-type") ?? undefined, filenameFromHeader: res.headers.get("content-disposition") ?? undefined } as any;
  } catch {
    return null;
  }
}

// Accordion row — renders items passed from the event-level content query
function SpeakerContentRow({ speaker, items, eventId, defaultExpanded = false }: {
  speaker: any;
  items: any[];
  eventId: string;
  defaultExpanded?: boolean;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);

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
        <td className="px-3 py-3" colSpan={2}>
          <div className="flex items-center gap-2">
            {speaker.headshot ? (
              <img
                src={speaker.headshot}
                alt={speaker.name}
                className="h-7 w-7 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                {speaker.name ? speaker.name[0].toUpperCase() : "S"}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{speaker.name}</span>
          </div>
        </td>
        <td className="px-5 py-3 text-sm text-muted-foreground">
          {items.length > 0 ? `${items.length} file${items.length !== 1 ? "s" : ""}` : "No content yet"}
        </td>
        <td className="px-5 py-3 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(contentUrl); }}
            className="text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            Open
          </button>
        </td>
      </tr>

      {expanded && (
        items.length === 0 ? (
          <tr key={`e-${speaker.id}`} className="border-b border-border bg-muted/10">
            <td />
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
                      className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:text-accent hover:bg-accent/8 transition-colors"
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

  // Fetch event-level content once and group by speakerId
  const { data: eventContent } = useQuery<any[]>({
    queryKey: ["event", eventId, "content"],
    queryFn: () => getEventContent(eventId),
    enabled: Boolean(eventId),
    staleTime: 2 * 60_000,
  });

  const itemsBySpeaker = useMemo(() => {
    const map: Record<string, any[]> = {};
    const arr = Array.isArray(eventContent) ? eventContent : [];
    arr.forEach((it: any) => {
      if (it.archived) return;
      const sid = it.speakerId ?? it.speaker_id ?? it.speaker ?? null;
      if (!sid) return;
      const key = String(sid);
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    return map;
  }, [eventContent]);

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
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "content"] });
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
      const res = await getEventContent(eventId);
      const allItems: any[] = Array.isArray(res) ? res : [];
      const bySpeaker: Record<string, any[]> = {};
      allItems.forEach((it: any) => {
        const sid = it.speakerId ?? it.speaker_id ?? it.speaker ?? null;
        if (!sid) return;
        const key = String(sid);
        if (!bySpeaker[key]) bySpeaker[key] = [];
        if (!it.archived) bySpeaker[key].push(it);
      });
      Object.entries(bySpeaker).forEach(([sid, items]) => {
        queryClient.setQueryData(["content", sid], items);
      });

      const allWithUrls = allItems
        .filter((it: any) => !it.archived)
        .flatMap((item: any) => {
          const sid = item.speakerId ?? item.speaker_id ?? item.speaker ?? null;
          const speaker = speakers.find((s) => String(s.id) === String(sid));
          if (!speaker) return [];
          const url = resolveUrl(item);
          if (!url) return [];
          return [{ speaker, item, url }];
        });

      if (!allWithUrls.length) {
        toast({ title: "No downloadable content found" });
        return;
      }

      const zip = new JSZip();
      await Promise.all(
        allWithUrls.map(async ({ speaker, item, url }) => {
          const res = await fetchBlob(url!);
          if (!res || !res.blob) return;
          let name = itemFilename(item);
          const hasExt = /\.[a-z0-9]{1,6}$/i.test(name);
          if (!hasExt) {
            // try content-disposition header
            const header = (res as any).filenameFromHeader as string | undefined;
            const parsedHeader = header ? parseFilenameFromContentDisposition(header) : null;
            if (parsedHeader && /\.[a-z0-9]{1,6}$/i.test(parsedHeader)) {
              name = parsedHeader;
            } else {
              const ct = (res as any).contentType ?? (res.blob as Blob).type ?? null;
              const ext = ct ? mimeToExtension(ct) : null;
              name = ext ? `${name}.${ext}` : `${name}.bin`;
            }
          }
          zip.file(`${speaker.name ?? speaker.id}/${name}`, (res as any).blob);
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

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="h-11 bg-muted/20">
              <th className="w-8" />
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground" colSpan={2}>
                {speakers.length > 0
                  ? `${speakers.length} speaker${speakers.length !== 1 ? "s" : ""}`
                  : isFetching ? "Loading…" : "Speakers"}
              </th>
              <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Content</th>
              <th className="px-4 py-2 w-[160px] text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Upload content" onClick={() => setUploadOpen(true)} disabled={speakers.length === 0}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5" disabled={downloadingAll || speakers.length === 0} onClick={handleDownloadAll}>
                    <Download className="h-3.5 w-3.5" />{downloadingAll ? "Preparing…" : "Download All"}
                  </Button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {speakers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  {isFetching ? "Loading…" : "No speakers yet"}
                </td>
              </tr>
            ) : (
              speakers.map((s) => (
                <SpeakerContentRow key={s.id} speaker={s} eventId={eventId} items={itemsBySpeaker[String(s.id)] ?? []} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
