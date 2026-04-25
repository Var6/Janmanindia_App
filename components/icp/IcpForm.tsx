"use client";

import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type IcpDoc = Record<string, any> & { _id?: string; _draft?: boolean; case: string };

interface Props {
  caseId: string;
  /** SW / director / superadmin can edit. Everyone else gets a read-only printable view. */
  canEdit: boolean;
}

const SECTION_BORDER = { borderColor: "var(--border)" };
const SECTION_BG = { background: "var(--surface)" };

export default function IcpForm({ caseId, canEdit }: Props) {
  const [icp, setIcp] = useState<IcpDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/icps?caseId=${caseId}`);
      const data = await res.json();
      if (res.ok) setIcp(data.icp);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  function set<K extends keyof IcpDoc>(key: K, value: IcpDoc[K]) {
    setIcp(prev => prev ? { ...prev, [key]: value } : prev);
  }
  function setNested(path: string[], value: unknown) {
    setIcp(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...(cur[path[i]] ?? {}) };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  async function save(opts: { complete?: boolean } = {}) {
    if (!icp) return;
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = { ...icp, case: caseId };
      if (opts.complete) body.status = "complete";
      const res = await fetch("/api/icps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setIcp({ ...data.icp });
      setSavedAt(new Date());
    } finally { setSaving(false); }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  if (loading) return <p className="text-sm text-(--muted)">Loading individual care plan…</p>;
  if (!icp) return <p className="text-sm text-(--muted)">No ICP available.</p>;

  const ro = !canEdit;

  return (
    <div className="icp-form space-y-6">
      {/* Print stylesheet — when the user clicks print, hide everything outside .icp-print-root */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          /* Hide app chrome */
          aside, nav, header, .icp-controls,
          [class*="topbar"], [class*="TopBar"],
          [class*="sidebar"], [class*="SidebarNav"],
          .no-print { display: none !important; }
          .icp-form { color: #000 !important; }
          .icp-section { page-break-inside: avoid; border-color: #ccc !important; box-shadow: none !important; background: #fff !important; }
          .icp-section input, .icp-section textarea, .icp-section select {
            border-color: #ccc !important; background: #fff !important; color: #000 !important;
          }
          .icp-section h2, .icp-section h3, .icp-section label, .icp-section p { color: #000 !important; }
        }
      `}</style>

      {/* Top controls — hidden in print */}
      <div className="icp-controls flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
            Individual Care Plan
          </p>
          <p className="text-xs text-(--muted) mt-1">
            {icp._draft ? "Draft (not yet saved)" : `Status: ${icp.status ?? "draft"}`}
            {savedAt && ` · saved ${savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            🖨 Print / Save as PDF
          </button>
          {canEdit && (
            <>
              <button type="button" onClick={() => save()} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button type="button" onClick={() => save({ complete: true })} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--success)", color: "#fff" }}>
                Mark Complete
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}

      {/* Header — Interviewer + date */}
      <Section title="Interviewer">
        <Grid cols={2}>
          <Field label="Interviewer">
            <Read>{(icp.interviewer && typeof icp.interviewer === "object" && "name" in icp.interviewer) ? (icp.interviewer as { name?: string }).name : "—"}</Read>
          </Field>
          <Field label="Date of interview">
            <DateInput value={icp.interviewDate} onChange={v => set("interviewDate", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Basic info */}
      <Section title="Basic information about the beneficiary">
        <Grid cols={2}>
          <Field label="Beneficiary name"><TextInput value={icp.beneficiaryName} onChange={v => set("beneficiaryName", v)} ro={ro} /></Field>
          <Field label="Phone number"><TextInput value={icp.phone} onChange={v => set("phone", v)} ro={ro} /></Field>
          <Field label="Address" full><TextInput value={icp.address} onChange={v => set("address", v)} ro={ro} /></Field>
          <Field label="Village"><TextInput value={icp.village} onChange={v => set("village", v)} ro={ro} /></Field>
          <Field label="Block / Taluka"><TextInput value={icp.blockTaluka} onChange={v => set("blockTaluka", v)} ro={ro} /></Field>
          <Field label="Father / Husband"><TextInput value={icp.fatherOrHusbandName} onChange={v => set("fatherOrHusbandName", v)} ro={ro} /></Field>
          <Field label="Mother"><TextInput value={icp.motherName} onChange={v => set("motherName", v)} ro={ro} /></Field>
          <Field label="Gender">
            <Select value={icp.gender} onChange={v => set("gender", v)} ro={ro}
              options={[["", "—"], ["female", "Female"], ["male", "Male"], ["other", "Other"]]} />
          </Field>
          <Field label="Age (years)"><NumberInput value={icp.ageYears} onChange={v => set("ageYears", v)} ro={ro} /></Field>
          <Field label="Date of birth"><DateInput value={icp.dob} onChange={v => set("dob", v)} ro={ro} /></Field>
          <Field label="DOB verified"><BoolToggle value={icp.dobVerified} onChange={v => set("dobVerified", v)} ro={ro} /></Field>
          <Field label="Religion">
            <Select value={icp.religion} onChange={v => set("religion", v)} ro={ro}
              options={[["", "—"], ["hindu", "Hindu"], ["muslim", "Muslim"], ["christian", "Christian"], ["sikh", "Sikh"], ["buddhist", "Buddhist"], ["jain", "Jain"], ["other", "Other"]]} />
          </Field>
          <Field label="Caste category">
            <Select value={icp.casteCategory} onChange={v => set("casteCategory", v)} ro={ro}
              options={[["", "—"], ["SC", "SC"], ["ST", "ST"], ["OBC", "OBC"], ["GEN", "GEN"]]} />
          </Field>
          <Field label="Caste name"><TextInput value={icp.casteName} onChange={v => set("casteName", v)} ro={ro} /></Field>
          <Field label="Tribe name (if ST)"><TextInput value={icp.tribeName} onChange={v => set("tribeName", v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Victim details */}
      <Section title="Victim / survivor details">
        <Grid cols={2}>
          <Field label="Currently staying with">
            <TextInput value={icp.currentLocation} placeholder="Parents / siblings / relatives / other"
              onChange={v => set("currentLocation", v)} ro={ro} />
          </Field>
          <Field label="Notes" full><TextArea value={icp.currentLocationNotes} onChange={v => set("currentLocationNotes", v)} ro={ro} /></Field>

          <Field label="In school"><BoolToggle value={icp.schooling?.inSchool} onChange={v => setNested(["schooling", "inSchool"], v)} ro={ro} /></Field>
          {icp.schooling?.inSchool ? (
            <Field label="Current class"><TextInput value={icp.schooling?.currentClass} onChange={v => setNested(["schooling", "currentClass"], v)} ro={ro} /></Field>
          ) : (
            <Field label="Last class finished"><TextInput value={icp.schooling?.lastClassFinished} onChange={v => setNested(["schooling", "lastClassFinished"], v)} ro={ro} /></Field>
          )}

          <Field label="Has special needs"><BoolToggle value={icp.specialNeeds?.has} onChange={v => setNested(["specialNeeds", "has"], v)} ro={ro} /></Field>
          {icp.specialNeeds?.has && (
            <>
              <Field label="Mental"><TextInput value={icp.specialNeeds?.mental} onChange={v => setNested(["specialNeeds", "mental"], v)} ro={ro} /></Field>
              <Field label="Physical"><TextInput value={icp.specialNeeds?.physical} onChange={v => setNested(["specialNeeds", "physical"], v)} ro={ro} /></Field>
              <Field label="Emotional"><TextInput value={icp.specialNeeds?.emotional} onChange={v => setNested(["specialNeeds", "emotional"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label="Substance use"><BoolToggle value={icp.substanceUse?.uses} onChange={v => setNested(["substanceUse", "uses"], v)} ro={ro} /></Field>
          {icp.substanceUse?.uses && (
            <>
              <Field label="Alcohol"><BoolToggle value={icp.substanceUse?.alcohol} onChange={v => setNested(["substanceUse", "alcohol"], v)} ro={ro} /></Field>
              <Field label="Tobacco (bidi/gutka)"><TextInput value={icp.substanceUse?.tobacco} onChange={v => setNested(["substanceUse", "tobacco"], v)} ro={ro} /></Field>
              <Field label="Drugs"><BoolToggle value={icp.substanceUse?.drugs} onChange={v => setNested(["substanceUse", "drugs"], v)} ro={ro} /></Field>
              <Field label="Frequency / details" full><TextArea value={icp.substanceUse?.details} onChange={v => setNested(["substanceUse", "details"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label="Professional skills" full>
            <TextInput value={Array.isArray(icp.professionalSkills) ? icp.professionalSkills.join(", ") : ""}
              onChange={v => set("professionalSkills", String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
              placeholder="Plumbing, auto driving, mechanic, tailoring, construction…" ro={ro} />
          </Field>

          <Field label="Appearance / behaviour observed" full>
            <TextInput value={Array.isArray(icp.appearance) ? icp.appearance.join(", ") : ""}
              onChange={v => set("appearance", String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
              placeholder="Shy, confident, unhappy, ferocious, disobedient…" ro={ro} />
          </Field>
          <Field label="Detailed observations during interaction" full>
            <TextArea value={icp.appearanceNotes} onChange={v => set("appearanceNotes", v)} ro={ro} />
          </Field>

          <Field label="Linked with criminal networks"><BoolToggle value={icp.criminalNetwork?.linked} onChange={v => setNested(["criminalNetwork", "linked"], v)} ro={ro} /></Field>
          {icp.criminalNetwork?.linked && (
            <Field label="Details" full><TextArea value={icp.criminalNetwork?.details} onChange={v => setNested(["criminalNetwork", "details"], v)} ro={ro} /></Field>
          )}

          <Field label="Meals per day"><NumberInput value={icp.nutrition?.mealsPerDay} onChange={v => setNested(["nutrition", "mealsPerDay"], v)} ro={ro} /></Field>
          <Field label="Typical meal ingredients" full>
            <TextInput value={icp.nutrition?.ingredients} placeholder="Dal, rice, vegetables, poultry, meat" onChange={v => setNested(["nutrition", "ingredients"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Abuse history */}
      <Section title="Symptoms or history of abuse">
        <Grid cols={3}>
          <CheckRow label="Clingy" value={icp.abuseHistory?.clingy} onChange={v => setNested(["abuseHistory", "clingy"], v)} ro={ro} />
          <CheckRow label="Fear of physical spaces" value={icp.abuseHistory?.fearOfSpaces} onChange={v => setNested(["abuseHistory", "fearOfSpaces"], v)} ro={ro} />
          <CheckRow label="Fear of people" value={icp.abuseHistory?.fearOfPeople} onChange={v => setNested(["abuseHistory", "fearOfPeople"], v)} ro={ro} />
          <CheckRow label="Unexplained bruises" value={icp.abuseHistory?.unexplainedBruises} onChange={v => setNested(["abuseHistory", "unexplainedBruises"], v)} ro={ro} />
          <CheckRow label="Soreness on the body" value={icp.abuseHistory?.soreness} onChange={v => setNested(["abuseHistory", "soreness"], v)} ro={ro} />
          <CheckRow label="Doesn't respond" value={icp.abuseHistory?.nonResponsive} onChange={v => setNested(["abuseHistory", "nonResponsive"], v)} ro={ro} />
          <CheckRow label="In trauma" value={icp.abuseHistory?.inTrauma} onChange={v => setNested(["abuseHistory", "inTrauma"], v)} ro={ro} />
          <CheckRow label="No symptoms / history" value={icp.abuseHistory?.none} onChange={v => setNested(["abuseHistory", "none"], v)} ro={ro} />
        </Grid>
        <Field label="Other symptoms" full><TextInput value={icp.abuseHistory?.other} onChange={v => setNested(["abuseHistory", "other"], v)} ro={ro} /></Field>
        <Field label="Detailed explanation" full><TextArea value={icp.abuseHistory?.details} onChange={v => setNested(["abuseHistory", "details"], v)} ro={ro} /></Field>
      </Section>

      {/* Medical */}
      <Section title="Medical intervention">
        <Field label="Needs medical attention"><BoolToggle value={icp.medicalIntervention?.needs} onChange={v => setNested(["medicalIntervention", "needs"], v)} ro={ro} /></Field>
        {icp.medicalIntervention?.needs && (
          <>
            <Grid cols={3}>
              <CheckRow label="Skin disease" value={icp.medicalIntervention?.skin} onChange={v => setNested(["medicalIntervention", "skin"], v)} ro={ro} />
              <CheckRow label="Dental / gum" value={icp.medicalIntervention?.dental} onChange={v => setNested(["medicalIntervention", "dental"], v)} ro={ro} />
              <CheckRow label="Heart" value={icp.medicalIntervention?.heart} onChange={v => setNested(["medicalIntervention", "heart"], v)} ro={ro} />
              <CheckRow label="Respiratory" value={icp.medicalIntervention?.respiratory} onChange={v => setNested(["medicalIntervention", "respiratory"], v)} ro={ro} />
              <CheckRow label="Abdomen" value={icp.medicalIntervention?.abdomen} onChange={v => setNested(["medicalIntervention", "abdomen"], v)} ro={ro} />
            </Grid>
            <Grid cols={2}>
              <Field label="Other" full><TextInput value={icp.medicalIntervention?.other} onChange={v => setNested(["medicalIntervention", "other"], v)} ro={ro} /></Field>
              <Field label="Work-related injury"><TextInput value={icp.medicalIntervention?.workInjury} onChange={v => setNested(["medicalIntervention", "workInjury"], v)} ro={ro} /></Field>
              <Field label="Non-work injury"><TextInput value={icp.medicalIntervention?.nonWorkInjury} onChange={v => setNested(["medicalIntervention", "nonWorkInjury"], v)} ro={ro} /></Field>
            </Grid>
          </>
        )}
      </Section>

      {/* Hygiene */}
      <Section title="Personal hygiene & sanitation">
        <Grid cols={2}>
          <Field label="Nails clean"><BoolToggle value={icp.hygiene?.nailsClean} onChange={v => setNested(["hygiene", "nailsClean"], v)} ro={ro} /></Field>
          <Field label="Family has personal sanitation"><BoolToggle value={icp.hygiene?.sanitationFacility} onChange={v => setNested(["hygiene", "sanitationFacility"], v)} ro={ro} /></Field>
          <Field label="Other hygiene issues" full><TextInput value={icp.hygiene?.otherIssues} onChange={v => setNested(["hygiene", "otherIssues"], v)} ro={ro} /></Field>
          <Field label="Observations on cleanliness, cooking area, water storage" full>
            <TextArea value={icp.hygiene?.observations} onChange={v => setNested(["hygiene", "observations"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Missing person */}
      <Section title="Missing person case">
        <Grid cols={2}>
          <Field label="Case filed"><BoolToggle value={icp.missingPersonCase?.filed} onChange={v => setNested(["missingPersonCase", "filed"], v)} ro={ro} /></Field>
          {icp.missingPersonCase?.filed ? (
            <>
              <Field label="Filed where"><TextInput value={icp.missingPersonCase?.filedWhere} onChange={v => setNested(["missingPersonCase", "filedWhere"], v)} ro={ro} /></Field>
              <Field label="Filed by (name & relationship)" full><TextInput value={icp.missingPersonCase?.filedBy} onChange={v => setNested(["missingPersonCase", "filedBy"], v)} ro={ro} /></Field>
            </>
          ) : (
            <>
              <Field label="Willing to file"><BoolToggle value={icp.missingPersonCase?.willingToFile} onChange={v => setNested(["missingPersonCase", "willingToFile"], v)} ro={ro} /></Field>
              <Field label="Complaint against (trafficker / handler)" full><TextInput value={icp.missingPersonCase?.complaintAgainst} onChange={v => setNested(["missingPersonCase", "complaintAgainst"], v)} ro={ro} /></Field>
            </>
          )}
        </Grid>
      </Section>

      {/* Victim livelihood */}
      <Section title="Victim livelihood">
        <Grid cols={2}>
          <Field label="Skills" full><TextArea value={icp.victimSkills} onChange={v => set("victimSkills", v)} ro={ro} /></Field>
          <Field label="Current occupation"><TextInput value={icp.victimCurrentOccupation} onChange={v => set("victimCurrentOccupation", v)} ro={ro} /></Field>
          <Field label="Current monthly earning (₹)"><NumberInput value={icp.victimCurrentEarning} onChange={v => set("victimCurrentEarning", v)} ro={ro} /></Field>
          <Field label="Aspirations / interests" full><TextArea value={icp.victimAspirations} onChange={v => set("victimAspirations", v)} ro={ro} /></Field>
          <Field label="Assessment" full><TextArea value={icp.victimAssessment} onChange={v => set("victimAssessment", v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Family members */}
      <Section title="Family members (excluding the beneficiary)">
        <FamilyMembers value={icp.familyMembers ?? []} onChange={v => set("familyMembers", v)} ro={ro} />
      </Section>

      {/* Family circumstances */}
      <Section title="Family circumstances">
        <Field label="Primary breadwinner notes" full>
          <TextInput value={icp.primaryBreadwinnerNotes} placeholder="Which is the main occupation of the family?" onChange={v => set("primaryBreadwinnerNotes", v)} ro={ro} />
        </Field>
        <Grid cols={2}>
          <Field label="Widow in family"><BoolToggle value={icp.widow?.present} onChange={v => setNested(["widow", "present"], v)} ro={ro} /></Field>
          {icp.widow?.present && (
            <>
              <Field label="Receiving widow pension"><BoolToggle value={icp.widow?.receivesPension} onChange={v => setNested(["widow", "receivesPension"], v)} ro={ro} /></Field>
              <Field label="Pension amount (₹)"><NumberInput value={icp.widow?.pensionAmount} onChange={v => setNested(["widow", "pensionAmount"], v)} ro={ro} /></Field>
              <Field label="Frequency"><TextInput value={icp.widow?.pensionFrequency} placeholder="e.g. monthly" onChange={v => setNested(["widow", "pensionFrequency"], v)} ro={ro} /></Field>
              <Field label="If no, intervention needed" full><TextArea value={icp.widow?.interventionNeeded} onChange={v => setNested(["widow", "interventionNeeded"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label="Addiction in family"><BoolToggle value={icp.familyAddiction?.present} onChange={v => setNested(["familyAddiction", "present"], v)} ro={ro} /></Field>
          {icp.familyAddiction?.present && (
            <Field label="Details (relationship + substance)" full><TextArea value={icp.familyAddiction?.details} onChange={v => setNested(["familyAddiction", "details"], v)} ro={ro} /></Field>
          )}

          <Field label="Health issues in family"><BoolToggle value={icp.familyHealth?.present} onChange={v => setNested(["familyHealth", "present"], v)} ro={ro} /></Field>
          {icp.familyHealth?.present && (
            <>
              <Field label="Relationship"><TextInput value={icp.familyHealth?.relationship} onChange={v => setNested(["familyHealth", "relationship"], v)} ro={ro} /></Field>
              <Field label="Symptoms" full><TextInput value={icp.familyHealth?.symptoms} onChange={v => setNested(["familyHealth", "symptoms"], v)} ro={ro} /></Field>
              <Field label="Duration"><TextInput value={icp.familyHealth?.durationDescription} onChange={v => setNested(["familyHealth", "durationDescription"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label="Special-needs members in family"><BoolToggle value={icp.familySpecialNeeds?.present} onChange={v => setNested(["familySpecialNeeds", "present"], v)} ro={ro} /></Field>
          {icp.familySpecialNeeds?.present && (
            <Field label="Description" full><TextArea value={icp.familySpecialNeeds?.description} onChange={v => setNested(["familySpecialNeeds", "description"], v)} ro={ro} /></Field>
          )}

          <Field label="Recent shocks in last year"><BoolToggle value={icp.recentShocks?.occurred} onChange={v => setNested(["recentShocks", "occurred"], v)} ro={ro} /></Field>
          {icp.recentShocks?.occurred && (
            <>
              <Field label="Description (illness, death, theft, indebtedness, dispute…)" full>
                <TextArea value={icp.recentShocks?.description} onChange={v => setNested(["recentShocks", "description"], v)} ro={ro} />
              </Field>
              <Field label="Loan taken"><BoolToggle value={icp.recentShocks?.loanTaken} onChange={v => setNested(["recentShocks", "loanTaken"], v)} ro={ro} /></Field>
              <Field label="Loan amount (₹)"><NumberInput value={icp.recentShocks?.loanAmount} onChange={v => setNested(["recentShocks", "loanAmount"], v)} ro={ro} /></Field>
              <Field label="Impact on family finances" full><TextArea value={icp.recentShocks?.impact} onChange={v => setNested(["recentShocks", "impact"], v)} ro={ro} /></Field>
            </>
          )}
        </Grid>
      </Section>

      {/* Bank + credit + land + livelihood */}
      <Section title="Bank, credit, land & livelihood resources">
        <Grid cols={2}>
          <Field label="Has savings account"><BoolToggle value={icp.bankAccount?.hasOne} onChange={v => setNested(["bankAccount", "hasOne"], v)} ro={ro} /></Field>
          <Field label="Bank name"><TextInput value={icp.bankAccount?.bankName} onChange={v => setNested(["bankAccount", "bankName"], v)} ro={ro} /></Field>
          <Field label="Account number" full><TextInput value={icp.bankAccount?.accountNumber} onChange={v => setNested(["bankAccount", "accountNumber"], v)} ro={ro} /></Field>

          <Field label="Credit type">
            <Select value={icp.credit?.type} onChange={v => setNested(["credit", "type"], v)} ro={ro}
              options={[["", "—"], ["formal", "Formal"], ["informal", "Informal"], ["none", "None"]]} />
          </Field>
          <Field label="Lender"><TextInput value={icp.credit?.lender} onChange={v => setNested(["credit", "lender"], v)} ro={ro} /></Field>
          <Field label="Amount taken (₹)"><NumberInput value={icp.credit?.amount} onChange={v => setNested(["credit", "amount"], v)} ro={ro} /></Field>
          <Field label="Interest rate"><TextInput value={icp.credit?.interestRate} onChange={v => setNested(["credit", "interestRate"], v)} ro={ro} /></Field>
          <Field label="Amount repaid (₹)"><NumberInput value={icp.credit?.repaid} onChange={v => setNested(["credit", "repaid"], v)} ro={ro} /></Field>
          <Field label="Repayment method"><TextInput value={icp.credit?.repaymentMethod} onChange={v => setNested(["credit", "repaymentMethod"], v)} ro={ro} /></Field>
          <Field label="Credit assessment" full><TextArea value={icp.credit?.assessment} onChange={v => setNested(["credit", "assessment"], v)} ro={ro} /></Field>

          <Field label="Owns land"><BoolToggle value={icp.land?.ownsLand} onChange={v => setNested(["land", "ownsLand"], v)} ro={ro} /></Field>
          {icp.land?.ownsLand && (
            <>
              <Field label="Size (acres)"><NumberInput value={icp.land?.sizeAcres} onChange={v => setNested(["land", "sizeAcres"], v)} ro={ro} /></Field>
              <Field label="Current usage" full><TextInput value={icp.land?.usage} onChange={v => setNested(["land", "usage"], v)} ro={ro} /></Field>
              <Field label="Scope for EC use"><BoolToggle value={icp.land?.ecScope} onChange={v => setNested(["land", "ecScope"], v)} ro={ro} /></Field>
              <Field label="EC scope notes" full><TextArea value={icp.land?.ecScopeNotes} onChange={v => setNested(["land", "ecScopeNotes"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label="Livestock" full><TextInput value={icp.livelihoodResources?.livestock} placeholder="Poultry, goat, cow…" onChange={v => setNested(["livelihoodResources", "livestock"], v)} ro={ro} /></Field>
          <Field label="Skills" full><TextInput value={icp.livelihoodResources?.skills} placeholder="Tailoring, weaving, basket making…" onChange={v => setNested(["livelihoodResources", "skills"], v)} ro={ro} /></Field>
          <Field label="Natural resources"><TextInput value={icp.livelihoodResources?.naturalResources} placeholder="Bamboo, clay, river…" onChange={v => setNested(["livelihoodResources", "naturalResources"], v)} ro={ro} /></Field>
          <Field label="Vocational training completed" full><TextInput value={icp.livelihoodResources?.vocationalTraining} placeholder="Retail, hospitality, IT, automobile, electrician, welding, tailoring…" onChange={v => setNested(["livelihoodResources", "vocationalTraining"], v)} ro={ro} /></Field>
          <Field label="Nearby industry"><TextInput value={icp.livelihoodResources?.nearbyIndustry} onChange={v => setNested(["livelihoodResources", "nearbyIndustry"], v)} ro={ro} /></Field>
          <Field label="Distance to factory (km)"><NumberInput value={icp.livelihoodResources?.industryDistanceKm} onChange={v => setNested(["livelihoodResources", "industryDistanceKm"], v)} ro={ro} /></Field>
          <Field label="Industry notes / fit" full><TextArea value={icp.livelihoodResources?.industryNotes} onChange={v => setNested(["livelihoodResources", "industryNotes"], v)} ro={ro} /></Field>
          <Field label="Upcoming construction / industry" full><TextInput value={icp.livelihoodResources?.upcomingConstruction} onChange={v => setNested(["livelihoodResources", "upcomingConstruction"], v)} ro={ro} /></Field>

          <Field label="Membership of support systems" full>
            <TextInput value={icp.supportMembership} placeholder="SHG, CBO, NGO, Mahila Mandal, credit/saving group, caste association, Panchayat…" onChange={v => set("supportMembership", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Migration */}
      <Section title="Migration">
        <Grid cols={2}>
          <Field label="Pattern">
            <Select value={icp.migration?.pattern} onChange={v => setNested(["migration", "pattern"], v)} ro={ro}
              options={[["", "—"], ["none", "None"], ["seasonal", "Seasonal"], ["permanent", "Permanent"]]} />
          </Field>
          <Field label="Months / season"><TextInput value={icp.migration?.seasonMonths} onChange={v => setNested(["migration", "seasonMonths"], v)} ro={ro} /></Field>
          <Field label="Destination"><TextInput value={icp.migration?.destination} onChange={v => setNested(["migration", "destination"], v)} ro={ro} /></Field>
          <Field label="Type of work"><TextInput value={icp.migration?.workType} onChange={v => setNested(["migration", "workType"], v)} ro={ro} /></Field>
          <Field label="Monthly earning (₹)"><NumberInput value={icp.migration?.monthlyEarning} onChange={v => setNested(["migration", "monthlyEarning"], v)} ro={ro} /></Field>
          <Field label="Who migrates"><TextInput value={icp.migration?.whoMigrates} onChange={v => setNested(["migration", "whoMigrates"], v)} ro={ro} /></Field>
          <Field label="Willing to migrate"><BoolToggle value={icp.migration?.willingToMigrate} onChange={v => setNested(["migration", "willingToMigrate"], v)} ro={ro} /></Field>
          <Field label="Within / outside state">
            <Select value={icp.migration?.willingState} onChange={v => setNested(["migration", "willingState"], v)} ro={ro}
              options={[["", "—"], ["within", "Within state"], ["outside", "Outside state"], ["either", "Either"]]} />
          </Field>
          <Field label="Migration assessment" full><TextArea value={icp.migration?.assessment} onChange={v => setNested(["migration", "assessment"], v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Counseling */}
      <Section title="Counseling requirements">
        <Grid cols={2}>
          <Field label="Health counseling"><BoolToggle value={icp.counseling?.health} onChange={v => setNested(["counseling", "health"], v)} ro={ro} /></Field>
          <Field label="Emotional counseling"><BoolToggle value={icp.counseling?.emotional} onChange={v => setNested(["counseling", "emotional"], v)} ro={ro} /></Field>
          <Field label="Why & what aspects" full>
            <TextArea value={icp.counseling?.observations} placeholder="Why you think the beneficiary or family needs counseling, and what signs you observed…"
              onChange={v => setNested(["counseling", "observations"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Government schemes */}
      <Section title="Government schemes & awareness">
        <Field label="Linkages needed (comma-separated)" full>
          <TextInput
            value={Array.isArray(icp.schemes?.needsLinkage) ? icp.schemes.needsLinkage.join(", ") : ""}
            placeholder="IAY, Mahadalit, BPL, MGNREGA, PDS, Disability Pension, CBO, Jeevika, Vikas Mitra, Panchayat, Rozgar Sevak, Shiksha Sevak, Abhiyan Basera, Abhiyan Dakhal Dahari…"
            onChange={v => setNested(["schemes", "needsLinkage"], String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
            ro={ro} />
        </Field>
        <Field label="Family is aware of (comma-separated)" full>
          <TextInput
            value={Array.isArray(icp.schemes?.awareness) ? icp.schemes.awareness.join(", ") : ""}
            placeholder="Mid Day Meal — Anganwadi, Mid Day Meal — Govt Schools, School Uniform, Free Books, Vocational Training for illiterates, Family planning methods, School management committee, Life insurance, Health insurance…"
            onChange={v => setNested(["schemes", "awareness"], String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
            ro={ro} />
        </Field>
        <Field label="Effectiveness of Govt bodies (Panchayat, CBO, Vikas Mitra…)" full>
          <TextArea value={icp.schemes?.govtBodyEffectiveness} onChange={v => setNested(["schemes", "govtBodyEffectiveness"], v)} ro={ro} />
        </Field>
        <Field label="Schemes assessment" full>
          <TextArea value={icp.schemes?.assessment} onChange={v => setNested(["schemes", "assessment"], v)} ro={ro} />
        </Field>
      </Section>

      {/* Community context */}
      <Section title="Community context">
        <Grid cols={2}>
          <Field label="Drought in last 5 years"><BoolToggle value={icp.community_context?.droughtLastFiveYears} onChange={v => setNested(["community_context", "droughtLastFiveYears"], v)} ro={ro} /></Field>
          <Field label="Flood in last 5 years"><BoolToggle value={icp.community_context?.floodLastFiveYears} onChange={v => setNested(["community_context", "floodLastFiveYears"], v)} ro={ro} /></Field>
        </Grid>
        <Grid cols={3}>
          <CheckRow label="Newspaper" value={icp.community_context?.access?.newspaper} onChange={v => setNested(["community_context", "access", "newspaper"], v)} ro={ro} />
          <CheckRow label="TV" value={icp.community_context?.access?.tv} onChange={v => setNested(["community_context", "access", "tv"], v)} ro={ro} />
          <CheckRow label="Mobile phones" value={icp.community_context?.access?.mobile} onChange={v => setNested(["community_context", "access", "mobile"], v)} ro={ro} />
          <CheckRow label="Radio" value={icp.community_context?.access?.radio} onChange={v => setNested(["community_context", "access", "radio"], v)} ro={ro} />
          <CheckRow label="Safe drinking water" value={icp.community_context?.access?.safeWater} onChange={v => setNested(["community_context", "access", "safeWater"], v)} ro={ro} />
          <CheckRow label="Electricity" value={icp.community_context?.access?.electricity} onChange={v => setNested(["community_context", "access", "electricity"], v)} ro={ro} />
          <CheckRow label="Sanitation" value={icp.community_context?.access?.sanitation} onChange={v => setNested(["community_context", "access", "sanitation"], v)} ro={ro} />
          <CheckRow label="Police station" value={icp.community_context?.access?.policeStation} onChange={v => setNested(["community_context", "access", "policeStation"], v)} ro={ro} />
          <CheckRow label="Ration shop" value={icp.community_context?.access?.rationShop} onChange={v => setNested(["community_context", "access", "rationShop"], v)} ro={ro} />
          <CheckRow label="Community hall" value={icp.community_context?.access?.communityHall} onChange={v => setNested(["community_context", "access", "communityHall"], v)} ro={ro} />
          <CheckRow label="Community land" value={icp.community_context?.access?.communityLand} onChange={v => setNested(["community_context", "access", "communityLand"], v)} ro={ro} />
          <CheckRow label="Post office" value={icp.community_context?.access?.postOffice} onChange={v => setNested(["community_context", "access", "postOffice"], v)} ro={ro} />
          <CheckRow label="Road transport" value={icp.community_context?.access?.roadTransport} onChange={v => setNested(["community_context", "access", "roadTransport"], v)} ro={ro} />
          <CheckRow label="ICDS" value={icp.community_context?.access?.icds} onChange={v => setNested(["community_context", "access", "icds"], v)} ro={ro} />
        </Grid>
        <Grid cols={3}>
          <Field label="School distance (km)"><NumberInput value={icp.community_context?.access?.schoolDistanceKm} onChange={v => setNested(["community_context", "access", "schoolDistanceKm"], v)} ro={ro} /></Field>
          <Field label="Market distance (km)"><NumberInput value={icp.community_context?.access?.marketDistanceKm} onChange={v => setNested(["community_context", "access", "marketDistanceKm"], v)} ro={ro} /></Field>
          <Field label="Health centre distance (km)"><NumberInput value={icp.community_context?.access?.healthCentreDistanceKm} onChange={v => setNested(["community_context", "access", "healthCentreDistanceKm"], v)} ro={ro} /></Field>
          <Field label="Bank(s) in proximity" full><TextInput value={icp.community_context?.access?.bank} onChange={v => setNested(["community_context", "access", "bank"], v)} ro={ro} /></Field>
        </Grid>

        <p className="text-xs font-semibold text-(--text) mt-4 mb-2">Children leaving the village for work</p>
        <Grid cols={3}>
          <Field label="Below 14"><NumberInput value={icp.community_context?.childrenLeftForWork?.below14} onChange={v => setNested(["community_context", "childrenLeftForWork", "below14"], v)} ro={ro} /></Field>
          <Field label="15 – 17"><NumberInput value={icp.community_context?.childrenLeftForWork?.age15to17} onChange={v => setNested(["community_context", "childrenLeftForWork", "age15to17"], v)} ro={ro} /></Field>
          <Field label="18 +"><NumberInput value={icp.community_context?.childrenLeftForWork?.age18plus} onChange={v => setNested(["community_context", "childrenLeftForWork", "age18plus"], v)} ro={ro} /></Field>
          <Field label="Type of work" full><TextInput value={icp.community_context?.childrenLeftForWork?.workType} onChange={v => setNested(["community_context", "childrenLeftForWork", "workType"], v)} ro={ro} /></Field>
          <Field label="Go with"><TextInput value={icp.community_context?.childrenLeftForWork?.goWith} onChange={v => setNested(["community_context", "childrenLeftForWork", "goWith"], v)} ro={ro} /></Field>
          <Field label="Approx earning (₹)"><NumberInput value={icp.community_context?.childrenLeftForWork?.earning} onChange={v => setNested(["community_context", "childrenLeftForWork", "earning"], v)} ro={ro} /></Field>
          <Field label="Destinations" full><TextInput value={icp.community_context?.childrenLeftForWork?.destinations} onChange={v => setNested(["community_context", "childrenLeftForWork", "destinations"], v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Identity cards */}
      <Section title="Identity cards & compensation">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-semibold text-(--muted)">Document</th>
              <th className="py-2 pr-3 font-semibold text-(--muted)">Has it</th>
              <th className="py-2 pr-3 font-semibold text-(--muted)">Date of issue</th>
              <th className="py-2 font-semibold text-(--muted)">Notes / assessment</th>
            </tr>
          </thead>
          <tbody>
            {([
              ["birthCertificate", "Birth certificate"],
              ["schoolCertificate", "School certificate"],
              ["casteCertificate", "Caste certificate"],
              ["bplCard", "BPL card"],
              ["disabilityCertificate", "Disability certificate"],
              ["immunizationCard", "Immunization card"],
              ["rationCard", "Ration card"],
              ["aadhaarCard", "Aadhaar card"],
              ["govtCompensation", "Govt compensation received"],
            ] as const).map(([key, label]) => {
              const v = (icp.idCards ?? {})[key] ?? {};
              return (
                <tr key={key} className="border-t" style={SECTION_BORDER}>
                  <td className="py-2 pr-3 text-(--text)">{label}</td>
                  <td className="py-2 pr-3"><BoolToggle value={v.hasIt} onChange={x => setNested(["idCards", key, "hasIt"], x)} ro={ro} /></td>
                  <td className="py-2 pr-3"><DateInput value={v.issueDate} onChange={x => setNested(["idCards", key, "issueDate"], x)} ro={ro} /></td>
                  <td className="py-2"><TextInput value={v.notes} onChange={x => setNested(["idCards", key, "notes"], x)} ro={ro} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* Plans */}
      <Section title="Plans">
        <Grid cols={2}>
          <Field label="Short-term plan" full>
            <TextArea rows={5} value={icp.shortTermPlan} placeholder="Next 1–3 months: counselling, medical, shelter, school re-entry, etc."
              onChange={v => set("shortTermPlan", v)} ro={ro} />
          </Field>
          <Field label="Long-term plan" full>
            <TextArea rows={5} value={icp.longTermPlan} placeholder="6–24 months: livelihood, vocational training, school completion, family support, scheme linkages."
              onChange={v => set("longTermPlan", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {canEdit && (
        <div className="icp-controls flex items-center justify-end gap-2 pb-12">
          <button type="button" onClick={() => save()} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button type="button" onClick={() => save({ complete: true })} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--success)", color: "#fff" }}>
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

/* ── small atoms ──────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="icp-section rounded-2xl border p-5 space-y-3" style={{ ...SECTION_BG, ...SECTION_BORDER, boxShadow: "var(--shadow-sm)" }}>
      <h2 className="text-base font-bold text-(--text)">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  const cls = cols === 3 ? "grid-cols-1 sm:grid-cols-3" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  return <div className={`grid ${cls} gap-3`}>{children}</div>;
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs ${full ? "sm:col-span-full" : ""}`}>
      <span className="font-semibold text-(--text) block mb-1">{label}</span>
      {children}
    </label>
  );
}
function Read({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>{children}</p>;
}
function TextInput({ value, onChange, placeholder, ro }: { value?: string; onChange: (v?: string) => void; placeholder?: string; ro?: boolean }) {
  return (
    <input value={value ?? ""} onChange={e => onChange(e.target.value || undefined)}
      placeholder={placeholder} disabled={ro}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
  );
}
function TextArea({ value, onChange, placeholder, ro, rows = 3 }: { value?: string; onChange: (v?: string) => void; placeholder?: string; ro?: boolean; rows?: number }) {
  return (
    <textarea value={value ?? ""} onChange={e => onChange(e.target.value || undefined)}
      placeholder={placeholder} disabled={ro} rows={rows}
      className="w-full px-3 py-2 rounded-lg border text-sm resize-none disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
  );
}
function NumberInput({ value, onChange, ro }: { value?: number; onChange: (v?: number) => void; ro?: boolean }) {
  return (
    <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      disabled={ro}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
  );
}
function DateInput({ value, onChange, ro }: { value?: string | Date; onChange: (v?: string) => void; ro?: boolean }) {
  const v = value ? new Date(value as string | Date).toISOString().slice(0, 10) : "";
  return (
    <input type="date" value={v} onChange={e => onChange(e.target.value || undefined)} disabled={ro}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
  );
}
function Select({ value, onChange, options, ro }: { value?: string; onChange: (v?: string) => void; options: [string, string][]; ro?: boolean }) {
  return (
    <select value={value ?? ""} onChange={e => onChange(e.target.value || undefined)} disabled={ro}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
function BoolToggle({ value, onChange, ro }: { value?: boolean; onChange: (v: boolean) => void; ro?: boolean }) {
  return (
    <div className="flex gap-1 text-xs">
      {[["Yes", true], ["No", false]].map(([label, v]) => {
        const sel = value === v;
        return (
          <button key={String(v)} type="button" disabled={ro} onClick={() => onChange(v as boolean)}
            className="px-3 py-1.5 rounded-lg border font-medium transition-colors"
            style={{
              background: sel ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg)",
              borderColor: sel ? "var(--accent)" : "var(--border)",
              color: sel ? "var(--accent)" : "var(--text)",
              opacity: ro && !sel ? 0.5 : 1,
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
function CheckRow({ label, value, onChange, ro }: { label: string; value?: boolean; onChange: (v: boolean) => void; ro?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" disabled={ro} checked={!!value} onChange={e => onChange(e.target.checked)} />
      <span className="text-(--text)">{label}</span>
    </label>
  );
}

function FamilyMembers({ value, onChange, ro }: { value: any[]; onChange: (v: any[]) => void; ro?: boolean }) {
  function update(i: number, patch: Record<string, unknown>) {
    onChange(value.map((m, j) => j === i ? { ...m, ...patch } : m));
  }
  function remove(i: number) { onChange(value.filter((_, j) => j !== i)); }
  function add() { onChange([...value, {}]); }

  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-xs text-(--muted)">No family members added yet.</p>}
      {value.map((m, i) => (
        <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-(--text)">Member #{i + 1}{m.isPrimaryEarner ? " · primary earner" : ""}</p>
            {!ro && (
              <button type="button" onClick={() => remove(i)}
                className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>Remove</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TextInput value={m.name} onChange={v => update(i, { name: v })} placeholder="Name" ro={ro} />
            <NumberInput value={m.age} onChange={v => update(i, { age: v })} ro={ro} />
            <TextInput value={m.relationship} onChange={v => update(i, { relationship: v })} placeholder="Relationship" ro={ro} />
            <TextInput value={m.education} onChange={v => update(i, { education: v })} placeholder="Education till class" ro={ro} />
            <TextInput value={m.primaryOccupation} onChange={v => update(i, { primaryOccupation: v })} placeholder="Primary occupation" ro={ro} />
            <NumberInput value={m.primarySalaryPerMonth} onChange={v => update(i, { primarySalaryPerMonth: v })} ro={ro} />
            <TextInput value={m.otherIncomeSource} onChange={v => update(i, { otherIncomeSource: v })} placeholder="Other income source" ro={ro} />
            <NumberInput value={m.otherIncomePerMonth} onChange={v => update(i, { otherIncomePerMonth: v })} ro={ro} />
            <TextInput value={m.livelihoodSkills} onChange={v => update(i, { livelihoodSkills: v })} placeholder="Livelihood skills" ro={ro} />
            <TextArea value={m.aspirations} onChange={v => update(i, { aspirations: v })} placeholder="Aspirations / interests" ro={ro} />
          </div>
          {!ro && (
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={!!m.isPrimaryEarner} onChange={e => update(i, { isPrimaryEarner: e.target.checked })} />
              <span className="text-(--text)">Primary breadwinner</span>
            </label>
          )}
        </div>
      ))}
      {!ro && (
        <button type="button" onClick={add}
          className="w-full text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
          + Add family member
        </button>
      )}
    </div>
  );
}
