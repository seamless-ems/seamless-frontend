# Seamless Events - Beta Frontend

## IMPORTANT: Always remind James to do a GIT Pull before we start development — do not start coding until he confirms it is complete

A Vite + React + TypeScript frontend for Seamless Events, an operational event management system. Built with shadcn/ui component patterns and Tailwind CSS.

**Project Philosophy:** "The Trello of event operations" — stays in the background, operational not decorative, professional not flashy.

**Current Status:** Beta phase — actively migrating features from offline prototype to production-ready app.

⚠️ **IMPORTANT:** Proceed carefully and do not make any structural changes (component refactors, major integrations, routing changes) without first requesting approval. Major changes can impact data flow and backend connectivity.

## Quick start

Requirements:
- Node.js (v18+ recommended)
- npm

```bash
git clone <repo-url>
cd seamless-frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## What to read next
- Development & onboarding: `CLAUDE.md`
- API gaps and backend notes: `API_GAPS.md`
- Full API spec: `openapi.json`

## Notable folders
- `src/` — app source (components, pages, hooks, lib, types)
- `public/` — static assets

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## GitHub Workflow (WSL)

**Push:**
```bash
git status
git add .
git commit -m "your message"
git push origin beta
```

**Pull:**
```bash
git pull origin beta
```

Active branches: `main` (stable), `beta` (active development)

TODO:
- default topic and sample content in applications form setup
- pin: how to deal with content/ talk topic for speaker form/ content
- auto-reload when going back from cards to speaker overview (Do same as what we do from Applications form to speaker overview)
- For speakers we need to make an anon user (use same approach as musi-nova)
- Add resend email functionality on speaker overview page (similar to what we have on applications form)
- Add download social card on social card tab (currently we are downloading as html which is not ideal, we should convert it to png or something similar before downloading)
- Need to call the /email function on the approve -> call for speakers flow
- If speaker card approved (web one) is approved it should end up in the speaker wall regardless of whether the social card is approved or not (currently if the social card is not approved it doesn't end up in the speaker wall even if the web card is approved)
- Hide/ disable edit functionality based on /me role key
- Update speaker/SpeakerDashboard.tsx to use the `SpeakerPortal.tsx` component. We will need to slightly modify this as at the moment it is nesting the navbars
- For file upload in the applications form we only allow image file formats atm (need to allow other file types) but we still force jpeg, jpg, png for the headshot and logo uploads
- For custom field file upload toggle on all these: `pdf, doc, docx, xls, xlsx, csv, txt, rtf, html, zip, mp3, wma, mpg, flv, avi, jpg, jpeg, png, gif` (3 columns)
- 