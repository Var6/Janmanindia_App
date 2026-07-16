# Janman Legal Aid — Tech Stack

One deliberately small stack: a single Next.js app, one database, and a handful
of managed services. Chosen for a lean team — nothing to operate ourselves
except the code.

## Core

| Layer | Technology | Version | Why |
|---|---|---|---|
| Framework | **Next.js (App Router)** | 16.x | One codebase for SSR pages, API routes, middleware and cron targets; deploys to Vercel with zero ops. |
| UI runtime | **React** | 19.2 | Server Components for fast first paint on dashboards; client components only where interactivity needs it. |
| Language | **TypeScript** | 5.x | End-to-end types incl. Mongoose model interfaces. |
| Styling | **Tailwind CSS v4** + CSS custom properties | 4.x | Design tokens (`--accent`, `--surface`, status colours…) drive light/dark themes; utility classes everywhere; shared primitives (`.page-hero`, `.card-lift`, `.rt-content`, `data-tip` tooltips) in `globals.css`. |
| Fonts | Manrope · Fraunces · JetBrains Mono · Noto Sans Devanagari | via `next/font` | Latin + Hindi typography. |

## Data

| Layer | Technology | Notes |
|---|---|---|
| Database | **MongoDB Atlas** | Single `janmandb` database, ~30 collections. |
| ODM | **Mongoose 9** | Schemas in `models/`; `.lean()` reads, compound indexes, embedded sub-documents for aggregates (case workflow paths, report comments, activity todos). |
| File storage | **Cloudflare R2** (S3-compatible, via `@aws-sdk/client-s3`) | Documents, receipts, voice notes. Local-disk fallback in dev. |
| Ops mirror | **Airtable** (`airtable`) | One-way sync of tickets/grievances/activities for non-technical ops viewing. |

## Auth & security

| Concern | Technology |
|---|---|
| Sessions | Signed JWT (**jose**) in an `httpOnly` cookie; verified in `proxy.ts` middleware on every request. |
| Passwords | **bcryptjs** (12 rounds). |
| SSO | Google OAuth (login + per-user Calendar consent), `googleapis`. |
| Authorization | Role-based (9 roles) — enforced in middleware, `AppShell` layouts, and per-handler role/ownership checks. |

## Integrations

| Service | Used for |
|---|---|
| **Anthropic Claude** (`@anthropic-ai/sdk`) | All AI features, exclusively through the authenticated server proxy `POST /api/ai/draft` and the server-side translation store. See `docs/AI-INTEGRATION.md`. |
| **Google Calendar API** | Per-user OAuth sync: activities, case hearings, appointment slots (freebusy suggestions). |
| **External OCR service** | Async document text extraction via webhook (`/api/documents/ocr`). |
| **Vercel Cron** | Daily case-review overdue check (03:00 UTC) + daily-report reminders (18:00 IST). |
| **@react-pdf/renderer** | Client-side PDF generation (structured reports, ICP) — code-split out of initial bundles. |
| **@vercel/analytics** | Page analytics. |

## Internationalisation

Custom lightweight i18n (English/Hindi): server (`getServerT`) and client
(`useT`) translators backed by a **Claude-powered translation cache** — unknown
strings are machine-translated once, stored in the `Translation` collection,
then served from Mongo thereafter. Devanagari handled via font fallbacks.

## Quality & tooling

- **ESLint 9** (`eslint-config-next`) with React-hooks purity rules.
- `npm audit` kept at **0 vulnerabilities** (transitive pins via `overrides`).
- Build: `next build` (Turbopack) with `NODE_OPTIONS=--max-old-space-size=8192`.
- Scripts (`scripts/*.mjs`): seeding, seed cleanup (dry-run-first), Google
  Play review account, superadmin bootstrap — all idempotent, all read
  `MONGODB_URI` from `.env.local`.

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string. |
| `JWT_SECRET` | Session signing. |
| `NEXT_PUBLIC_APP_URL` | Canonical origin (OAuth redirects, OCR callback). |
| `ANTHROPIC_API_KEY` | Claude (server-only). |
| `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_LOGIN_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI` | Calendar consent + Google sign-in. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY`, `GOOGLE_CALENDAR_ID` | Legacy shared-calendar path. |
| `R2_*` | Cloudflare R2 bucket credentials. |
| `OCR_SERVICE_URL/KEY`, `OCR_CALLBACK_SECRET` | OCR round-trip. |
| `AIRTABLE_API_KEY/BASE_ID/TABLE_*` | Ops mirror. |
| `CRON_SECRET` | Authenticates Vercel cron calls. |

## Deployment

- **Vercel** — production at `app.janmanindia.org`; every push to `main`
  deploys. Crons configured in `vercel.json`.
- **MongoDB Atlas** — managed cluster; take a snapshot before destructive
  scripts (`cleanup:seed --apply`).
- No servers, queues, or containers to operate.
