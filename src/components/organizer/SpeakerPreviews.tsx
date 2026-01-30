import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Props = {
  s: any;
  eventData: any;
};

export default function SpeakerPreviews({ s, eventData }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Website Card */}
      <div className="flex flex-col">
        <div className="mb-2"><strong style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Website Card</strong></div>
        <div className="bg-muted p-5 rounded-lg border-2 border-dashed border-border flex-1 flex flex-col">
          <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
            Final output: 600x280px
          </div>

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
      </div>

      {/* Promo Card */}
      <div className="flex flex-col">
        <div className="mb-2"><strong style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Promo Card</strong></div>
        <div className="bg-muted p-5 rounded-lg border-2 border-dashed border-border flex-1 flex flex-col">
          <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>
            Final output: 1080x1080px
          </div>

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
      </div>
    </div>
  );
}
