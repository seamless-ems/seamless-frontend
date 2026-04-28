import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { downloadResource } from '@/lib/utils';

type Props = {
  s: any;
  headshotInputRef: React.RefObject<HTMLInputElement>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  uploadingHeadshot: boolean;
  uploadingLogo: boolean;
  onSelectFile: (fileType: 'headshot' | 'logo', dataUrl: string, file?: File) => void;
  readOnly?: boolean;
};

export default function SpeakerAssets({ s, headshotInputRef, logoInputRef, uploadingHeadshot, uploadingLogo, onSelectFile, readOnly }: Props) {
  return (
    <>
      <div className="text-center" style={{ minWidth: '150px' }}>
        <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Headshot</div>
        <div
          className="relative w-[150px] h-[150px] rounded-lg border-2 border-border mb-2 overflow-hidden cursor-pointer bg-muted flex items-center justify-center"
            onClick={() => s?.headshot && void downloadResource(s.headshot, `${s?.firstName ?? 'headshot'}-headshot`)}
        >
          {s?.headshot ? (
            <img src={s.headshot} alt="Headshot" className="w-full h-full object-cover" />
          ) : (
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-accent/10 text-accent text-2xl">{s?.firstName?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <input
          ref={headshotInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            if (readOnly) { e.currentTarget.value = ''; return; }
            const file = e.target.files?.[0];
            if (!file) return;
            const allowed = ["image/png", "image/jpeg"];
            if (!allowed.includes(file.type)) {
              toast({ title: "Invalid file type", description: "Headshot must be PNG or JPEG", variant: "destructive" });
              e.currentTarget.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => onSelectFile('headshot', reader.result as string, file);
            reader.readAsDataURL(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => { if (!readOnly) headshotInputRef.current?.click(); }}
          disabled={uploadingHeadshot || readOnly}
        >
          {uploadingHeadshot ? "Uploading..." : "Replace"}
        </Button>
      </div>

      <div className="text-center" style={{ minWidth: '150px' }}>
        <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Logo</div>
        <div
          className="w-[150px] h-[150px] rounded-lg border-2 border-border mb-2 bg-white flex items-center justify-center p-4 cursor-pointer"
          onClick={() => s?.companyLogo && void downloadResource(s.companyLogo, `${s?.companyName ?? 'logo'}-logo`)}
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
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            if (readOnly) { e.currentTarget.value = ''; return; }
            const file = e.target.files?.[0];
            if (!file) return;
            const allowed = ["image/png", "image/jpeg"];
            if (!allowed.includes(file.type)) {
              toast({ title: "Invalid file type", description: "Logo must be PNG or JPEG", variant: "destructive" });
              e.currentTarget.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => onSelectFile('logo', reader.result as string, file);
            reader.readAsDataURL(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => { if (!readOnly) logoInputRef.current?.click(); }}
          disabled={uploadingLogo || readOnly}
        >
          {uploadingLogo ? "Uploading..." : "Replace"}
        </Button>
      </div>
    </>
  );
}
