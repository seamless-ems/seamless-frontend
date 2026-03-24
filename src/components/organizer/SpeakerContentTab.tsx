import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSpeakerContent, createSpeakerContent, uploadFile, getContentHistory, createNewContentVersion } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Archive, Check, ChevronDown, ChevronRight, Copy, Download, MoreVertical, Plus, RotateCcw, Share2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { archiveContent } from '@/lib/api';

function getFileTypeLabel(contentType: string, url: string): string {
  if (contentType?.includes('pdf') || url?.endsWith('.pdf')) return 'PDF';
  if (contentType?.includes('presentation') || url?.endsWith('.pptx')) return 'PPTX';
  if (contentType?.includes('powerpoint') || url?.endsWith('.ppt')) return 'PPT';
  if (contentType?.includes('video/mp4') || url?.endsWith('.mp4')) return 'MP4';
  if (contentType?.includes('word') || url?.endsWith('.docx')) return 'DOCX';
  if (contentType?.includes('image/jpeg') || url?.match(/\.jpe?g$/)) return 'JPEG';
  if (contentType?.includes('image/png') || url?.endsWith('.png')) return 'PNG';
  const ext = url?.split('.').pop()?.split('?')[0].toUpperCase();
  return ext || 'FILE';
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/London',
      timeZoneName: 'short',
    });
  } catch { return '—'; }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function getFilename(url: string): string {
  try {
    return decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || url);
  } catch { return url; }
}

function HistorySection({ speakerId, documentId, currentVersion, itemName, onRestore }: {
  speakerId: string;
  documentId: string;
  currentVersion: number;
  itemName: string;
  onRestore: (data: { version: any; documentId: string; itemName: string }) => void;
}) {
  const { data: versions, isLoading } = useQuery<any[]>({
    queryKey: ['content', speakerId, documentId, 'history'],
    queryFn: () => getContentHistory(speakerId, documentId),
    enabled: Boolean(speakerId && documentId),
  });

  if (isLoading) return <div className="py-3 px-5 text-xs text-muted-foreground">Loading history…</div>;
  if (!versions?.length) return <div className="py-3 px-5 text-xs text-muted-foreground">No history available</div>;

  return (
    <div className="border-t border-border bg-muted/20">
      {versions.map((v: any) => {
        const isCurrent = v.version === currentVersion;
        const url = v.content ?? v.publicUrl ?? v.public_url ?? '';
        const action = v.version === 1 ? 'Uploaded' : 'Replaced';
        const who = v.createdByName ?? null;
        return (
          <div key={v.id ?? v.version} className="flex items-center gap-4 px-5 py-3 border-b border-border/50 last:border-0">
            <span className="text-xs font-medium w-8 text-muted-foreground shrink-0">v{v.version}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">
                {action}{who ? <> by <span className="font-medium">{who}</span></> : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(v.createdAt)}</p>
            </div>
            {isCurrent && (
              <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded font-medium shrink-0">Current</span>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {url && (
                <a
                  href={url}
                  download
                  className="p-1 rounded text-muted-foreground/50 hover:text-primary hover:bg-muted transition-colors"
                  title="Download this version"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => onRestore({ version: v, documentId, itemName })}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />Restore
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SpeakerContentTab({ eventId, speakerId }: { eventId: string; speakerId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserName = user?.name || user?.email || undefined;

  // Upload new
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Replace
  const [replacing, setReplacing] = useState<any | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Archive / restore confirmations
  const [archiving, setArchiving] = useState<any | null>(null);
  const [restoring, setRestoring] = useState<{ version: any; documentId: string; itemName: string } | null>(null);

  // Expanded history rows
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Share
  const [shareCopied, setShareCopied] = useState<'view' | 'edit' | null>(null);

  const { data: contentItems, isLoading } = useQuery<any[]>({
    queryKey: ['content', speakerId],
    queryFn: () => getSpeakerContent(speakerId),
    enabled: Boolean(speakerId),
  });

  const items: any[] = contentItems ?? [];
  const activeItems = items.filter(i => !i.archived);
  const archivedItems = items.filter(i => i.archived);

  const copyShare = (mode: 'view' | 'edit') => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(mode);
    setTimeout(() => setShareCopied(null), 2000);
  };

  const toggleHistory = (docId: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  };

  const handleUpload = async () => {
    if (!uploadFileObj || !uploadName.trim()) return;
    setUploading(true);
    try {
      const res = await uploadFile(uploadFileObj, speakerId, eventId);
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error('Upload did not return a file URL');
      await createSpeakerContent(speakerId, { content: url, contentType: uploadFileObj.type || undefined, name: uploadName.trim() });
      queryClient.invalidateQueries({ queryKey: ['content', speakerId] });
      toast({ title: 'File uploaded' });
      setUploadOpen(false);
      setUploadName('');
      setUploadFileObj(null);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!replaceFile || !replacing) return;
    setUploading(true);
    try {
      const res = await uploadFile(replaceFile, speakerId, eventId);
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error('Upload did not return a file URL');
      const docId = replacing.documentId ?? replacing.document_id ?? replacing.id;
      await createNewContentVersion(speakerId, docId, { content: url, contentType: replaceFile.type || 'application/octet-stream' });
      queryClient.invalidateQueries({ queryKey: ['content', speakerId] });
      queryClient.invalidateQueries({ queryKey: ['content', speakerId, docId, 'history'] });
      toast({ title: 'File replaced' });
      setReplaceConfirmOpen(false);
      setReplacing(null);
      setReplaceFile(null);
    } catch (err: any) {
      toast({ title: 'Replace failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiving) return;
    setUploading(true);
    try {
      const docId = archiving.documentId ?? archiving.document_id ?? archiving.id;
      await archiveContent(speakerId, docId);
      queryClient.invalidateQueries({ queryKey: ['content', speakerId] });
      toast({ title: 'File archived' });
      setArchiving(null);
    } catch (err: any) {
      toast({ title: 'Archive failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoring) return;
    setUploading(true);
    try {
      const url = restoring.version.content ?? restoring.version.publicUrl ?? restoring.version.public_url ?? '';
      const contentType = restoring.version.contentType ?? restoring.version.content_type ?? 'application/octet-stream';
      await createNewContentVersion(speakerId, restoring.documentId, { content: url, contentType });
      queryClient.invalidateQueries({ queryKey: ['content', speakerId] });
      queryClient.invalidateQueries({ queryKey: ['content', speakerId, restoring.documentId, 'history'] });
      toast({ title: `Restored to v${restoring.version.version}` });
      setRestoring(null);
    } catch (err: any) {
      toast({ title: 'Restore failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeItems.length} file{activeItems.length !== 1 ? 's' : ''}
          {archivedItems.length > 0 && ` · ${archivedItems.length} archived`}
        </p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {shareCopied
                  ? <><Check className="h-3.5 w-3.5" />Copied</>
                  : <><Share2 className="h-3.5 w-3.5" />Share</>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyShare('view')}>
                {shareCopied === 'view' ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                View only link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyShare('edit')}>
                {shareCopied === 'edit' ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                Can upload link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Upload file
          </Button>
        </div>
      </div>

      {/* File list */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading files…</div>
        ) : activeItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No files yet.{' '}
            <button className="underline hover:text-foreground transition-colors" onClick={() => setUploadOpen(true)}>
              Upload the first file
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-16">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-12">Ver.</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-36">Uploaded</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground w-12">History</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item: any) => {
                const url = item.content ?? item.url ?? item.publicUrl ?? item.public_url ?? '';
                const docId = item.documentId ?? item.document_id ?? item.id;
                const name = item.name ?? getFilename(url);
                const fileType = getFileTypeLabel(item.contentType ?? item.content_type ?? '', url);
                const historyOpen = expandedHistory.has(docId);

                return (
                  <React.Fragment key={item.id ?? docId}>
                    <tr className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors group">
                      <td className="px-5 py-3.5">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {name}
                        </a>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {fileType}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-muted-foreground">v{item.version ?? 1}</td>
                      <td className="px-3 py-3.5 text-xs text-muted-foreground">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => toggleHistory(docId)}
                          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          title={historyOpen ? 'Hide history' : 'View history'}
                        >
                          {historyOpen
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {url && (
                              <DropdownMenuItem asChild>
                                <a href={url} download>
                                  <Download className="h-3.5 w-3.5 mr-2" />Download
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setReplacing(item);
                              replaceInputRef.current?.click();
                            }}>
                              <Upload className="h-3.5 w-3.5 mr-2" />Replace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchiving(item)}
                            >
                              <Archive className="h-3.5 w-3.5 mr-2" />Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {historyOpen && (
                      <tr className="border-b border-border last:border-0">
                        <td colSpan={6} className="p-0">
                          <HistorySection
                            speakerId={speakerId}
                            documentId={docId}
                            currentVersion={item.version ?? 1}
                            itemName={name}
                            onRestore={(data) => setRestoring(data)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Archived section */}
      {archivedItems.length > 0 && (
        <div className="rounded-lg border border-border border-dashed overflow-hidden opacity-60">
          <div className="px-5 py-3 bg-muted/20 text-xs text-muted-foreground font-medium">
            Archived ({archivedItems.length})
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setUploadFileObj(file);
          e.target.value = '';
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setReplaceFile(file);
            setReplaceConfirmOpen(true);
          }
          e.target.value = '';
        }}
      />

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(v) => {
        if (!v) { setUploadOpen(false); setUploadName(''); setUploadFileObj(null); }
        else setUploadOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
            <DialogDescription>
              Give the file a clear name that technicians will recognise — this can't be changed once uploaded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">File name</Label>
              <Input
                placeholder="e.g. Keynote Slides, Run of Show"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && uploadFileObj && uploadName.trim()) handleUpload(); }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">File</Label>
              {uploadFileObj ? (
                <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                  <span className="text-sm text-foreground truncate">{uploadFileObj.name}</span>
                  <button
                    onClick={() => setUploadFileObj(null)}
                    className="text-xs text-muted-foreground hover:text-destructive ml-2 shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" />Choose file
                </Button>
              )}
            </div>
            {uploadFileObj && uploadFileObj.size > 100 * 1024 * 1024 && (
              <p className="text-xs text-warning">
                This is a large file ({(uploadFileObj.size / 1024 / 1024).toFixed(0)}MB). Upload may take a moment.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadName(''); setUploadFileObj(null); }}>
              Cancel
            </Button>
            <Button disabled={!uploadFileObj || !uploadName.trim() || uploading} onClick={handleUpload}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace confirmation */}
      <AlertDialog open={replaceConfirmOpen} onOpenChange={(v) => {
        if (!v) { setReplaceConfirmOpen(false); setReplaceFile(null); setReplacing(null); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this file?</AlertDialogTitle>
            <AlertDialogDescription>
              The current version of <strong>{replacing?.name ?? 'this file'}</strong> will be saved in history and can be restored at any time. The file name stays the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setReplaceFile(null); setReplacing(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplaceConfirm} disabled={uploading}>
              {uploading ? 'Replacing…' : 'Yes, replace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={Boolean(archiving)} onOpenChange={(v) => { if (!v) setArchiving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this file?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiving?.name ?? 'This file'}</strong> will be hidden from technicians. You can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Yes, archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirmation */}
      <AlertDialog open={Boolean(restoring)} onOpenChange={(v) => { if (!v) setRestoring(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restoring?.version?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a new version of <strong>{restoring?.itemName ?? 'this file'}</strong> from v{restoring?.version?.version}. The current version stays in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm} disabled={uploading}>
              {uploading ? 'Restoring…' : 'Yes, restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
