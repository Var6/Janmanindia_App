# Janman Legal Aid — AI Tools: Current State & Prospective Roadmap

How AI is wired into the platform today, and a concrete, phased plan for what
to build next. Written for both engineers (integration patterns) and
leadership (what it buys us, what it risks).

---

## 1. What exists today

All AI traffic flows through **one authenticated server proxy** —
`POST /api/ai/draft` (`app/api/ai/draft/route.ts`):

- Signed-in, non-pending users only (it spends real API credits).
- Wraps the **Anthropic SDK** server-side (`ANTHROPIC_API_KEY` never reaches a
  browser).
- Accepts `{ system, messages, max_tokens, tools }`, returns `{ text }`.
- Currently pinned to a Claude Sonnet-class model, max 4 096 output tokens.

### Current consumers

| Feature | Where | What it does |
|---|---|---|
| **Jan Sahayak** (community) | `components/jan-sahayak/JanSahayak.tsx` | Plain-language legal help: schemes, rights, BNS/BNSS/POCSO/SC-ST guidance for community members. |
| **Jan Sahayak Pro** (staff) | `components/jan-sahayak-pro/JanSahayakPro.tsx` | Staff-side legal research and case-sourcing assistant. |
| **Legal Suite** | `components/legal-suite/LegalSuite.tsx` | Litigation team's drafting/analysis workbench. |
| **JNA drafter + knowledge** | `components/jna-sourced/Drafter.tsx`, `LegalKnowledge.tsx` | Petition/letter drafting; statute lookups. |
| **Events planner** | `components/event-pipeline/*`, `jnp-event-pipeline.tsx` | Concept notes, agendas, checklists, logistics plans, report formats for campaigns. |
| **AI-cached i18n** | `lib/translate-store.ts` + `Translation` model | Hindi/English UI translation: unknown strings are translated by Claude **once**, cached in Mongo, then served from the DB — cost approaches zero over time. |

### Existing hooks the next features can stand on

- **OCR pipeline** — case documents carry `ocrStatus`/`ocrText`; an external
  OCR service posts extracted text back to `/api/documents/ocr`. That text is
  AI-ready input.
- **Voice notes** — `VoiceMessage` model + recorders across intake/chat
  (recordings from members who can't read/write).
- **Rich structured case data** — enquiry facts, diary entries, hearings,
  workflow stage marks, review meetings, audit log: everything a summariser or
  triage model needs is already captured.
- **Notification system** — bell + reminder engine to deliver AI outputs
  (digests, flags) without new UI.

---

## 2. Integration patterns (how we build AI features here)

1. **Server-proxy only.** Every new AI call goes through `/api/ai/draft` (or a
   sibling purpose-built handler). No browser ever holds a key. Auth + role
   checks happen before the model is invoked.
2. **Structured outputs.** For machine-consumed results (triage labels, field
   extraction), use Claude tool-use / JSON schemas rather than free text, and
   validate server-side before writing anything to Mongo.
3. **Cache aggressively.** Follow the `Translation` pattern: deterministic
   inputs (a document, a string) → cache the model output keyed by content
   hash. Summaries and extractions should never be paid for twice.
4. **Human-in-the-loop for anything legal.** AI output lands as a *draft* or
   *suggestion* (a pre-filled form, a proposed summary) that a staff member
   confirms. Nothing AI-written enters the case record unattributed or
   unreviewed.
5. **PII discipline.** Send the model the minimum needed (e.g. redact phone
   numbers for triage). Log which model/version produced which artifact.
6. **Cost control.** Per-feature `max_tokens` ceilings, Haiku-class models for
   classification/extraction, Sonnet-class for drafting; monthly spend review
   against the Anthropic console.

---

## 3. Prospective roadmap

### Phase 1 — high value, low risk (weeks, not months)

| # | Feature | How | Builds on |
|---|---|---|---|
| 1 | **Intake triage & routing** | On case-enquiry submit, classify: issue category, urgency (SOS-adjacent?), suggested case type + court level, district routing. Structured output pre-fills the case; SW confirms. | Enquiry schema, `CASE_ISSUES` vocabulary. |
| 2 | **Document summarisation** | When OCR text lands, generate a 5-line summary + key dates/parties onto the document card; cache by content hash. | `ocrText` webhook, documents UI. |
| 3 | **Hearing-prep pack** | One click on a case: summary of facts, current stage, last orders, open action items, next-hearing checklist — from data already on the Case aggregate. | Case aggregate, review meetings. |
| 4 | **Director's daily digest** | Nightly cron: summarise all staff daily reports + flag misses/risks into one bell notification / email-style digest for the reviewer group. | StaffDailyReport, cron + notifications. |
| 5 | **Voice-note transcription** | Transcribe community voice intros/messages (Hindi/Maithili/Bhojpuri) so SWs can read + search them; attach transcript to the VoiceMessage. | VoiceMessage model, R2 audio. |

### Phase 2 — deeper workflow integration

| # | Feature | How |
|---|---|---|
| 6 | **Case-file RAG assistant** | "Ask this case anything": retrieval over the case's own documents/diary/orders (embeddings per case, stored in Mongo/Atlas Vector Search), answers with citations to the source document. Litigation-only. |
| 7 | **Drafting with case context** | Upgrade the JNA Drafter to auto-fill petitions/applications from the case's parties, facts, sections, and court — lawyer edits rather than writes. |
| 8 | **GBV/risk flagging** | Classifier pass over new enquiries + diary entries for escalation-worthy risk signals (threats, minors, custodial issues) → notify SW lead. Tuned for high recall, human-verified. |
| 9 | **Smart activity/report nudges** | Weekly per-person summary: open todos, overdue activities, report streak — generated and delivered via the existing notification engine. |
| 10 | **Expense receipt extraction** | Receipt image → OCR → amount/vendor/date pre-filled on the expense form; mismatch highlighting for approvers. |

### Phase 3 — external reach (needs partnerships/infra decisions)

| # | Feature | Notes |
|---|---|---|
| 11 | **eCourts/cause-list watcher** | Poll eCourts by court case number; AI normalises order text into diary entries + auto-updates next-hearing dates. Legal/ToS review of scraping vs APIs needed first. |
| 12 | **WhatsApp intake bot** | Community members file enquiries and get hearing reminders over WhatsApp (Business API); the bot runs the same triage as #1. Biggest reach multiplier for Bihar; requires BSP onboarding + consent design. |
| 13 | **Judgment research assistant** | Retrieval over indexed judgments (Indian Kanoon/SC/HC sources) for the litigation team, with mandatory citation links. |

### Explicitly deferred / cautioned

- **Outcome prediction** ("will we win?") — ethically fraught, data-poor at
  our scale; not planned.
- **Fully automated legal advice to community members** — Jan Sahayak stays
  informational with clear "talk to your social worker" framing; a human
  remains in every advice loop.

---

## 4. Risks & guardrails

| Risk | Mitigation |
|---|---|
| Hallucinated law/citations | Drafting outputs are always human-reviewed; research features must cite retrievable sources; no uncited legal claims surface to community users. |
| PII leakage to third parties | Server-side calls only; minimum-necessary context; Anthropic's no-training-on-API-data posture; redact identifiers where the task allows. |
| Cost runaway | Authenticated proxy (already enforced), per-feature token ceilings, cached outputs, small models for classification. |
| Over-reliance by junior staff | AI artifacts are labelled as drafts; review meetings + director oversight remain the system of record. |
| Language quality (Hindi/regional) | Keep the human-editable translation cache; sample-audit transcriptions/translations quarterly. |

## 5. Sequencing recommendation

Start with **#1 intake triage** and **#2 document summarisation**: both reuse
existing data hooks, ship in days each, and remove real staff toil. **#4
director digest** is the cheapest visible win for leadership. Phase 2's RAG
assistant is the highest-leverage item for the litigation team but should wait
until Atlas Vector Search (or equivalent) is provisioned. Phase 3 items each
need a partnership or compliance decision before code.
