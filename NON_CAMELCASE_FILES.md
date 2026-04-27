# Files containing non-camelCase keys

The following files contain keys that are not exclusively camelCase (examples: snake_case, kebab-case, or other non-camelCase identifiers) discovered by a repo-wide scan.

- src/components/SpeakerForm.tsx — `FIELD_KEY_MAPPING` (first_name, last_name, etc.)
- src/components/SpeakerFormBuilder.tsx — default fields and `FIELD_MIGRATIONS` (company_logo, talk_title, etc.)
- src/components/organizer/SpeakerInfoCard.tsx — `FIELD_MAPPING` (first_name, company_logo, ...)
- src/components/organizer/ShareDialog.tsx — role labels mapping
- src/components/organizer/GoogleDriveFolderPicker.tsx — API body keys (`folder_name`, `parent_folder_id`)
- src/components/organizer/AddSpeakerDialog.tsx — email payload keys (`recipient_email`, `recipient_name`, `html_content`)
- src/components/organizer/SpeakersTable.tsx — email payload keys (`recipient_email`, `recipient_name`, `html_content`)
- src/components/SpeakerPortalComponent.tsx — formType values (`speaker-info`, `call-for-speakers`)
- src/pages/public/SpeakerIntakeForm.tsx — formType/back-end keys (`speaker-intake`, `call-for-speakers`)
- src/pages/organizer/EventSettings.tsx — event payload keys (`start_date`, `end_date`, `from_name`, `from_email`, `reply_to_email`)
- src/pages/organizer/CreateEvent.tsx — payload keys (e.g. `team_id`)
- src/lib/api.ts — API function param keys (`content_type`, `expires_in_seconds`, `upload_url`, `public_url`, `access_token`, `folder_name`, `parent_folder_id`)
- src/lib/card-builder-templates.ts — template keys (e.g. `bg_gradient`)
- src/lib/card-builder-helpers.ts — preset & template maps with non-camel keys
- src/lib/card-builder-utils.ts — config maps/records using string keys
- src/lib/card-builder-canvas.ts — dev notes and identifiers containing underscores
- src/hooks/use-toast.ts — action constants (ADD_TOAST, UPDATE_TOAST, etc.)
- src/components/ui/calendar.tsx — config keys and class name mappings with hyphens/underscores
- src/components/ui/chart.tsx — theme mapping keys
- src/components/CardBuilder.tsx — preset constants and identifiers
- src/components/TrialOverlay.tsx — className strings using hyphenated tokens
- src/constants/promoCardTemplates.ts — preset data identifiers
- src/constants/websiteCardTemplates.ts — preset data identifiers
- src/pages/FakeLandingPage.tsx — theme/class strings with hyphens

Notes:
- This scan flagged keys containing underscores or hyphens and some capitalized identifiers. Many occurrences are expected (OpenAPI schemas, API payload shapes, webmanifest keys, package files, generated/dist files, and CSS class tokens).
- If you want a stricter sweep limited to only source files (excluding `dist`, `package-lock.json`, built manifests, and config files), I can re-run and produce a filtered list.

If you want, I can also open a PR-style patch to convert selected keys to camelCase (where safe) and add migration mappings. Tell me which files to prioritize.
