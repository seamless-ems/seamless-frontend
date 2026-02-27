## Executive Summary (priorities)

- **High**
  - Liberal use of `any` and `as any` in public/embed pages (e.g. `src/pages/public/PromoEmbedSingle.tsx`, `src/pages/public/PromoEmbed.tsx`) — undermines TypeScript guarantees and makes maintenance riskier.
  - Several `TODO` markers indicating incomplete integration with backend or placeholder logic (e.g. onboarding API calls, speaker data). Address or track these in issue tracker.

- **Medium**
  - Missing or thin test coverage, no CI configured to run lint/build/tests on PRs.
  - Some large components and pages that can be split up to improve readability and testability (e.g. `SpeakerIntakeForm.tsx`, `WebsiteCardBuilder.tsx`, `Onboarding.tsx`).

- **Low / Nice-to-have**
  - Improve code style consistency (formatting, ESLint rules), add Prettier and enforce via pre-commit hooks.
  - Accessibility (a11y) checks and ARIA improvements for interactive components.

---

## Findings (concrete examples)

- Weak TypeScript usage
  - `src/pages/public/PromoEmbedSingle.tsx` and `src/pages/public/PromoEmbed.tsx` use `any` extensively and `as any` casts when parsing remote data. Replace with narrow types or runtime validation (e.g. `zod`) for public embeds.

- TODOs
  - `src/components/onboarding/Onboarding.tsx` contains a `// TODO: Replace with actual API calls when backend endpoints are ready` block.

---

## Prioritized Action Plan (recommended next steps)

2. Improve TypeScript usage and API typing
   - Enable `strict` mode in `tsconfig.json` (`noImplicitAny`, `strictNullChecks`, etc.).
   - Introduce types for API responses in `src/lib/api.ts` and stop using `any` or `as any` in public embed code. Use `zod` or runtime validation for external data.
   - Centralize parsing logic for public embeds (helper that normalizes backend shape into app types).

3. Small/Medium refactors (next sprint)
   - Break up large components into smaller, focused components and hooks:
     - `SpeakerIntakeForm.tsx` -> `useSpeakerForm` hook + smaller child components
     - `WebsiteCardBuilder.tsx` and `Onboarding.tsx` -> smaller units + tests
   - Add unit tests (React Testing Library + Vitest/Jest) for critical flows and components.
   - Add E2E tests (Cypress or Playwright) for user flows like signup -> onboarding -> dashboard.

---

## File-specific notes (short)

- `src/pages/public/SpeakerIntakeForm.tsx`
  - Many console statements and try/catch blocks that swallow or only log errors. Replace with consistent UI feedback and remove dev logs.
  - Break into smaller components (file upload UI, form fields) and extract file upload logic to `src/lib/uploads.ts`.

- `src/pages/public/PromoEmbed.tsx` and `PromoEmbedSingle.tsx`
  - Strong use of `any`. Add types for `Speaker` and response shapes; normalize server payloads in a single helper.

- `src/components/onboarding/Onboarding.tsx`
  - Contains an obvious TODO for backend API integration; good candidate for a `useOnboarding` hook which performs API calls and handles retry/failure.

- `src/lib/api.ts`
  - Centralized fetch helpers exist — good. Double-check the chosen auth strategy (Bearer vs cookies). Add typed return values for endpoints.

---