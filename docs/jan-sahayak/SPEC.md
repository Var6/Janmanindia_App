# Jan Sahayak — Original Spec (Reference)

> Origin: Jan Sahayak Chat 1 · April 2026 · Janman People's Foundation
> Status: **Reference only.** This describes a separate single-page Jan Sahayak project (JSX, src/, inline styles, screen-router).
> The current repo (Next.js 16 App Router, TypeScript, Tailwind, role-based dashboards) selectively adopts ideas from this spec — see "Adapted into this codebase" at the bottom.

---

## Project Identity

**Jan Sahayak (जन सहायक)** — civic-tech legal aid platform by Janman People's Foundation / Jan Nyaya Abhiyan, Bihar. Serves marginalized communities (Dalits, Adivasis, women, children, disabled, landless labourers) by combining legal knowledge, government scheme access, paralegal training, AI-powered triage, case tracking, and campaign building.

**Stack**: Next.js (App Router) + React + MERN. No UI library — inline styles using the colour system below. Anthropic Claude API via server-side proxy.

**Branch**: `Shashwat_Local`

---

## Colour System

```javascript
const W = {
  bg: "#FFF8F0",       // warm cream background
  card: "#fff",
  accent: "#C84B31",   // burnt sienna
  accentSoft: "rgba(200,75,49,0.08)",
  green: "#2E7D32",    // success, welfare
  blue: "#1565C0",     // info, training, AI
  purple: "#6A1B9A",   // campaign, court
  text: "#1A1A1A",
  dim: "#555",
  border: "#E0D5CC",
  muted: "#999",
  danger: "#B71C1C",   // emergency
  teal: "#00695C",     // Nyaya Sahayak
};
```

**Fonts**: Noto Sans + Noto Sans Devanagari from Google Fonts.

---

## Architecture

### File Structure
```
src/
├── app/
│   ├── jan-sahayak/
│   │   ├── page.jsx          ← "use client", dynamic import SSR=false
│   │   └── layout.jsx
│   └── api/
│       └── jan-sahayak/
│           └── route.js       ← Anthropic proxy
├── components/
│   └── jan-sahayak/
│       └── JanSahayakApp.jsx  ← MAIN COMPONENT (785 lines)
└── lib/
    └── jan-sahayak-storage.js ← sg/ss/uid/aiCall/pj
```

### Patterns
- **Screen router**: `const [scr, setScr] = useState("home")`
- **Bilingual**: `tx(en, hi)` everywhere
- **Storage**: `sg(key, shared?)` / `ss(key, val, shared?)`
- **AI**: `aiCall(prompt, maxTokens)` → `POST /api/jan-sahayak`
- **Components**: B (Button), I (Input), Sel (Select), H (Header), CrisisPanel

---

## AI Persona

Every Claude prompt embodies 4 roles simultaneously:

| Role | Expertise | Tone |
|------|-----------|------|
| Senior Lawyer (20+ yrs) | BNS/BNSS/POCSO/DV/SC-ST Act, Constitution, Bihar land laws | Precise, actionable |
| Social Worker | Scheme eligibility, ASHA/Anganwadi | Warm, non-judgmental |
| Welfare Officer | Govt process, documents, office navigation | Step-by-step practical |
| Psychosocial Counsellor | Trauma-informed, distress detection | Calm, empathetic |

**System instruction**:
```
You are Jan Sahayak — trusted legal companion for Bihar communities.
Respond in [LANG]. Simple language. No jargon.
Ground advice in: BNS 2023, BNSS 2023, Constitution, Bihar-specific laws.
NEVER endanger the person. If in doubt, refer to helplines first.
If describing trauma, prioritise safety before legal advice.
```

---

## The 13 Features

| # | Feature | Screen Key |
|---|---------|------------|
| 1 | Phone + OTP Login | `auth` states |
| 2 | Voice Assistant | `voice` |
| 3 | Get Help (Intake) | `intake` |
| 4 | Government Schemes + Forms | `schemes` |
| 5 | Know Your Rights + AI | `laws` |
| 6 | Training (AI + Progress) | `training` |
| 7 | PLV Quick Modules | `plvMod` |
| 8 | Campaign Builder | `campaign` |
| 9 | Report Abuse | `abuse` |
| 10 | Helplines | `helplines` |
| 11 | Nyaya Sahayak Register | `nsJoin` / `nsOk` |
| 12 | Case Tracker (7-stage) | `cases` / `detail` |
| 13 | Case Documents + Pro Sync | inside `detail` |

---

## Roadmap (P0 → P2)

**P0 — Production Critical**
1. MongoDB Atlas (replace localStorage)
2. Real SMS OTP (MSG91 / Twilio)
3. File upload (Multer / Cloudinary / S3)
4. Jan Sahayak Pro App (admin/fellow dashboard)

**P1 — High Value**
5. Scheme Application PDF generation
6. WhatsApp Business API
7. Certificate generation for training
8. Nyaya Sahayak Directory matching

**P2 — Enhancement**
9. PWA + Service Worker
10. Push notifications
11. Multi-state expansion
12. Privacy-preserving analytics
13. Maithili / Bhojpuri / Urdu support

---

## Data Shapes

### Case
```javascript
{
  id: "JNY-PU-2024-0047",
  phone, type, urgency,
  sm, hm,                              // summary EN/HI
  currentStage,
  stages: {
    reported, assigned, first_contact,
    assessment: { ri:[], pl:[], hpl:[] },
    actions: { items: [{ id, ty, dt, st, nt, hnt }] },
    litigation: { active, cases: [{ no, ct, hct, lw, hs:[], nxDt, ords:[] }] },
    resolution: { type, date, sm, hm, days }
  },
  docs: [{ id, ty, nm, hn, dt, by, sz }]
}
```

### Scheme
```javascript
{
  id, lv:"c"|"b", cat, n, hi, ds, hd,
  el, dc:[], ap, hl, of,
  ff: [{ i, l, h, t }]
}
```

---

## Mental Health Protocol

**Distress keywords** (scan ALL user input):
```
maar, peet, darr, bachao, suicide, khatam, marna, dard,
डर, मार, बचाओ, आत्महत्या, खत्म, बलात्कार, torture, kill, hurt myself, जान
```

**If detected**: Show `CrisisPanel` IMMEDIATELY. Do NOT continue the previous flow.

**NEVER**: diagnose, use clinical labels, say "calm down", end conversation abruptly.
**ALWAYS**: validate feelings, go at their pace, offer human connection.

---

## Coding Rules

1. All text bilingual via `tx(en, hi)`
2. Mobile-first — maxWidth 480px, touch targets ≥44px
3. No external UI libs — inline styles only with `W` colour object
4. API key NEVER in client — all AI calls via `/api/jan-sahayak`
5. Trauma-aware — safety check before data collection
6. Data minimalism + privacy notices
7. Offline graceful — fallback content for API errors
8. Constitutional grounding — cite BNS/BNSS sections, Article numbers
9. Test with Hindi default
10. Progressive enhancement — demo data → real data

---

## Pro App Sync Protocol

```
COMMUNITY APP                         PRO APP
─────────────                         ───────
ss("jsc_newcase_{id}", data, true) ──→ Reads
                              ←──── ss("jsc_pro_{phone}", cases, true)
                              ←──── ss("jsc_pd_{caseId}", docs, true)
sg("jsc_pro_{phone}", true) ────→
sg("jsc_pd_{caseId}", true) ────→
```

In production: replace shared localStorage with MongoDB + WebSocket.

---

## Bihar Reference

- **District Fellows**: Araria (Nawaz), Katihar (Tausif), Bhagalpur (Mithlesh), Kishanganj (Pintu), Purnia (Nagmani), Patna (Sachina)
- **Emergency**: 112 (Police), 181 (Women), 1098 (Childline), 15100 (Legal Aid), 14555 (Ayushman)
- **Bihar-specific**: Kanya Utthan (0612-2233333), Student Credit Card (1800-3456-444), Maha Dalit (0612-2217870)

---

## Adapted into this codebase

The current Janman_App repo cherry-picked these primitives from this spec (rather than re-architecting):

| From spec | Lives at | Notes |
|-----------|----------|-------|
| Distress keyword scanner | [lib/crisis.ts](../../lib/crisis.ts) | `detectsDistress(text)` — EN+HI keywords |
| CrisisPanel component | [components/shared/CrisisPanel.tsx](../../components/shared/CrisisPanel.tsx) | Bilingual; `urgent` mode + `nationalOnly` flag |
| Bihar + national helplines | [lib/helplines.ts](../../lib/helplines.ts) | Single source of truth, `tel:` links |
| Noto Sans Devanagari font | [app/layout.tsx](../../app/layout.tsx), [app/globals.css](../../app/globals.css) | `.lang-hi` and `:lang(hi)` opt in |
| SOS distress integration | [app/(roles)/user/sos/page.tsx](<../../app/(roles)/user/sos/page.tsx>) | Real-time scan of textarea → urgent banner |

**Discarded** (architectural mismatch with the multi-route TypeScript App Router build):
- 785-line monolith / screen-router pattern
- JSX over TSX
- Inline-styles-only with `W` colour object
- localStorage as primary store (this repo uses MongoDB / Mongoose)
- Phone+OTP auth (this repo uses email+JWT via jose)
