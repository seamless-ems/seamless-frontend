import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  s: any;
  formConfig?: any[];
  onEdit: () => void;
  onViewBio: () => void;
  onViewNotes: () => void;
};

// Map field IDs to speaker data keys
const FIELD_MAPPING: Record<string, string> = {
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  company_name: 'companyName',
  company_role: 'companyRole',
  bio: 'bio',
  linkedin: 'linkedin',
  headshot: 'headshot',
  company_logo: 'companyLogo',
};

export default function SpeakerInfoCard({ s, formConfig, onEdit, onViewBio, onViewNotes }: Props) {
  // Filter to enabled fields only
  const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];

  const renderField = (field: any) => {
    const speakerKey = FIELD_MAPPING[field.id] || field.id;
    let value = s?.[speakerKey];

    // Check custom fields if not found in main speaker data
    if (!value && field.custom && s?.customFields) {
      // Try exact match first
      value = s.customFields[field.id];

      // If not found, try without underscores (backend strips them)
      if (!value) {
        const keyWithoutUnderscore = field.id.replace(/_/g, '');
        value = s.customFields[keyWithoutUnderscore];
      }
    }

    // Special handling for bio - show preview with "View More" button
    if (field.id === 'bio') {
      const bioText = value || "";
      const preview = bioText.length > 150 ? bioText.substring(0, 150) + "..." : bioText;
      const hasMore = bioText.length > 150;

      return (
        <div key={field.id}>
          <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {field.label}
          </div>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {preview || "-"}
          </div>
          {hasMore && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:underline" onClick={onViewBio}>
              View More
            </Button>
          )}
        </div>
      );
    }

    // Special handling for email - make it clickable
    if (field.type === 'email') {
      return (
        <div key={field.id}>
          <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {field.label}
          </div>
          <a
            href={`mailto:${value || ""}`}
            style={{ fontSize: 'var(--font-body)', color: 'var(--primary)', textDecoration: 'none' }}
            className="hover:underline"
          >
            {value || "-"}
          </a>
        </div>
      );
    }

    // Default field rendering
    return (
      <div key={field.id}>
        <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {field.label}
        </div>
        <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>
          {value || "-"}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {enabledFields.map(renderField)}

      {/* Internal Notes - always shown */}
      <div>
        <div style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Internal Notes
        </div>
        {(() => {
          const notesText = s?.internalNotes || "";
          const preview = notesText.length > 150 ? notesText.substring(0, 150) + "..." : notesText;
          const hasContent = notesText.length > 0;
          const hasMore = notesText.length > 150;

          return (
            <>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {preview || "-"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-primary hover:underline"
                onClick={onViewNotes}
              >
                {hasContent ? (hasMore ? "View More" : "Edit") : "Add Notes"}
              </Button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
