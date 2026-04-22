# Jan Sahayak Pro — Build Prompt (Reference)

> **Status:** Reference only. This describes a *separate* planned project (Vite + React + Supabase + Anthropic) — the team-facing operations app to complement the citizen-facing Jan Sahayak community app.
> The current repo is a different stack entirely (Next.js 16 App Router + Mongoose + JWT). Treat this as design intent for a sibling project, not a directive to refactor this codebase.
> See "Relationship to this codebase" at the bottom for what (if anything) maps over.

---

# PROJECT: Jan Sahayak Pro — Access to Justice Platform for Bihar

Production-grade internal operations platform for **Janman People's Foundation** and the **Jan Nyaya Abhiyan (JNA) campaign** in Bihar, India. Team-facing app (a separate community app will be built later).

## CONTEXT

- **Organization:** Janman People's Foundation, registered NGO working on access to justice in North Bihar
- **Program:** Jan Nyaya Abhiyan — legal aid, casework, rights-based advocacy across 6 districts (Purnia, Araria, Kishanganj, Katihar, Supaul, Madhepura)
- **Active grants:** JNA-2024 (APPI Grant R 2409-19929, Rs 60L, Jul 2024–Jun 2027) and DLF-2025 (Addendum 1, Rs 45.28L, 6 District Legal Fellows)
- **Team (12 members):**
  - Super Admins: Shashwat (Director), Shourya Roy (COO), Roshin Jacob (PM)
  - Coordinator: Mugdha
  - 6 District Legal Fellows: Prakash-Purnia, Sachina-Araria, Nawaz-Kishanganj, Tausif-Katihar, Mithlesh-Supaul, Pintu-Madhepura
  - Nagmani (Social Worker), Ashwini Pandey (Legal Consultant)

## TECH STACK

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (app), TanStack Query (server)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) with web_search tool
- **Fonts:** Cormorant Garamond (display), Mukta (body, Hindi)
- **Icons:** lucide-react
- **Deployment:** Vercel + Supabase Cloud

## DESIGN DIRECTION

**Aesthetic:** Pattachitra-inspired heritage — Bihar/Odisha folk art motifs (Ashoka pillar, lotus, scales of justice, geometric borders) as subtle SVG patterns, not chrome.

**Color palette:**
- Background: Deep burnt-sienna/night `#0F0B07`
- Surface: `#1A140D` / `#221A11`
- Borders: `#3D2E1F`
- Text: Warm cream `#E8D4B8`
- Accent: Amber gold `#E8A243` / Bright gold `#F4C068`
- Status: Crimson `#C74E3F`, Forest `#5EAA7E`, Indigo `#6A9EE0`, Purple `#B68AE0`, Teal `#4EBAAD`

**Typography:** Cormorant Garamond serif for headers, Mukta sans for body. "Satyameva Jayate" Sanskrit tagline under logo.

**Feel:** Judicial gravitas meets accessibility. Dense but not cramped. Heritage but not kitsch.

## CORE ARCHITECTURE

### Role-adaptive home

- **Super Admins:** Daily Briefing → Priority Queue (top 5) → District Dashboard (live Bihar map)
- **Non-super (DLFs, SW, LC):** Daily Briefing → Priority Queue (filtered) → My Cases pipeline

### Database schema (Supabase)

```sql
-- profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  role text not null check (role in ('super','coord','dlf','sw','lc')),
  district text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- queries (incidents, applications, appointments)
create table queries (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('incident','application','appointment')),
  category text,
  description text,
  scheme text,
  complainant_name text,
  complainant_phone text,
  complainant_email text,
  district text,
  location text,
  urgency text default 'normal' check (urgency in ('normal','high','critical')),
  status text default 'new' check (status in ('new','assigned','in_progress','escalated','resolved','closed')),
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  current_stage int default 1 check (current_stage between 1 and 8),
  sla_days int default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

-- action_log
create table action_log (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  note text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- escalations
create table escalations (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade,
  reason text not null,
  escalated_by uuid references profiles(id),
  status text default 'pending' check (status in ('pending','reviewed','resolved')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- socio_economic_assessments
create table assessments (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade unique,
  family_size int,
  monthly_income numeric,
  occupation text,
  housing text,
  land_ownership text,
  caste_category text,
  ration_card text,
  education text,
  water_source text,
  toilet text,
  bank_account text,
  disability boolean,
  widow_head boolean,
  children_school text,
  prior_legal_aid boolean,
  created_at timestamptz default now()
);

-- ai_analyses (cached AI responses)
create table ai_analyses (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade,
  type text check (type in ('case_analysis','document_analysis','briefing','research')),
  input text,
  output jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- documents (Supabase Storage)
create table documents (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- hearings (litigation workflow)
create table hearings (
  id uuid default gen_random_uuid() primary key,
  query_id uuid references queries(id) on delete cascade,
  court text,
  case_number text,
  hearing_date date,
  purpose text,
  outcome text,
  next_date date,
  created_at timestamptz default now()
);

-- RLS
alter table queries enable row level security;
alter table action_log enable row level security;
alter table escalations enable row level security;
alter table assessments enable row level security;

create policy "super_all_queries" on queries for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'super')
);

create policy "dlf_district_queries" on queries for select using (
  exists (select 1 from profiles p where p.id = auth.uid()
    and (p.district = queries.district or queries.assigned_to = auth.uid()))
);

create index on queries(status, urgency);
create index on queries(district);
create index on queries(assigned_to);
create index on action_log(query_id, created_at desc);
```

### Feature Modules (build order)

**PHASE 1 — Foundation**
1. Vite + React + TS + Tailwind + shadcn/ui
2. Supabase client + magic-link auth
3. Role-based routing and layout
4. Base components: Card, Pill, Button, Header, BottomNav with Pattachitra accents
5. SVG pattern assets (Ashoka, mandala, borders, scales)

**PHASE 2 — Core Workflow**
6. Priority Queue with smart scoring:
   - Urgency: +100 critical, +50 high
   - Escalation: +80
   - Days since last action: +60 (>7d), +30 (>3d), +10 (>1d)
   - New status: +40, unattended assignment: +20
   - SLA status: breach (>3d), warning (>1d), ok
7. Query detail view: header, status/assign, escalate, assessment, AI analysis, action log, communicate, one-tap actions, case lifecycle
8. 8-stage litigation tracker (Intake → Assess → Fact → Draft → File → Hear → Judge → Close)
9. My Cases view (personal pipeline)

**PHASE 3 — Intelligence**
10. Daily AI Briefing (Claude with priority queue context)
11. AI Case Analysis (structured JSON: priority, actions, legal, schemes, risk, SLA)
12. Document AI (paste legal doc → extract parties, sections, suggestions)
13. Vidhi Legal Research (Claude + web_search → SCC Online, LiveLaw, Bar & Bench)
14. 20 legal modules (Manual Scavenging, Acid Attack, SC/ST Atrocity, DV, POCSO, Bail Law, RTF, RTE, Police Accountability, Forest Rights, Bonded Labour, Street Vendors, Consumer, RTI, Prisoner Rights, Bihar Land, Disability, Child Rights, Hate Speech, Cyber Crimes)

**PHASE 4 — Dashboard**
15. District Intelligence Map (SVG of Bihar, 6 clickable districts, heat indicators, drill-down)
16. Team performance (workload, resolution rate, SLA compliance per member)
17. Accountability log viewer

**PHASE 5 — Polish**
18. WhatsApp / Email / Group Alert (pre-filled deep links)
19. One-tap actions (FIR, RTI, Bail, Fact-Finding, Legal Camp, Compensation, RTPS, Court Filing) — each logs + advances status
20. Realtime via Supabase subscriptions
21. Offline-first PWA with service worker
22. Audit log CSV export

### Implementation Rules

1. Never mutate state — `[...arr].sort()`, `{...obj}`
2. Components at module scope only
3. Always null-check — `q.description?.slice(0, 50)`
4. Error boundaries per major route
5. Loading states for every async op
6. Zod validates all forms + API responses
7. TypeScript strict — no `any`, no `@ts-ignore`
8. Accessibility — aria-labels, keyboard nav
9. Hindi + English (react-i18next)
10. Secrets in `.env.local` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANTHROPIC_API_KEY`

### AI API

Anthropic Messages API, model `claude-sonnet-4-20250514`. Web search tool for legal research:

```ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  }),
});
```

> Production: proxy through a Supabase Edge Function so the API key isn't client-exposed.

### System Prompts

**Case Analysis:**
> "You are Jan Sahayak AI for Janman People's Foundation, Bihar. Analyze queries with BNS/BNSS 2023 framework. Return strict JSON: {priority, recommended_actions[], legal_provisions[], schemes_applicable[], category, risk_assessment, sla_days, escalation_needed, follow_up_schedule}"

**Document Analysis:**
> "Legal document analyzer. Extract: doc_type, parties, case_no, court, dates, sections_cited, key_findings. Return drafting_suggestions and next_steps arrays. Output JSON only."

**Vidhi Research:**
> "Vidhi AI — legal researcher for Bihar. Use web_search for SCC Online, LiveLaw, Bar and Bench. Provide SCC citations. Focus on BNS/BNSS 2023 and Bihar-specific law. Under 800 words."

**Daily Briefing:**
> "Briefing for [user_name] ([role]). From priority queue: [summary]. Format: MORNING SITUATION (2 sentences), TOP 3 PRIORITIES TODAY (numbered), RISKS (1-2 warnings). Under 150 words."

### File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── routes.tsx
│   └── providers.tsx
├── features/
│   ├── auth/
│   ├── queries/
│   │   ├── PriorityQueue.tsx
│   │   ├── QueryDetail.tsx
│   │   ├── MyCases.tsx
│   │   └── hooks/
│   ├── dashboard/
│   │   ├── DistrictMap.tsx
│   │   ├── DailyBriefing.tsx
│   │   └── TeamPerformance.tsx
│   ├── legal/
│   │   ├── VidhiResearch.tsx
│   │   ├── LegalModules.tsx
│   │   └── DocumentAI.tsx
│   └── actions/
│       ├── ActionLog.tsx
│       ├── OneTapActions.tsx
│       └── Escalation.tsx
├── lib/
│   ├── supabase.ts
│   ├── anthropic.ts
│   ├── priorityScore.ts
│   └── constants.ts
├── components/ui/      (shadcn)
├── components/brand/   (Card, Pill, Hd, FolkBorder, AshokaSVG)
├── styles/             (Tailwind + Pattachitra theme)
└── types/              (Zod schemas + TS types)
```

## REPO HYGIENE

- Conventional commits (`feat:`, `fix:`, `chore:`)
- GitHub Actions CI: lint + typecheck + build on PR
- Husky pre-commit: lint-staged + prettier
- README with setup, env vars, architecture diagram
- `/docs` for feature specs and decision records

---

## Relationship to this codebase

This Pro spec describes a **standalone sibling project** with a different stack than the current repo:

| Concern | This repo | Jan Sahayak Pro spec |
|---|---|---|
| Framework | Next.js 16 App Router (server components) | Vite SPA |
| Backend | Mongoose + MongoDB | Supabase (Postgres + RLS) |
| Auth | JWT (jose) + email/password | Supabase magic link |
| State | Server components + URL state | Zustand + TanStack Query |
| AI | (none yet) | Claude Sonnet 4 + web_search tool |
| Realtime | (none) | Supabase Realtime |

**Concepts worth borrowing into the current repo if/when they come up:**
- **Priority scoring** for case lists (urgency + escalation + age + SLA) → could be added as a `score()` helper used by litigation/socialworker dashboards
- **Action log** as a dedicated collection for accountability (current `Case.caseDiary` is similar but per-case; a global feed would be useful for super-admin)
- **8-stage litigation tracker** is conceptually similar to the criminal/highcourt path stages already in `models/Case.ts` — the column names differ but the lifecycle maps
- **One-tap action drafts** (FIR / RTI / Bail) — could become PDF/template generators
- **20 legal modules** list is a good content roadmap for `/training` content
- **District map drill-down** — useful for super-admin dashboard once enough cases exist

**Do not adopt without explicit ask:**
- Wholesale rewrite to Vite/Supabase
- Pattachitra dark theme (current theme is light + accent-based)
- shadcn/ui (current components are hand-rolled)
- Hindi-everywhere `react-i18next` (current Hindi support is bilingual labels in safety components only)
