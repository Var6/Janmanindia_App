"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

/* eslint-disable @typescript-eslint/no-explicit-any */

type IcpDoc = Record<string, any> & { _id?: string; _draft?: boolean; case: string };

interface Props {
  caseId: string;
  /** SW / director / superadmin can edit. Everyone else gets a read-only downloadable view. */
  canEdit: boolean;
  /** Optional case metadata used in the generated PDF header + filename. */
  caseNumber?: string;
  caseTitle?: string;
}

const SECTION_BORDER = { borderColor: "var(--border)" };
const SECTION_BG = { background: "var(--surface)" };

export default function IcpForm({ caseId, canEdit, caseNumber, caseTitle }: Props) {
  const t = useT();
  const [icp, setIcp] = useState<IcpDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownloadPdf() {
    if (!icp || downloading) return;
    setDownloading(true); setError("");
    try {
      const [{ pdf }, { default: IcpPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./IcpPdfDocument"),
      ]);
      const blob = await pdf(<IcpPdfDocument icp={icp} caseNumber={caseNumber} caseTitle={caseTitle} />).toBlob();
      const safe = (s?: string) => (s ?? "").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
      const fname = `ICP_${safe(caseNumber) || safe(icp.beneficiaryName) || caseId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p className="text-sm text-(--muted)">{t("Loading individual care plan…")}</p>;
  if (!icp) return <p className="text-sm text-(--muted)">{t("No ICP available.")}</p>;

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
            {t("Individual Care Plan")}
          </p>
          <p className="text-xs text-(--muted) mt-1">
            {icp._draft ? t("Draft (not yet saved)") : `${t("Status:")} ${icp.status ?? "draft"}`}
            {savedAt && ` · ${t("saved")} ${savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handleDownloadPdf} disabled={downloading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            {downloading ? t("Building PDF…") : `⬇ ${t("Download PDF")}`}
          </button>
          {canEdit && (
            <>
              <button type="button" onClick={() => save()} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                {saving ? t("Saving…") : t("Save Draft")}
              </button>
              <button type="button" onClick={() => save({ complete: true })} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--success)", color: "#fff" }}>
                {t("Mark Complete")}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}

      {/* Header — Interviewer + date */}
      <Section title={t("Interviewer")}>
        <Grid cols={2}>
          <Field label={t("Interviewer")}>
            <Read>{(icp.interviewer && typeof icp.interviewer === "object" && "name" in icp.interviewer) ? (icp.interviewer as { name?: string }).name : "—"}</Read>
          </Field>
          <Field label={t("Date of interview")}>
            <DateInput value={icp.interviewDate} onChange={v => set("interviewDate", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Basic info */}
      <Section title={t("Basic information about the beneficiary")}>
        <Grid cols={2}>
          <Field label={t("Beneficiary name")}><TextInput value={icp.beneficiaryName} onChange={v => set("beneficiaryName", v)} ro={ro} /></Field>
          <Field label={t("Phone number")}><TextInput value={icp.phone} onChange={v => set("phone", v)} ro={ro} /></Field>
          <Field label={t("Address")} full><TextInput value={icp.address} onChange={v => set("address", v)} ro={ro} /></Field>
          <Field label={t("Village")}><TextInput value={icp.village} onChange={v => set("village", v)} ro={ro} /></Field>
          <Field label={t("Block / Taluka")}><TextInput value={icp.blockTaluka} onChange={v => set("blockTaluka", v)} ro={ro} /></Field>
          <Field label={t("Father / Husband")}><TextInput value={icp.fatherOrHusbandName} onChange={v => set("fatherOrHusbandName", v)} ro={ro} /></Field>
          <Field label={t("Mother")}><TextInput value={icp.motherName} onChange={v => set("motherName", v)} ro={ro} /></Field>
          <Field label={t("Gender")}>
            <Select value={icp.gender} onChange={v => set("gender", v)} ro={ro}
              options={[["", "—"], ["female", t("Female")], ["male", t("Male")], ["other", t("Other")]]} />
          </Field>
          <Field label={t("Age (years)")}><NumberInput value={icp.ageYears} onChange={v => set("ageYears", v)} ro={ro} /></Field>
          <Field label={t("Date of birth")}><DateInput value={icp.dob} onChange={v => set("dob", v)} ro={ro} /></Field>
          <Field label={t("DOB verified")}><BoolToggle value={icp.dobVerified} onChange={v => set("dobVerified", v)} ro={ro} /></Field>
          <Field label={t("Religion")}>
            <Select value={icp.religion} onChange={v => set("religion", v)} ro={ro}
              options={[["", "—"], ["hindu", t("Hindu")], ["muslim", t("Muslim")], ["christian", t("Christian")], ["sikh", t("Sikh")], ["buddhist", t("Buddhist")], ["jain", t("Jain")], ["other", t("Other")]]} />
          </Field>
          <Field label={t("Caste category")}>
            <Select value={icp.casteCategory} onChange={v => set("casteCategory", v)} ro={ro}
              options={[["", "—"], ["SC", "SC"], ["ST", "ST"], ["OBC", "OBC"], ["GEN", "GEN"]]} />
          </Field>
          <Field label={t("Caste name")}><TextInput value={icp.casteName} onChange={v => set("casteName", v)} ro={ro} /></Field>
          <Field label={t("Tribe name (if ST)")}><TextInput value={icp.tribeName} onChange={v => set("tribeName", v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Victim details */}
      <Section title={t("Victim / survivor details")}>
        <Grid cols={2}>
          <Field label={t("Currently staying with")}>
            <TextInput value={icp.currentLocation} placeholder={t("Parents / siblings / relatives / other")}
              onChange={v => set("currentLocation", v)} ro={ro} />
          </Field>
          <Field label={t("Notes")} full><TextArea value={icp.currentLocationNotes} onChange={v => set("currentLocationNotes", v)} ro={ro} /></Field>

          <Field label={t("In school")}><BoolToggle value={icp.schooling?.inSchool} onChange={v => setNested(["schooling", "inSchool"], v)} ro={ro} /></Field>
          {icp.schooling?.inSchool ? (
            <Field label={t("Current class")}><TextInput value={icp.schooling?.currentClass} onChange={v => setNested(["schooling", "currentClass"], v)} ro={ro} /></Field>
          ) : (
            <Field label={t("Last class finished")}><TextInput value={icp.schooling?.lastClassFinished} onChange={v => setNested(["schooling", "lastClassFinished"], v)} ro={ro} /></Field>
          )}

          <Field label={t("Has special needs")}><BoolToggle value={icp.specialNeeds?.has} onChange={v => setNested(["specialNeeds", "has"], v)} ro={ro} /></Field>
          {icp.specialNeeds?.has && (
            <>
              <Field label={t("Mental")}><TextInput value={icp.specialNeeds?.mental} onChange={v => setNested(["specialNeeds", "mental"], v)} ro={ro} /></Field>
              <Field label={t("Physical")}><TextInput value={icp.specialNeeds?.physical} onChange={v => setNested(["specialNeeds", "physical"], v)} ro={ro} /></Field>
              <Field label={t("Emotional")}><TextInput value={icp.specialNeeds?.emotional} onChange={v => setNested(["specialNeeds", "emotional"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label={t("Substance use")}><BoolToggle value={icp.substanceUse?.uses} onChange={v => setNested(["substanceUse", "uses"], v)} ro={ro} /></Field>
          {icp.substanceUse?.uses && (
            <>
              <Field label={t("Alcohol")}><BoolToggle value={icp.substanceUse?.alcohol} onChange={v => setNested(["substanceUse", "alcohol"], v)} ro={ro} /></Field>
              <Field label={t("Tobacco (bidi/gutka)")}><TextInput value={icp.substanceUse?.tobacco} onChange={v => setNested(["substanceUse", "tobacco"], v)} ro={ro} /></Field>
              <Field label={t("Drugs")}><BoolToggle value={icp.substanceUse?.drugs} onChange={v => setNested(["substanceUse", "drugs"], v)} ro={ro} /></Field>
              <Field label={t("Frequency / details")} full><TextArea value={icp.substanceUse?.details} onChange={v => setNested(["substanceUse", "details"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label={t("Professional skills")} full>
            <TextInput value={Array.isArray(icp.professionalSkills) ? icp.professionalSkills.join(", ") : ""}
              onChange={v => set("professionalSkills", String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
              placeholder={t("Plumbing, auto driving, mechanic, tailoring, construction…")} ro={ro} />
          </Field>

          <Field label={t("Appearance / behaviour observed")} full>
            <TextInput value={Array.isArray(icp.appearance) ? icp.appearance.join(", ") : ""}
              onChange={v => set("appearance", String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
              placeholder={t("Shy, confident, unhappy, ferocious, disobedient…")} ro={ro} />
          </Field>
          <Field label={t("Detailed observations during interaction")} full>
            <TextArea value={icp.appearanceNotes} onChange={v => set("appearanceNotes", v)} ro={ro} />
          </Field>

          <Field label={t("Linked with criminal networks")}><BoolToggle value={icp.criminalNetwork?.linked} onChange={v => setNested(["criminalNetwork", "linked"], v)} ro={ro} /></Field>
          {icp.criminalNetwork?.linked && (
            <Field label={t("Details")} full><TextArea value={icp.criminalNetwork?.details} onChange={v => setNested(["criminalNetwork", "details"], v)} ro={ro} /></Field>
          )}

          <Field label={t("Meals per day")}><NumberInput value={icp.nutrition?.mealsPerDay} onChange={v => setNested(["nutrition", "mealsPerDay"], v)} ro={ro} /></Field>
          <Field label={t("Typical meal ingredients")} full>
            <TextInput value={icp.nutrition?.ingredients} placeholder={t("Dal, rice, vegetables, poultry, meat")} onChange={v => setNested(["nutrition", "ingredients"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Abuse history */}
      <Section title={t("Symptoms or history of abuse")}>
        <Grid cols={3}>
          <CheckRow label={t("Clingy")} value={icp.abuseHistory?.clingy} onChange={v => setNested(["abuseHistory", "clingy"], v)} ro={ro} />
          <CheckRow label={t("Fear of physical spaces")} value={icp.abuseHistory?.fearOfSpaces} onChange={v => setNested(["abuseHistory", "fearOfSpaces"], v)} ro={ro} />
          <CheckRow label={t("Fear of people")} value={icp.abuseHistory?.fearOfPeople} onChange={v => setNested(["abuseHistory", "fearOfPeople"], v)} ro={ro} />
          <CheckRow label={t("Unexplained bruises")} value={icp.abuseHistory?.unexplainedBruises} onChange={v => setNested(["abuseHistory", "unexplainedBruises"], v)} ro={ro} />
          <CheckRow label={t("Soreness on the body")} value={icp.abuseHistory?.soreness} onChange={v => setNested(["abuseHistory", "soreness"], v)} ro={ro} />
          <CheckRow label={t("Doesn't respond")} value={icp.abuseHistory?.nonResponsive} onChange={v => setNested(["abuseHistory", "nonResponsive"], v)} ro={ro} />
          <CheckRow label={t("In trauma")} value={icp.abuseHistory?.inTrauma} onChange={v => setNested(["abuseHistory", "inTrauma"], v)} ro={ro} />
          <CheckRow label={t("No symptoms / history")} value={icp.abuseHistory?.none} onChange={v => setNested(["abuseHistory", "none"], v)} ro={ro} />
        </Grid>
        <Field label={t("Other symptoms")} full><TextInput value={icp.abuseHistory?.other} onChange={v => setNested(["abuseHistory", "other"], v)} ro={ro} /></Field>
        <Field label={t("Detailed explanation")} full><TextArea value={icp.abuseHistory?.details} onChange={v => setNested(["abuseHistory", "details"], v)} ro={ro} /></Field>
      </Section>

      {/* Medical */}
      <Section title={t("Medical intervention")}>
        <Field label={t("Needs medical attention")}><BoolToggle value={icp.medicalIntervention?.needs} onChange={v => setNested(["medicalIntervention", "needs"], v)} ro={ro} /></Field>
        {icp.medicalIntervention?.needs && (
          <>
            <Grid cols={3}>
              <CheckRow label={t("Skin disease")} value={icp.medicalIntervention?.skin} onChange={v => setNested(["medicalIntervention", "skin"], v)} ro={ro} />
              <CheckRow label={t("Dental / gum")} value={icp.medicalIntervention?.dental} onChange={v => setNested(["medicalIntervention", "dental"], v)} ro={ro} />
              <CheckRow label={t("Heart")} value={icp.medicalIntervention?.heart} onChange={v => setNested(["medicalIntervention", "heart"], v)} ro={ro} />
              <CheckRow label={t("Respiratory")} value={icp.medicalIntervention?.respiratory} onChange={v => setNested(["medicalIntervention", "respiratory"], v)} ro={ro} />
              <CheckRow label={t("Abdomen")} value={icp.medicalIntervention?.abdomen} onChange={v => setNested(["medicalIntervention", "abdomen"], v)} ro={ro} />
            </Grid>
            <Grid cols={2}>
              <Field label={t("Other")} full><TextInput value={icp.medicalIntervention?.other} onChange={v => setNested(["medicalIntervention", "other"], v)} ro={ro} /></Field>
              <Field label={t("Work-related injury")}><TextInput value={icp.medicalIntervention?.workInjury} onChange={v => setNested(["medicalIntervention", "workInjury"], v)} ro={ro} /></Field>
              <Field label={t("Non-work injury")}><TextInput value={icp.medicalIntervention?.nonWorkInjury} onChange={v => setNested(["medicalIntervention", "nonWorkInjury"], v)} ro={ro} /></Field>
            </Grid>
          </>
        )}
      </Section>

      {/* Hygiene */}
      <Section title={t("Personal hygiene & sanitation")}>
        <Grid cols={2}>
          <Field label={t("Nails clean")}><BoolToggle value={icp.hygiene?.nailsClean} onChange={v => setNested(["hygiene", "nailsClean"], v)} ro={ro} /></Field>
          <Field label={t("Family has personal sanitation")}><BoolToggle value={icp.hygiene?.sanitationFacility} onChange={v => setNested(["hygiene", "sanitationFacility"], v)} ro={ro} /></Field>
          <Field label={t("Other hygiene issues")} full><TextInput value={icp.hygiene?.otherIssues} onChange={v => setNested(["hygiene", "otherIssues"], v)} ro={ro} /></Field>
          <Field label={t("Observations on cleanliness, cooking area, water storage")} full>
            <TextArea value={icp.hygiene?.observations} onChange={v => setNested(["hygiene", "observations"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Missing person */}
      <Section title={t("Missing person case")}>
        <Grid cols={2}>
          <Field label={t("Case filed")}><BoolToggle value={icp.missingPersonCase?.filed} onChange={v => setNested(["missingPersonCase", "filed"], v)} ro={ro} /></Field>
          {icp.missingPersonCase?.filed ? (
            <>
              <Field label={t("Filed where")}><TextInput value={icp.missingPersonCase?.filedWhere} onChange={v => setNested(["missingPersonCase", "filedWhere"], v)} ro={ro} /></Field>
              <Field label={t("Filed by (name & relationship)")} full><TextInput value={icp.missingPersonCase?.filedBy} onChange={v => setNested(["missingPersonCase", "filedBy"], v)} ro={ro} /></Field>
            </>
          ) : (
            <>
              <Field label={t("Willing to file")}><BoolToggle value={icp.missingPersonCase?.willingToFile} onChange={v => setNested(["missingPersonCase", "willingToFile"], v)} ro={ro} /></Field>
              <Field label={t("Complaint against (trafficker / handler)")} full><TextInput value={icp.missingPersonCase?.complaintAgainst} onChange={v => setNested(["missingPersonCase", "complaintAgainst"], v)} ro={ro} /></Field>
            </>
          )}
        </Grid>
      </Section>

      {/* Victim livelihood */}
      <Section title={t("Victim livelihood")}>
        <Grid cols={2}>
          <Field label={t("Skills")} full><TextArea value={icp.victimSkills} onChange={v => set("victimSkills", v)} ro={ro} /></Field>
          <Field label={t("Current occupation")}><TextInput value={icp.victimCurrentOccupation} onChange={v => set("victimCurrentOccupation", v)} ro={ro} /></Field>
          <Field label={t("Current monthly earning (₹)")}><NumberInput value={icp.victimCurrentEarning} onChange={v => set("victimCurrentEarning", v)} ro={ro} /></Field>
          <Field label={t("Aspirations / interests")} full><TextArea value={icp.victimAspirations} onChange={v => set("victimAspirations", v)} ro={ro} /></Field>
          <Field label={t("Assessment")} full><TextArea value={icp.victimAssessment} onChange={v => set("victimAssessment", v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Family members */}
      <Section title={t("Family members (excluding the beneficiary)")}>
        <FamilyMembers value={icp.familyMembers ?? []} onChange={v => set("familyMembers", v)} ro={ro} />
      </Section>

      {/* Family circumstances */}
      <Section title={t("Family circumstances")}>
        <Field label={t("Primary breadwinner notes")} full>
          <TextInput value={icp.primaryBreadwinnerNotes} placeholder={t("Which is the main occupation of the family?")} onChange={v => set("primaryBreadwinnerNotes", v)} ro={ro} />
        </Field>
        <Grid cols={2}>
          <Field label={t("Widow in family")}><BoolToggle value={icp.widow?.present} onChange={v => setNested(["widow", "present"], v)} ro={ro} /></Field>
          {icp.widow?.present && (
            <>
              <Field label={t("Receiving widow pension")}><BoolToggle value={icp.widow?.receivesPension} onChange={v => setNested(["widow", "receivesPension"], v)} ro={ro} /></Field>
              <Field label={t("Pension amount (₹)")}><NumberInput value={icp.widow?.pensionAmount} onChange={v => setNested(["widow", "pensionAmount"], v)} ro={ro} /></Field>
              <Field label={t("Frequency")}><TextInput value={icp.widow?.pensionFrequency} placeholder={t("e.g. monthly")} onChange={v => setNested(["widow", "pensionFrequency"], v)} ro={ro} /></Field>
              <Field label={t("If no, intervention needed")} full><TextArea value={icp.widow?.interventionNeeded} onChange={v => setNested(["widow", "interventionNeeded"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label={t("Addiction in family")}><BoolToggle value={icp.familyAddiction?.present} onChange={v => setNested(["familyAddiction", "present"], v)} ro={ro} /></Field>
          {icp.familyAddiction?.present && (
            <Field label={t("Details (relationship + substance)")} full><TextArea value={icp.familyAddiction?.details} onChange={v => setNested(["familyAddiction", "details"], v)} ro={ro} /></Field>
          )}

          <Field label={t("Health issues in family")}><BoolToggle value={icp.familyHealth?.present} onChange={v => setNested(["familyHealth", "present"], v)} ro={ro} /></Field>
          {icp.familyHealth?.present && (
            <>
              <Field label={t("Relationship")}><TextInput value={icp.familyHealth?.relationship} onChange={v => setNested(["familyHealth", "relationship"], v)} ro={ro} /></Field>
              <Field label={t("Symptoms")} full><TextInput value={icp.familyHealth?.symptoms} onChange={v => setNested(["familyHealth", "symptoms"], v)} ro={ro} /></Field>
              <Field label={t("Duration")}><TextInput value={icp.familyHealth?.durationDescription} onChange={v => setNested(["familyHealth", "durationDescription"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label={t("Special-needs members in family")}><BoolToggle value={icp.familySpecialNeeds?.present} onChange={v => setNested(["familySpecialNeeds", "present"], v)} ro={ro} /></Field>
          {icp.familySpecialNeeds?.present && (
            <Field label={t("Description")} full><TextArea value={icp.familySpecialNeeds?.description} onChange={v => setNested(["familySpecialNeeds", "description"], v)} ro={ro} /></Field>
          )}

          <Field label={t("Recent shocks in last year")}><BoolToggle value={icp.recentShocks?.occurred} onChange={v => setNested(["recentShocks", "occurred"], v)} ro={ro} /></Field>
          {icp.recentShocks?.occurred && (
            <>
              <Field label={t("Description (illness, death, theft, indebtedness, dispute…)")} full>
                <TextArea value={icp.recentShocks?.description} onChange={v => setNested(["recentShocks", "description"], v)} ro={ro} />
              </Field>
              <Field label={t("Loan taken")}><BoolToggle value={icp.recentShocks?.loanTaken} onChange={v => setNested(["recentShocks", "loanTaken"], v)} ro={ro} /></Field>
              <Field label={t("Loan amount (₹)")}><NumberInput value={icp.recentShocks?.loanAmount} onChange={v => setNested(["recentShocks", "loanAmount"], v)} ro={ro} /></Field>
              <Field label={t("Impact on family finances")} full><TextArea value={icp.recentShocks?.impact} onChange={v => setNested(["recentShocks", "impact"], v)} ro={ro} /></Field>
            </>
          )}
        </Grid>
      </Section>

      {/* Bank + credit + land + livelihood */}
      <Section title={t("Bank, credit, land & livelihood resources")}>
        <Grid cols={2}>
          <Field label={t("Has savings account")}><BoolToggle value={icp.bankAccount?.hasOne} onChange={v => setNested(["bankAccount", "hasOne"], v)} ro={ro} /></Field>
          <Field label={t("Bank name")}><TextInput value={icp.bankAccount?.bankName} onChange={v => setNested(["bankAccount", "bankName"], v)} ro={ro} /></Field>
          <Field label={t("Account number")} full><TextInput value={icp.bankAccount?.accountNumber} onChange={v => setNested(["bankAccount", "accountNumber"], v)} ro={ro} /></Field>

          <Field label={t("Credit type")}>
            <Select value={icp.credit?.type} onChange={v => setNested(["credit", "type"], v)} ro={ro}
              options={[["", "—"], ["formal", t("Formal")], ["informal", t("Informal")], ["none", t("None")]]} />
          </Field>
          <Field label={t("Lender")}><TextInput value={icp.credit?.lender} onChange={v => setNested(["credit", "lender"], v)} ro={ro} /></Field>
          <Field label={t("Amount taken (₹)")}><NumberInput value={icp.credit?.amount} onChange={v => setNested(["credit", "amount"], v)} ro={ro} /></Field>
          <Field label={t("Interest rate")}><TextInput value={icp.credit?.interestRate} onChange={v => setNested(["credit", "interestRate"], v)} ro={ro} /></Field>
          <Field label={t("Amount repaid (₹)")}><NumberInput value={icp.credit?.repaid} onChange={v => setNested(["credit", "repaid"], v)} ro={ro} /></Field>
          <Field label={t("Repayment method")}><TextInput value={icp.credit?.repaymentMethod} onChange={v => setNested(["credit", "repaymentMethod"], v)} ro={ro} /></Field>
          <Field label={t("Credit assessment")} full><TextArea value={icp.credit?.assessment} onChange={v => setNested(["credit", "assessment"], v)} ro={ro} /></Field>

          <Field label={t("Owns land")}><BoolToggle value={icp.land?.ownsLand} onChange={v => setNested(["land", "ownsLand"], v)} ro={ro} /></Field>
          {icp.land?.ownsLand && (
            <>
              <Field label={t("Size (acres)")}><NumberInput value={icp.land?.sizeAcres} onChange={v => setNested(["land", "sizeAcres"], v)} ro={ro} /></Field>
              <Field label={t("Current usage")} full><TextInput value={icp.land?.usage} onChange={v => setNested(["land", "usage"], v)} ro={ro} /></Field>
              <Field label={t("Scope for EC use")}><BoolToggle value={icp.land?.ecScope} onChange={v => setNested(["land", "ecScope"], v)} ro={ro} /></Field>
              <Field label={t("EC scope notes")} full><TextArea value={icp.land?.ecScopeNotes} onChange={v => setNested(["land", "ecScopeNotes"], v)} ro={ro} /></Field>
            </>
          )}

          <Field label={t("Livestock")} full><TextInput value={icp.livelihoodResources?.livestock} placeholder={t("Poultry, goat, cow…")} onChange={v => setNested(["livelihoodResources", "livestock"], v)} ro={ro} /></Field>
          <Field label={t("Skills")} full><TextInput value={icp.livelihoodResources?.skills} placeholder={t("Tailoring, weaving, basket making…")} onChange={v => setNested(["livelihoodResources", "skills"], v)} ro={ro} /></Field>
          <Field label={t("Natural resources")}><TextInput value={icp.livelihoodResources?.naturalResources} placeholder={t("Bamboo, clay, river…")} onChange={v => setNested(["livelihoodResources", "naturalResources"], v)} ro={ro} /></Field>
          <Field label={t("Vocational training completed")} full><TextInput value={icp.livelihoodResources?.vocationalTraining} placeholder={t("Retail, hospitality, IT, automobile, electrician, welding, tailoring…")} onChange={v => setNested(["livelihoodResources", "vocationalTraining"], v)} ro={ro} /></Field>
          <Field label={t("Nearby industry")}><TextInput value={icp.livelihoodResources?.nearbyIndustry} onChange={v => setNested(["livelihoodResources", "nearbyIndustry"], v)} ro={ro} /></Field>
          <Field label={t("Distance to factory (km)")}><NumberInput value={icp.livelihoodResources?.industryDistanceKm} onChange={v => setNested(["livelihoodResources", "industryDistanceKm"], v)} ro={ro} /></Field>
          <Field label={t("Industry notes / fit")} full><TextArea value={icp.livelihoodResources?.industryNotes} onChange={v => setNested(["livelihoodResources", "industryNotes"], v)} ro={ro} /></Field>
          <Field label={t("Upcoming construction / industry")} full><TextInput value={icp.livelihoodResources?.upcomingConstruction} onChange={v => setNested(["livelihoodResources", "upcomingConstruction"], v)} ro={ro} /></Field>

          <Field label={t("Membership of support systems")} full>
            <TextInput value={icp.supportMembership} placeholder={t("SHG, CBO, NGO, Mahila Mandal, credit/saving group, caste association, Panchayat…")} onChange={v => set("supportMembership", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Migration */}
      <Section title={t("Migration")}>
        <Grid cols={2}>
          <Field label={t("Pattern")}>
            <Select value={icp.migration?.pattern} onChange={v => setNested(["migration", "pattern"], v)} ro={ro}
              options={[["", "—"], ["none", t("None")], ["seasonal", t("Seasonal")], ["permanent", t("Permanent")]]} />
          </Field>
          <Field label={t("Months / season")}><TextInput value={icp.migration?.seasonMonths} onChange={v => setNested(["migration", "seasonMonths"], v)} ro={ro} /></Field>
          <Field label={t("Destination")}><TextInput value={icp.migration?.destination} onChange={v => setNested(["migration", "destination"], v)} ro={ro} /></Field>
          <Field label={t("Type of work")}><TextInput value={icp.migration?.workType} onChange={v => setNested(["migration", "workType"], v)} ro={ro} /></Field>
          <Field label={t("Monthly earning (₹)")}><NumberInput value={icp.migration?.monthlyEarning} onChange={v => setNested(["migration", "monthlyEarning"], v)} ro={ro} /></Field>
          <Field label={t("Who migrates")}><TextInput value={icp.migration?.whoMigrates} onChange={v => setNested(["migration", "whoMigrates"], v)} ro={ro} /></Field>
          <Field label={t("Willing to migrate")}><BoolToggle value={icp.migration?.willingToMigrate} onChange={v => setNested(["migration", "willingToMigrate"], v)} ro={ro} /></Field>
          <Field label={t("Within / outside state")}>
            <Select value={icp.migration?.willingState} onChange={v => setNested(["migration", "willingState"], v)} ro={ro}
              options={[["", "—"], ["within", t("Within state")], ["outside", t("Outside state")], ["either", t("Either")]]} />
          </Field>
          <Field label={t("Migration assessment")} full><TextArea value={icp.migration?.assessment} onChange={v => setNested(["migration", "assessment"], v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Counseling */}
      <Section title={t("Counseling requirements")}>
        <Grid cols={2}>
          <Field label={t("Health counseling")}><BoolToggle value={icp.counseling?.health} onChange={v => setNested(["counseling", "health"], v)} ro={ro} /></Field>
          <Field label={t("Emotional counseling")}><BoolToggle value={icp.counseling?.emotional} onChange={v => setNested(["counseling", "emotional"], v)} ro={ro} /></Field>
          <Field label={t("Why & what aspects")} full>
            <TextArea value={icp.counseling?.observations} placeholder={t("Why you think the beneficiary or family needs counseling, and what signs you observed…")}
              onChange={v => setNested(["counseling", "observations"], v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {/* Government schemes */}
      <Section title={t("Government schemes & awareness")}>
        <Field label={t("Linkages needed (comma-separated)")} full>
          <TextInput
            value={Array.isArray(icp.schemes?.needsLinkage) ? icp.schemes.needsLinkage.join(", ") : ""}
            placeholder={t("IAY, Mahadalit, BPL, MGNREGA, PDS, Disability Pension, CBO, Jeevika, Vikas Mitra, Panchayat, Rozgar Sevak, Shiksha Sevak, Abhiyan Basera, Abhiyan Dakhal Dahari…")}
            onChange={v => setNested(["schemes", "needsLinkage"], String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
            ro={ro} />
        </Field>
        <Field label={t("Family is aware of (comma-separated)")} full>
          <TextInput
            value={Array.isArray(icp.schemes?.awareness) ? icp.schemes.awareness.join(", ") : ""}
            placeholder={t("Mid Day Meal — Anganwadi, Mid Day Meal — Govt Schools, School Uniform, Free Books, Vocational Training for illiterates, Family planning methods, School management committee, Life insurance, Health insurance…")}
            onChange={v => setNested(["schemes", "awareness"], String(v ?? "").split(",").map(s => s.trim()).filter(Boolean))}
            ro={ro} />
        </Field>
        <Field label={t("Effectiveness of Govt bodies (Panchayat, CBO, Vikas Mitra…)")} full>
          <TextArea value={icp.schemes?.govtBodyEffectiveness} onChange={v => setNested(["schemes", "govtBodyEffectiveness"], v)} ro={ro} />
        </Field>
        <Field label={t("Schemes assessment")} full>
          <TextArea value={icp.schemes?.assessment} onChange={v => setNested(["schemes", "assessment"], v)} ro={ro} />
        </Field>
      </Section>

      {/* Community context */}
      <Section title={t("Community context")}>
        <Grid cols={2}>
          <Field label={t("Drought in last 5 years")}><BoolToggle value={icp.community_context?.droughtLastFiveYears} onChange={v => setNested(["community_context", "droughtLastFiveYears"], v)} ro={ro} /></Field>
          <Field label={t("Flood in last 5 years")}><BoolToggle value={icp.community_context?.floodLastFiveYears} onChange={v => setNested(["community_context", "floodLastFiveYears"], v)} ro={ro} /></Field>
        </Grid>
        <Grid cols={3}>
          <CheckRow label={t("Newspaper")} value={icp.community_context?.access?.newspaper} onChange={v => setNested(["community_context", "access", "newspaper"], v)} ro={ro} />
          <CheckRow label={t("TV")} value={icp.community_context?.access?.tv} onChange={v => setNested(["community_context", "access", "tv"], v)} ro={ro} />
          <CheckRow label={t("Mobile phones")} value={icp.community_context?.access?.mobile} onChange={v => setNested(["community_context", "access", "mobile"], v)} ro={ro} />
          <CheckRow label={t("Radio")} value={icp.community_context?.access?.radio} onChange={v => setNested(["community_context", "access", "radio"], v)} ro={ro} />
          <CheckRow label={t("Safe drinking water")} value={icp.community_context?.access?.safeWater} onChange={v => setNested(["community_context", "access", "safeWater"], v)} ro={ro} />
          <CheckRow label={t("Electricity")} value={icp.community_context?.access?.electricity} onChange={v => setNested(["community_context", "access", "electricity"], v)} ro={ro} />
          <CheckRow label={t("Sanitation")} value={icp.community_context?.access?.sanitation} onChange={v => setNested(["community_context", "access", "sanitation"], v)} ro={ro} />
          <CheckRow label={t("Police station")} value={icp.community_context?.access?.policeStation} onChange={v => setNested(["community_context", "access", "policeStation"], v)} ro={ro} />
          <CheckRow label={t("Ration shop")} value={icp.community_context?.access?.rationShop} onChange={v => setNested(["community_context", "access", "rationShop"], v)} ro={ro} />
          <CheckRow label={t("Community hall")} value={icp.community_context?.access?.communityHall} onChange={v => setNested(["community_context", "access", "communityHall"], v)} ro={ro} />
          <CheckRow label={t("Community land")} value={icp.community_context?.access?.communityLand} onChange={v => setNested(["community_context", "access", "communityLand"], v)} ro={ro} />
          <CheckRow label={t("Post office")} value={icp.community_context?.access?.postOffice} onChange={v => setNested(["community_context", "access", "postOffice"], v)} ro={ro} />
          <CheckRow label={t("Road transport")} value={icp.community_context?.access?.roadTransport} onChange={v => setNested(["community_context", "access", "roadTransport"], v)} ro={ro} />
          <CheckRow label={t("ICDS")} value={icp.community_context?.access?.icds} onChange={v => setNested(["community_context", "access", "icds"], v)} ro={ro} />
        </Grid>
        <Grid cols={3}>
          <Field label={t("School distance (km)")}><NumberInput value={icp.community_context?.access?.schoolDistanceKm} onChange={v => setNested(["community_context", "access", "schoolDistanceKm"], v)} ro={ro} /></Field>
          <Field label={t("Market distance (km)")}><NumberInput value={icp.community_context?.access?.marketDistanceKm} onChange={v => setNested(["community_context", "access", "marketDistanceKm"], v)} ro={ro} /></Field>
          <Field label={t("Health centre distance (km)")}><NumberInput value={icp.community_context?.access?.healthCentreDistanceKm} onChange={v => setNested(["community_context", "access", "healthCentreDistanceKm"], v)} ro={ro} /></Field>
          <Field label={t("Bank(s) in proximity")} full><TextInput value={icp.community_context?.access?.bank} onChange={v => setNested(["community_context", "access", "bank"], v)} ro={ro} /></Field>
        </Grid>

        <p className="text-xs font-semibold text-(--text) mt-4 mb-2">{t("Children leaving the village for work")}</p>
        <Grid cols={3}>
          <Field label={t("Below 14")}><NumberInput value={icp.community_context?.childrenLeftForWork?.below14} onChange={v => setNested(["community_context", "childrenLeftForWork", "below14"], v)} ro={ro} /></Field>
          <Field label={t("15 – 17")}><NumberInput value={icp.community_context?.childrenLeftForWork?.age15to17} onChange={v => setNested(["community_context", "childrenLeftForWork", "age15to17"], v)} ro={ro} /></Field>
          <Field label={t("18 +")}><NumberInput value={icp.community_context?.childrenLeftForWork?.age18plus} onChange={v => setNested(["community_context", "childrenLeftForWork", "age18plus"], v)} ro={ro} /></Field>
          <Field label={t("Type of work")} full><TextInput value={icp.community_context?.childrenLeftForWork?.workType} onChange={v => setNested(["community_context", "childrenLeftForWork", "workType"], v)} ro={ro} /></Field>
          <Field label={t("Go with")}><TextInput value={icp.community_context?.childrenLeftForWork?.goWith} onChange={v => setNested(["community_context", "childrenLeftForWork", "goWith"], v)} ro={ro} /></Field>
          <Field label={t("Approx earning (₹)")}><NumberInput value={icp.community_context?.childrenLeftForWork?.earning} onChange={v => setNested(["community_context", "childrenLeftForWork", "earning"], v)} ro={ro} /></Field>
          <Field label={t("Destinations")} full><TextInput value={icp.community_context?.childrenLeftForWork?.destinations} onChange={v => setNested(["community_context", "childrenLeftForWork", "destinations"], v)} ro={ro} /></Field>
        </Grid>
      </Section>

      {/* Identity cards */}
      <Section title={t("Identity cards & compensation")}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-semibold text-(--muted)">{t("Document")}</th>
              <th className="py-2 pr-3 font-semibold text-(--muted)">{t("Has it")}</th>
              <th className="py-2 pr-3 font-semibold text-(--muted)">{t("Date of issue")}</th>
              <th className="py-2 font-semibold text-(--muted)">{t("Notes / assessment")}</th>
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
                  <td className="py-2 pr-3 text-(--text)">{t(label)}</td>
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
      <Section title={t("Plans")}>
        <Grid cols={2}>
          <Field label={t("Short-term plan")} full>
            <TextArea rows={5} value={icp.shortTermPlan} placeholder={t("Next 1–3 months: counselling, medical, shelter, school re-entry, etc.")}
              onChange={v => set("shortTermPlan", v)} ro={ro} />
          </Field>
          <Field label={t("Long-term plan")} full>
            <TextArea rows={5} value={icp.longTermPlan} placeholder={t("6–24 months: livelihood, vocational training, school completion, family support, scheme linkages.")}
              onChange={v => set("longTermPlan", v)} ro={ro} />
          </Field>
        </Grid>
      </Section>

      {canEdit && (
        <div className="icp-controls flex items-center justify-end gap-2 pb-12">
          <button type="button" onClick={() => save()} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            {saving ? t("Saving…") : t("Save Draft")}
          </button>
          <button type="button" onClick={() => save({ complete: true })} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--success)", color: "#fff" }}>
            {t("Mark Complete")}
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
  const t = useT();
  return (
    <div className="flex gap-1 text-xs">
      {[[t("Yes"), true], [t("No"), false]].map(([label, v]) => {
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
  const t = useT();
  function update(i: number, patch: Record<string, unknown>) {
    onChange(value.map((m, j) => j === i ? { ...m, ...patch } : m));
  }
  function remove(i: number) { onChange(value.filter((_, j) => j !== i)); }
  function add() { onChange([...value, {}]); }

  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-xs text-(--muted)">{t("No family members added yet.")}</p>}
      {value.map((m, i) => (
        <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-(--text)">{t("Member #")}{i + 1}{m.isPrimaryEarner ? ` · ${t("primary earner")}` : ""}</p>
            {!ro && (
              <button type="button" onClick={() => remove(i)}
                className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("Remove")}</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TextInput value={m.name} onChange={v => update(i, { name: v })} placeholder={t("Name")} ro={ro} />
            <NumberInput value={m.age} onChange={v => update(i, { age: v })} ro={ro} />
            <TextInput value={m.relationship} onChange={v => update(i, { relationship: v })} placeholder={t("Relationship")} ro={ro} />
            <TextInput value={m.education} onChange={v => update(i, { education: v })} placeholder={t("Education till class")} ro={ro} />
            <TextInput value={m.primaryOccupation} onChange={v => update(i, { primaryOccupation: v })} placeholder={t("Primary occupation")} ro={ro} />
            <NumberInput value={m.primarySalaryPerMonth} onChange={v => update(i, { primarySalaryPerMonth: v })} ro={ro} />
            <TextInput value={m.otherIncomeSource} onChange={v => update(i, { otherIncomeSource: v })} placeholder={t("Other income source")} ro={ro} />
            <NumberInput value={m.otherIncomePerMonth} onChange={v => update(i, { otherIncomePerMonth: v })} ro={ro} />
            <TextInput value={m.livelihoodSkills} onChange={v => update(i, { livelihoodSkills: v })} placeholder={t("Livelihood skills")} ro={ro} />
            <TextArea value={m.aspirations} onChange={v => update(i, { aspirations: v })} placeholder={t("Aspirations / interests")} ro={ro} />
          </div>
          {!ro && (
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={!!m.isPrimaryEarner} onChange={e => update(i, { isPrimaryEarner: e.target.checked })} />
              <span className="text-(--text)">{t("Primary breadwinner")}</span>
            </label>
          )}
        </div>
      ))}
      {!ro && (
        <button type="button" onClick={add}
          className="w-full text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
          + {t("Add family member")}
        </button>
      )}
    </div>
  );
}
