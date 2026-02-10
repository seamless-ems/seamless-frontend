import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Props = {
  s: any;
  onEdit: () => void;
  onViewBio: () => void;
  onViewNotes: () => void;
};

export default function SpeakerInfoCard({ s, onEdit, onViewBio, onViewNotes }: Props) {
  return (
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
        <Button variant="outline" size="sm" onClick={onViewBio}>View Bio</Button>
      </div>
      <div>
        <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Internal Notes</div>
        <Button variant="outline" size="sm" onClick={onViewNotes}>View/Edit Notes</Button>
      </div>
    </div>
  );
}
