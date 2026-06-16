# Case Types & Step Flows — Editable Reference

> **Purpose:** One place to see every case type and the exact steps it moves through.
> **How to use:** Each step shows the **label users see** and the **code location** to change it.
> Write your notes in the `✍️ CHANGE:` lines — e.g. rename a step, add a step, reorder.
>
> _Last generated: 2026-06-16 · for funder meeting_

---

## The big picture (read this first)

Every case in the system has TWO labels:

1. **Case Type** — what kind of case it is (FIR, Writ Petition, Divorce, etc.). 70+ types.
   → Defined in [`lib/case-types.ts`](lib/case-types.ts)
2. **Path (Workflow)** — which step-flow it follows. There are only **TWO flows**:
   - **`criminal`** → Criminal trial flow (+ optional Bail sub-track)
   - **`highcourt`** → 7-step petition flow

So: a case type is just a name; the **path** decides the steps. Every one of the 70+ types
is wired to one of these two flows.

**To change a case type's flow, change its `path` value** in [`lib/case-types.ts`](lib/case-types.ts).

```
┌─────────────────┐        path = "criminal"   ┌──────────────────────────┐
│   CASE TYPE     │ ─────────────────────────▶ │  CRIMINAL FLOW (+ Bail)  │
│ (FIR, WP, etc.) │                            └──────────────────────────┘
│   70+ types     │        path = "highcourt"  ┌──────────────────────────┐
└─────────────────┘ ─────────────────────────▶ │  HIGH COURT 7-STEP FLOW  │
                                                └──────────────────────────┘
```

---

# PART 1 — THE TWO STEP FLOWS

## FLOW A — Criminal Trial Flow  (`path: "criminal"`)

**User-visible steps** (from [`components/shared/CaseWorkflowGraph.tsx`](components/shared/CaseWorkflowGraph.tsx)):

| # | Step (what user sees) | Editable? | Code location | Field / flag |
|---|----------------------|-----------|---------------|--------------|
| 1 | **Case Filed** | auto | CaseWorkflowGraph.tsx:248 | `createdAt` |
| 2 | **FIR Filed** | ✅ clickable | CaseWorkflowGraph.tsx:251 | `criminalPath.firFiled` |
| 3 | **Investigation** | display only | CaseWorkflowGraph.tsx:256 | — |
| 4 | **Chargesheet Filed** | ✅ clickable | CaseWorkflowGraph.tsx:260 | `criminalPath.chargesheetFiled` |
| — | _(branch)_ Final Form → Notice to Informant | display only | CaseWorkflowGraph.tsx:267–269 | shown if no chargesheet in time |
| 5 | **Cognizance** | display only | CaseWorkflowGraph.tsx:278 | `criminalPath.cognizanceOrderDoc` |
| 6 | **Appearance of Accused** | display only | CaseWorkflowGraph.tsx:282 | — |
| 7 | **Framing of Charges** | ✅ clickable | CaseWorkflowGraph.tsx:286 | `criminalPath.chargesFramed` |
| 8 | **Prosecution Witnesses** | display only | CaseWorkflowGraph.tsx:293 | `trial.prosecutionWitnesses[]` |
| 9 | **Defence Witnesses** | display only | CaseWorkflowGraph.tsx:299 | `trial.defenseWitnesses[]` |
| 10 | **Examination of Accused** (Sec 313 BNSS) | display only | CaseWorkflowGraph.tsx:304 | — |
| 11 | **Arguments** | display only | CaseWorkflowGraph.tsx:308 | — |
| 12 | **Verdict** | ✅ clickable | CaseWorkflowGraph.tsx:331 | `criminalPath.verdict` |
| 12a | → **Acquittal** (case ends) | outcome | CaseWorkflowGraph.tsx:316 | verdict contains "acquit" |
| 12b | → **Convicted → Sentencing Hearing → Case Closed** | outcome | CaseWorkflowGraph.tsx:324–328 | verdict recorded |

✍️ CHANGE (rename / add / remove a step):


---

### Bail Sub-Track  (optional, runs alongside the criminal flow)

Turned ON per-case (opt-in). For BA / ABA cases, or any FIR case needing bail.

| # | Step (what user sees) | Editable? | Code location | Field / flag |
|---|----------------------|-----------|---------------|--------------|
| 1 | **Case Filed** | auto | CaseWorkflowGraph.tsx:151 | `createdAt` |
| 2 | **Bail Application Filed** | ✅ clickable | CaseWorkflowGraph.tsx:154 | `bailTrack.bailApplied` |
| 3 | **Bail Hearing** | display only | CaseWorkflowGraph.tsx:161 | `bailTrack.bailHearingDate` |
| 4a | **Bail Granted** (case can be disposed) | ✅ clickable | CaseWorkflowGraph.tsx:167 | `bailTrack.bailDecision = granted` |
| 4b | **Bail Rejected** (re-apply / higher court) | ✅ clickable | CaseWorkflowGraph.tsx:174 | `bailTrack.bailDecision = rejected` |

✍️ CHANGE:


---

## FLOW B — High Court 7-Step Flow  (`path: "highcourt"`)

**User-visible steps** (from [`components/shared/CaseWorkflowGraph.tsx:426–433`](components/shared/CaseWorkflowGraph.tsx#L426)):

| # | Step (what user sees) | Editable? | Field / flag |
|---|----------------------|-----------|--------------|
| 1 | **Case Filed** | auto | `createdAt` |
| 2 | **Petition Filed** | ✅ clickable | `highCourtPath.petitionFiled` |
| 3 | **Supporting Affidavit** | ✅ clickable | `highCourtPath.supportingAffidavit` |
| 4 | **Admission** | ✅ clickable | `highCourtPath.admission` |
| 5 | **Counter Affidavit** | ✅ clickable | `highCourtPath.counterAffidavit` |
| 6 | **Rejoinder** | ✅ clickable | `highCourtPath.rejoinder` |
| 7 | **Plea Close** | ✅ clickable | `highCourtPath.pleaClose` |
| 8 | **Inducement / Judgment** (case ends) | ✅ clickable | `highCourtPath.inducement` |

All 7 steps are edit the list at [`CaseWorkflowGraph.tsx:426`](components/shared/CaseWorkflowGraph.tsx#L426) — change a label or reorder there.

✍️ CHANGE:


---

## Case Status (overall state — separate from steps)

Set via the **"Mark as Disposed / Completed"** button. Location: [`models/Case.ts:3`](models/Case.ts#L3).

- **Pending** — being heard
- **Disposal** — disposed by court (stamps `disposedAt`)
- **Withdrawn** — withdrawn by party
- _(legacy: Open, Closed, Escalated, Dismissed)_

✍️ CHANGE:


---

# PART 2 — ALL CASE TYPES (and which flow each uses)

> To move a type to a different flow, change its `path` in [`lib/case-types.ts`](lib/case-types.ts).
> 🔴 = criminal flow · 🔵 = high court flow

### 1. Criminal — Subordinate Court
🔴 FIR · GR · ST (Sessions Trial) · SC (Sessions Case) · CC (Calendar Case) · STC (Summons Trial) · CR.MISC · CR.COMP · BA (Bail) · ABA (Anticipatory Bail) · DV (Domestic Violence) · MAINT (Maintenance §125)

### 2. Special Act Cases
🔴 POCSO · SCST · NDPS · NI.138 (Cheque Bounce) · JJ (Juvenile) · PMLA · UAPA · ARMS · EXCISE · ELE.OFF

### 3. Civil — Subordinate Court
🔵 OS (Original Suit) · TS (Title) · MS (Money) · PS (Partition) · RCP (Rent/Eviction) · SP (Specific Perf.) · DEC (Declaratory) · INJ (Injunction) · PROB (Probate) · SUCC (Succession) · EP (Execution) · ARB (Arbitration)

### 4. Family Court
🔵 MAT.CASE · HMA (Divorce) · MA (Marriage Act) · RFCR · GUARD (Custody) · CMA · MWPA · SMA · ADOPT
🔴 FC.MAINT (Maintenance — Family Court) ← _note: this one uses the criminal flow_

### 5. Motor Accident & Consumer
🔵 MACT · MAC.APP · CC.CONS (Consumer) · INS.CL (Insurance)

### 6. Labour & Industrial
🔵 ID · WC · LCA · PAY.WG · ESI

### 7. Revenue & Land
🔵 MUT (Mutation) · LR (Land Records) · TEN (Tenancy) · CEIL (Ceiling) · ACQ (Acquisition)

### 8. High Court — Writ & Appeals
🔵 WP(C) · PIL · CWJC · CA · Civil.Rev · LPA · TRP · ContemptC · MA · MJC · FA · SA
🔴 WP(Crl) · Crl.A · Crl.Rev · Crl.Misc · Quash (§482)
_(note: WP(Crl) currently uses the high court flow — confirm if it should)_

### 9. Supreme Court & Tribunals
🔵 SLP(C) · SLP(Crl) · WP(SC) · ITAT · NCLT · CAT · NGT · DRT

### 10. Other
🔵 OTHER (describe in case title)

✍️ CHANGE (which types should switch flows?):


---

# PART 3 — DOCUMENT UPLOAD CATEGORIES

Uploading a document can auto-advance a step. From [`components/shared/CaseDocsUpload.tsx:13`](components/shared/CaseDocsUpload.tsx#L13).

**Criminal:** general · fir _(auto-marks FIR Filed)_ · cognizance · charge _(auto-marks Charges Framed)_ · evidence · forensic
**High Court:** general · petitionfiled · supportingaffidavit · admission · counteraffidavit · rejoinder · pleaclose · inducement

✍️ CHANGE:


---

# QUICK "WHERE TO CHANGE WHAT" CHEAT SHEET

| I want to… | Go to |
|------------|-------|
| Rename a case type / add a new type | [`lib/case-types.ts`](lib/case-types.ts) |
| Switch a type to the other flow | change its `path` in [`lib/case-types.ts`](lib/case-types.ts) |
| Rename / reorder a **criminal** step | [`components/shared/CaseWorkflowGraph.tsx:248`](components/shared/CaseWorkflowGraph.tsx#L248) onward |
| Rename / reorder a **bail** step | [`CaseWorkflowGraph.tsx:151`](components/shared/CaseWorkflowGraph.tsx#L151) onward |
| Rename / reorder a **high court** step | [`CaseWorkflowGraph.tsx:426`](components/shared/CaseWorkflowGraph.tsx#L426) (the `steps` list) |
| Change overall statuses (Pending/Disposal/Withdrawn) | [`models/Case.ts:3`](models/Case.ts#L3) |
| Change document categories | [`components/shared/CaseDocsUpload.tsx:13`](components/shared/CaseDocsUpload.tsx#L13) |
| Change court types (Supreme/HC/District) | [`lib/courts.ts`](lib/courts.ts) |
