import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Props = {
  s: any;
  headshotInputRef: React.RefObject<HTMLInputElement>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  uploadingHeadshot: boolean;
  uploadingLogo: boolean;
  onSelectFile: (fileType: 'headshot' | 'logo', dataUrl: string) => void;
};

export default function SpeakerAssets({ s, headshotInputRef, logoInputRef, uploadingHeadshot, uploadingLogo, onSelectFile }: Props) {
  return (
    <>
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
            reader.onloadend = () => onSelectFile('headshot', reader.result as string);
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
            reader.onloadend = () => onSelectFile('logo', reader.result as string);
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
    </>
  );
}
