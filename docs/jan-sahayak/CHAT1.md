# JAN SAHAYAK — Chat 1 (Compacted)
## Full Development History · April 21, 2026
## Janman People's Foundation · Jan Nyaya Abhiyan · Bihar

---

## BUILD SEQUENCE

### Round 1 → Core Community App Extension
**Input**: Existing `jan-sahayak-community.tsx` (473 lines) with: Home, Intake, Schemes, Laws, PLV Training, PLV Join, PLV Refer, Campaign Builder
**Added**:
- **Report Abuse** — trauma-informed 3-step flow (safety check → incident details → AI analysis). 10 incident types. AI returns: applicable laws, mandatory reporting flags, FIR sections, immediate steps, support centres
- **Helplines Directory** — 17 helplines across 9 categories with tap-to-call. Emergency numbers pinned at top
- **AI Rights Analyzer** — new mode within Laws. User describes incident → AI returns violated rights with constitutional provisions, applicable laws, FIR sections, next steps
- **CrisisPanel component** — reusable emergency panel shown when danger detected

### Round 2 → All 9 Core Features
**Added**:
- **Voice Assistant** — Web Speech API (`SpeechRecognition` + `speechSynthesis`). Distress keyword detection (Hindi+English: maar, bachao, suicide, बलात्कार, etc). AI intent parsing routes to correct screen. Text fallback always available
- **Nyaya Sahayak Registration** — Full form (name, phone, district, block, village, age, gender, education, occupation, languages, motivation, referral code). Generates unique ID: `NS-{DIST_2CHAR}-{RANDOM_4}`. Consent toggle for directory visibility. Stored in persistent storage
- **Enhanced Training** — 8 structured courses with AI-generated 300-word bilingual lessons (3 tips + 1 case example). Progress bar persists across sessions. Links to PLV quick modules with interactive quizzes
- **Scheme Application Forms** — Schemes with fillable fields generate Janman-branded printable forms with: office address, applicant details, declaration, signature line. Print/PDF + WhatsApp share buttons

### Round 3 → Case Journey Tracker (Standalone)
**Designed 7-stage case lifecycle**:
```
📝 Reported → 👤 Assigned → 📞 First Contact → 📋 Assessment → ⚡ Actions → ⚖ Court → ✅ Resolution
```
- Vertical timeline with expandable stages
- 16 action types (FIR, legal notice, RTI, PIL, mediation, counselling, etc)
- Litigation tracker: court type (10 types), case number, hearing log, court orders, next hearing date
- Resolution with outcome classification + user feedback
- 3 demo cases: DV with protection order, Dalit land grabbing with HC writ, widow denied ration card

### Round 4 → Full Integration
**Merged everything + added**:
- **Phone + OTP Login** — phone input → 4-digit OTP (demo shown on screen, production=SMS). Session persists in storage. New user registration (name+district). Logout
- **Case Documents** — Documents tab per case. 14 document types (FIR copy, legal notice, court order, petition, medical, scheme form, RTI, evidence, etc). Each shows: type icon, name (bilingual), date, uploader, size, download button
- **Pro App Sync Bridge** — shared storage architecture:
  - Community writes `jsc_newcase_{id}` (shared=true) → Pro picks up
  - Pro writes `jsc_pro_{phone}` (shared=true) → Community reads
  - Pro writes `jsc_pd_{caseId}` (shared=true) → Documents sync
  - Sync button with timestamp

### Round 5 → Complete Build (796 lines)
- All features in single component
- Fixed `ACT_TYPES` undefined bug
- All brace-balanced and verified

### Round 6 → Next.js MERN Deployment
**Restructured for production Next.js**:
- `"use client"` component with lib imports
- Server-side API proxy (`/api/jan-sahayak/route.js`) — Anthropic key never in client
- `localStorage` replaces artifact `window.storage`
- Setup script creates `Shashwat_Local` branch, auto-detects project structure, deploys files, git commits
- `chat1/TRANSCRIPT.md` saved

---

## ARCHITECTURE

### File Map
```
src/app/jan-sahayak/page.jsx           → Next.js page (dynamic import, SSR off)
src/app/jan-sahayak/layout.jsx          → SEO metadata + viewport
src/app/api/jan-sahayak/route.js        → Anthropic Claude proxy (key server-side)
src/components/jan-sahayak/JanSahayakApp.jsx → Complete app (785 lines)
src/lib/jan-sahayak-storage.js          → sg/ss/uid/aiCall/pj helpers
chat1/                                  → This chat transcript
.env.local                              → ANTHROPIC_API_KEY
```

### Storage Keys
| Key | Purpose | Shared |
|-----|---------|--------|
| `jsc_sess` | Login session | No |
| `jsc_u_{phone}` | User profile | No |
| `jsc_cs_{phone}` | Cases | No |
| `jsc_tprog` | Training progress | No |
| `jsc_pro_{phone}` | Cases from Pro app | Yes |
| `jsc_pd_{caseId}` | Documents from Pro | Yes |
| `jsc_newcase_{id}` | New case → Pro pickup | Yes |
| `jsc_ns_{id}` | Nyaya Sahayak registration | Yes |

### API Flow
```
Client → POST /api/jan-sahayak {prompt, max_tokens}
       → Server reads ANTHROPIC_API_KEY from env
       → POST api.anthropic.com/v1/messages
       → Returns {text: "..."}
```

### Screen Router
```javascript
screen state → if(scr==="home") / "voice" / "intake" / "schemes" / "laws" /
               "training" / "plvMod" / "campaign" / "abuse" / "helplines" /
               "nsJoin" / "nsOk" / "cases" / "detail"
```

### Auth Flow
```
loading → login (phone) → otp (verify) → reg (name+dist if new) → app
                                                                    ↓
                                              session persists → auto-login
```

### Case Lifecycle
```
REPORTED ──→ ASSIGNED (fellow+SW) ──→ FIRST CONTACT (notes)
  ──→ ASSESSMENT (rights, laws, plan) ──→ ACTIONS (FIR, notice, RTI, etc)
  ──→ LITIGATION? (court, hearings, orders, next date)
  ──→ RESOLUTION (outcome, days, feedback)
```

---

## DATA CONSTANTS SUMMARY

- **SCHEMES**: 12 (7 central + 5 Bihar). Fields: id, level, cat, name, hi, desc, eligibility, docs, apply, hotline, office, form_fields
- **LAWS**: 8 major acts with FAQs. BNS, BNSS, SC/ST Act, POCSO, DV Act, JJ Act, Bihar Land Laws, Constitution
- **PLV_MOD**: 6 modules with quiz (FIR, Arrest, POCSO, DV, SC/ST, Land)
- **TRAIN_COURSES**: 8 courses with topics for AI lesson generation
- **HELPLINES**: 10 categorized (emergency, women, children, legal, health, mental, cyber)
- **ABUSE_TYPES**: 9 types (physical, sexual, caste, domestic, child, trafficking, custodial, land, other)
- **ACT_TYPES**: 15 action types for case tracking
- **DOC_TYPES**: 11 document types
- **STAGES**: 7 case stages
- **FELLOWS**: 6 district legal fellows (Araria, Katihar, Bhagalpur, Kishanganj, Purnia, Patna)
- **BD**: All 38 Bihar districts
- **DISTRESS_KW**: 19 Hindi+English keywords for crisis detection

---

## DESIGN PRINCIPLES

1. **Bilingual**: `tx(english, hindi)` helper. All data has en/hi fields
2. **Safety-first**: CrisisPanel before any content when danger detected
3. **Trauma-informed**: Minimum data collection for abuse reports. Safety check first
4. **Privacy-default**: "stored on device", consent required for sharing
5. **Offline-capable**: localStorage persistence
6. **Mobile-first**: 480px max-width, touch targets, tap-to-call
7. **API secure**: Server proxy, key never in client bundle
8. **Progressive**: Demo data loads for first-time users
9. **Constitutional**: All legal content grounded in BNS/BNSS/Constitution/Bihar laws

---

*Janman People's Foundation · Built April 2026*
