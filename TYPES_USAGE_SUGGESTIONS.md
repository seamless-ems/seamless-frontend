# Suggested places to apply existing `types` from `src/types`

I scanned the codebase for untyped `any` usage and patterns where the existing `types` could be applied. Below are concise suggestions grouped by type, with file locations and a brief recommended change.

## Types available
- `Event`, `EventModule`, `Speaker`, `TeamMember`, `TeamUser`, `Team`, `Subscription` — [src/types/event.ts](src/types/event.ts)
- `OnboardingStep`, `OrganizationData`, `TeamData`, `EventData`, `OnboardingState` — [src/types/onboarding.ts](src/types/onboarding.ts)
- `StarterPreset`, `PresetData`, `ElementTemplates` — [src/types/card-builder.ts](src/types/card-builder.ts)

## High-priority suggestions (low-effort, high-value)
- `Event` / `Speaker` for API query results
  - Files: `src/pages/Index.tsx`, `src/pages/public/SpeakerEmbed.tsx`, `src/pages/public/PromoEmbed.tsx`, `src/pages/public/SpeakerEmbedSingle.tsx`, `src/pages/public/PromoEmbedSingle.tsx`, `src/pages/organizer/SpeakerModule.tsx`, `src/components/layout/EventLayout.tsx`, `src/components/dashboard/EventCard.tsx`, `src/components/TrialOverlay.tsx`, `src/contexts/EventAccessContext.tsx`
  - Change: Replace `useQuery<any>` / `getJson<any>` and local `any` casts with `useQuery<Event>` or `useQuery<Speaker[]>` where the endpoint returns those shapes. Normalize the deserialization helper to return `Event` or `Speaker[]`.

- `Speaker` for local state and props
  - Files: `src/pages/organizer/SpeakerModule.tsx` (`selectedSpeaker` state), `src/components/organizer/SpeakerPreviews.tsx`, `src/components/organizer/SpeakerInfoCard.tsx`, `src/components/SpeakerForm.tsx` (values)
  - Change: Replace `any` / `any[]` with `Speaker` or `Speaker[]` and use `Partial<Speaker>` for form data where appropriate.

- `EventData` / `OnboardingState` for onboarding forms and pages
  - Files: pages and components that build or submit event/org/team payloads (search for `fromName`, `fromEmail`, `start_date`, `end_date`, etc.), e.g. `src/pages/organizer/CreateEvent.tsx`, `src/pages/organizer/EventSettings.tsx`
  - Change: Use `EventData` for create/update payloads and `OnboardingState` for onboarding-related context state.

## Medium-priority suggestions
- Replace `Record<string, any>` / `any` in `customFields` and form configs with typed aliases
  - Files: `src/types/event.ts` already defines `customFields?: Record<string, any>`; consider `Record<string, string|number|boolean>` or a `CustomFields` type and use it where `customFields` / `formConfig` appears (e.g. `SpeakerForm`, `SpeakerFormBuilder`, `SpeakerIntakeForm`).

- `StarterPreset` / `PresetData` for card-builder constants and presets
  - Files: `src/components/CardBuilder.tsx`, `src/constants/websiteCardTemplates.ts`, `src/constants/promoCardTemplates.ts`, `src/lib/card-builder-helpers.ts`, `src/lib/card-builder-templates.ts`
  - Change: Annotate presets with `PresetData[]` / `StarterPreset[]` and update functions that accept/build presets to use the typed signatures.

## Low-priority / cleanup suggestions
- Replace many `: any` error catches with `unknown` and narrow before use
  - Files across codebase: `*.tsx` catch blocks (e.g. `FinishSignUp.tsx`, `Auth.tsx`, `AddSpeakerDialog.tsx`, many others). Change `catch (err: any)` → `catch (err: unknown)` then assert or narrow (e.g., `if (err instanceof Error) ...`).

- Replace `useState<any[]|null>` with specific typed state
  - Examples: content items, preview lists in `SpeakerFormBuilder.tsx`, `SpeakerIntakeForm.tsx`.

- Replace `const payload: any = {}` with typed payloads (e.g. `Partial<Speaker>` or `EventData`)
  - Files: `src/pages/organizer/CreateEvent.tsx`, `src/pages/public/SpeakerIntakeForm.tsx` and similar.

## Concrete file-by-file hits (examples)
- `src/pages/public/SpeakerIntakeForm.tsx`
  - Many `any` casts and `payload: Record<string, any>` → define `type SpeakerPayload = Partial<Speaker> & { customFields?: Record<string,string> }` and use it for payload construction and function signatures.

- `src/components/SpeakerForm.tsx`
  - `type Values = Record<string, any>` → replace with `type Values = Partial<Record<keyof Speaker, unknown>>` or a dedicated `FormValues` type. `formConfig?: any[]` → `formConfig?: FormFieldConfig[]` (if `FormFieldConfig` exists) or a small interface.

- `src/contexts/EventAccessContext.tsx` and `src/components/dashboard/EventCard.tsx`
  - The `isEventPaid(ev: any)` helper and query `useQuery<any>` → annotate event data as `Event` and use `ev.trialEnded` (and map snake_case fallbacks if needed). Keep defensive code for legacy snake_case.

## How I validated these suggestions
- Repo-wide search for `: any`, `as any`, `useQuery<any>`, `Record<string, any>`, and for obvious payloads like `payload: any` or `payload: Record<string, any>`.

## Next steps I can take (pick one)
1. Produce a filtered patch converting the highest-impact places (e.g. `useQuery<any>` → `useQuery<Event|Speaker[]>` and associated casts) and update imports to `import { Event, Speaker } from './types/event'`.
2. Create typed aliases for form configs and apply them to `SpeakerForm`, `SpeakerFormBuilder`, and `SpeakerIntakeForm`.
3. Run a stricter linting pass to list remaining `any` usages after a first-round conversion.

Tell me which next step you want and I'll prepare the patch. If you prefer, I can start with (1) and convert the top 8 files I listed.
