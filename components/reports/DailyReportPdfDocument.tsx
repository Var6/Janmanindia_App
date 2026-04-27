"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Visual layout matches the foundation's official "Daily Report Format for
 * Social Worker" — landscape A4, blue section headers, dark-red Section E,
 * light-blue instructions banner, 12-column case-wise table on page 1,
 * 4-column support checklist + 6-column escalation table + declaration
 * grid on page 2.
 */

const C = {
  text: "#0f172a",
  text2: "#334155",
  muted: "#64748b",
  border: "#9aa9bd",
  borderLight: "#cbd5e1",
  zebra: "#f8fafc",
  // Brand spec — navy headers, light-blue label cells, dark-red Section E
  navy: "#2c4d6e",
  navyDark: "#1e3a5f",
  navyLabel: "#dbe5ef",
  redDark: "#7c1d1d",
  redLabel: "#e9c8c8",
  instructionsBg: "#e3edf6",
};

const s = StyleSheet.create({
  page: { paddingTop: 22, paddingBottom: 36, paddingHorizontal: 22, fontSize: 8, color: C.text, fontFamily: "Helvetica" },

  // Top centred banner
  banner: { marginBottom: 6, alignItems: "center" },
  bannerOrg:  { fontSize: 9.5, color: C.navyDark, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  bannerSub:  { fontSize: 7.5, color: C.muted, fontStyle: "italic", marginBottom: 3 },
  bannerLine: { fontSize: 7.5, color: C.text, fontFamily: "Helvetica-Bold" },
  bannerNote: { fontSize: 7, color: C.muted, fontStyle: "italic", marginTop: 1 },

  bigTitle: { fontSize: 18, color: C.text, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 4 },
  bigSubtitle: { fontSize: 8.5, color: C.text2, fontStyle: "italic", textAlign: "center", marginTop: 2, marginBottom: 6 },

  instructions: {
    backgroundColor: C.instructionsBg,
    borderWidth: 0.6,
    borderColor: C.borderLight,
    borderStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  instructionsText: { fontSize: 7.5, color: C.text, lineHeight: 1.35 },

  sectionTitleBlue: { fontSize: 11, color: C.navy, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  sectionTitleRed:  { fontSize: 11, color: C.redDark, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },

  // Generic table primitives
  table: { borderTop: `0.6pt solid ${C.border}`, borderLeft: `0.6pt solid ${C.border}` },
  tr:    { flexDirection: "row" },
  th:    {
    backgroundColor: C.navy, color: "#fff", fontFamily: "Helvetica-Bold",
    fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
  },
  thRed: {
    backgroundColor: C.redDark, color: "#fff", fontFamily: "Helvetica-Bold",
    fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
  },
  td:    {
    fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
    color: C.text,
  },
  tdHint: {
    fontSize: 6.8, fontStyle: "italic", color: C.muted,
    paddingVertical: 4, paddingHorizontal: 4,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
  },
  tdLabel: {
    backgroundColor: C.navyLabel,
    color: C.text, fontFamily: "Helvetica-Bold",
    fontSize: 8, paddingVertical: 5, paddingHorizontal: 6,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
  },
  tdValue: {
    fontSize: 8, paddingVertical: 5, paddingHorizontal: 6,
    borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`,
    color: C.text,
  },

  // Section B — six summary cells per row
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", borderTop: `0.6pt solid ${C.border}`, borderLeft: `0.6pt solid ${C.border}` },
  summaryCell: {
    width: "16.666%",
    paddingVertical: 6, paddingHorizontal: 6,
    borderRight: `0.6pt solid ${C.border}`,
    borderBottom: `0.6pt solid ${C.border}`,
  },
  summaryLabel: { fontSize: 7.5, color: C.text },
  summaryUnderscore: { fontFamily: "Helvetica-Bold", color: C.text },

  // Checkbox row in Section D
  checkRow: { flexDirection: "row", alignItems: "flex-start" },
  checkBox: {
    width: 8, height: 8, borderWidth: 0.7, borderColor: C.text2, borderStyle: "solid",
    marginRight: 4, marginTop: 1, alignItems: "center", justifyContent: "center",
  },
  checkOn: { backgroundColor: C.navyDark, borderColor: C.navyDark },
  checkMark: { color: "#fff", fontSize: 6, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  checkLabel: { fontSize: 7.5, color: C.text, flex: 1, lineHeight: 1.35 },

  narrativeBox: {
    borderWidth: 0.6, borderColor: C.border, borderStyle: "solid",
    padding: 6, minHeight: 70,
  },
  narrativePrompt: { fontSize: 7.5, color: C.muted, fontStyle: "italic", marginBottom: 4 },
  narrativeText: { fontSize: 8.5, color: C.text, lineHeight: 1.4 },

  // Footer line at bottom of every page
  footer: {
    position: "absolute", bottom: 14, left: 22, right: 22,
    fontSize: 7, color: C.muted, textAlign: "center", fontStyle: "italic",
  },
  pageNum: { position: "absolute", bottom: 14, right: 22, fontSize: 7, color: C.muted },

  // Bottom confidentiality reminder before footer
  reminder: { fontSize: 7, color: C.muted, fontStyle: "italic", marginTop: 8, lineHeight: 1.35 },
});

const fmtDate = (v: any): string => {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; }
};
const fmtDateTime = (v: any): string => {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-IN"); } catch { return ""; }
};
const txt = (v: any): string => (v === undefined || v === null || v === "" ? "" : String(v));

const CONTACT_LABEL: Record<string, string> = {
  home_visit: "Home visit", phone: "Phone", office: "Office", court: "Court",
  police: "Police", hospital: "Hospital", department: "Department", other: "Other",
};

const CHECKLIST_GROUPS = ["legalAid", "schemeLinkage", "rehabilitation", "counsellingProtection"] as const;
type ChecklistKey = typeof CHECKLIST_GROUPS[number];

const CHECKLIST_HEADERS: Record<ChecklistKey, string> = {
  legalAid: "Legal Aid / Justice Process",
  schemeLinkage: "Scheme & Entitlement Linkage",
  rehabilitation: "Rehabilitation Support",
  counsellingProtection: "Counselling & Protection",
};

const CHECKLIST_ITEMS: Record<ChecklistKey, string[]> = {
  legalAid: [
    "FIR/complaint follow-up", "Lawyer/legal aid meeting", "Court-date coordination",
    "Police/prosecution follow-up", "Statement/evidence/document support",
    "Compensation/victim compensation follow-up",
  ],
  schemeLinkage: [
    "Identity documents", "Ration/social security pension", "Disability certificate/UDID",
    "Labour/livelihood scheme", "Education scholarship/admission", "Health insurance/medical support",
  ],
  rehabilitation: [
    "Shelter/safe accommodation", "Medical treatment/referral", "Livelihood or skill linkage",
    "Education continuation", "Family/community reintegration", "Long-term rehabilitation plan",
  ],
  counsellingProtection: [
    "Individual counselling", "Family counselling", "Safety planning",
    "Crisis intervention", "Referral to OSC/CWC/DCPU/NGO", "Follow-up with counsellor/psychologist",
  ],
};

// Section B summary fields — order matches the printed PDF row-by-row.
const SUMMARY_FIELDS: { key: string; label: string }[] = [
  { key: "totalCases",                  label: "Total cases followed up" },
  { key: "newCases",                    label: "New cases received" },
  { key: "homeFieldVisits",             label: "Home/field visits" },
  { key: "phoneFollowUps",              label: "Phone follow-ups" },
  { key: "schemeApps",                  label: "Scheme applications/referrals" },
  { key: "urgentFlagged",               label: "Urgent cases flagged" },
  { key: "counsellingSessions",         label: "Counselling sessions" },
  { key: "legalAidFollowUps",           label: "Legal aid/court follow-ups" },
  { key: "networkingMeetings",          label: "Networking meetings" },
  { key: "documentsCollectedSubmitted", label: "Documents collected/submitted" },
  { key: "rehabActions",                label: "Rehabilitation actions" },
  { key: "needSupervisorReview",        label: "Cases requiring supervisor review" },
];

// Case-wise table column widths (must add to 100). Mirrors the PDF column order.
const CASE_COLS = [
  { key: "caseNumber",            head: "Case ID",                     width: 7 },
  { key: "clientCode",            head: "Client/Survivor Code",        width: 7 },
  { key: "caseType",              head: "Case Type / Issue",           width: 7 },
  { key: "modeOfContact",         head: "Mode of Contact",             width: 9 },
  { key: "workDoneToday",         head: "Work Done Today",             width: 11 },
  { key: "schemeLinkage",         head: "Scheme / Entitlement Linkage", width: 9 },
  { key: "rehabSupport",          head: "Rehabilitation Support",      width: 9 },
  { key: "counsellingSupport",    head: "Counselling / Psycho-social Support", width: 9 },
  { key: "legalAidCoordination",  head: "Legal Aid Coordination",      width: 9 },
  { key: "networkingReferral",    head: "Networking / Referral",       width: 8 },
  { key: "riskSafety",            head: "Risk / Challenge / Safety Concern", width: 8 },
  { key: "outcomeNextAction",     head: "Outcome / Next Action",       width: 7 },
] as const;

const CASE_HINTS: Partial<Record<typeof CASE_COLS[number]["key"], string>> = {
  modeOfContact:        "Home visit / phone / office / court / police / hospital / department",
  schemeLinkage:        "Scheme name, dept., application no., status",
  rehabSupport:         "Shelter, compensation, education, livelihood, health, documents",
  legalAidCoordination: "Lawyer contacted, court date, FIR, statement, documents",
  riskSafety:           "Threat, pressure, non-cooperation, urgent need",
  outcomeNextAction:    "Result today + next follow-up date/person",
};

// Always print at least this many empty rows so the form stays close to the
// printed template even when the SW only logged a couple of cases.
const MIN_CASE_ROWS = 8;
const MIN_ESC_ROWS  = 4;

function getCaseField(row: any, key: string): string {
  if (key === "modeOfContact") return CONTACT_LABEL[row?.modeOfContact ?? ""] ?? row?.modeOfContact ?? "";
  return txt(row?.[key]);
}

export interface DailyReportPdfProps {
  report: any;
}

export default function DailyReportPdfDocument({ report }: DailyReportPdfProps) {
  const r = report ?? {};
  const sum = r.summary ?? {};
  const rows: any[] = Array.isArray(r.caseRows) ? r.caseRows : [];
  const escs: any[] = Array.isArray(r.escalations) ? r.escalations : [];
  const checklist = r.supportChecklist ?? { legalAid: [], schemeLinkage: [], rehabilitation: [], counsellingProtection: [] };

  const preparedBy = r.preparedBy?.name
    ? `${r.preparedBy.name}${r.preparedBy.employeeId ? ` · ${r.preparedBy.employeeId}` : ""}`
    : "";
  const reviewer = r.supervisor?.name
    ? `${r.supervisor.name}${r.reviewedAt ? ` · ${fmtDate(r.reviewedAt)}` : ""}`
    : "";

  // Pad case rows to MIN_CASE_ROWS so the PDF resembles the blank template.
  const paddedRows = [...rows];
  while (paddedRows.length < MIN_CASE_ROWS) paddedRows.push({});

  const paddedEscs = [...escs];
  while (paddedEscs.length < MIN_ESC_ROWS) paddedEscs.push({});

  return (
    <Document title={`Daily Social Worker Report — ${fmtDate(r.reportDate) || "draft"}`} author="Janman India">
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        {/* Top centred banner — exact spec text */}
        <View style={s.banner} fixed>
          <Text style={s.bannerOrg}>Janman People&apos;s Foundation</Text>
          <Text style={s.bannerSub}>Jan Nyay Abhiyan — Bihar</Text>
          <Text style={s.bannerLine}>DAILY SOCIAL WORKER REPORT | Survivor/Victim Legal Aid, Rehabilitation and Follow-up</Text>
          <Text style={s.bannerNote}>
            Confidential: Use Case ID/Client Code wherever possible. Avoid unnecessary disclosure of survivor/victim identity.
          </Text>
        </View>

        <Text style={s.bigTitle}>DAILY REPORT FORMAT FOR SOCIAL WORKER</Text>
        <Text style={s.bigSubtitle}>
          For survivor/victim support cases receiving legal aid, scheme linkage, rehabilitation, counselling and networking support
        </Text>

        <View style={s.instructions}>
          <Text style={s.instructionsText}>
            Instructions: Fill this report at the end of each working day. One row may be used for each survivor/victim case handled during the day. Case ID must be entered for every case. Record facts briefly, avoid stigmatizing language, and mark urgent protection or safety issues clearly for supervisor follow-up.
          </Text>
        </View>

        {/* A. Reporting Details */}
        <Text style={s.sectionTitleBlue}>A. Reporting Details</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.tdLabel, { width: "20%" }]}>Date of Report</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{fmtDate(r.reportDate)}</Text>
            <Text style={[s.tdLabel, { width: "20%" }]}>District/Block</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{txt(r.districtBlock)}</Text>
          </View>
        </View>

        {/* B. Daily Summary */}
        <Text style={s.sectionTitleBlue}>B. Daily Summary</Text>
        <View style={s.summaryGrid}>
          {SUMMARY_FIELDS.map(f => {
            const v = sum[f.key];
            const numeric = (v === undefined || v === null || v === "") ? "" : String(v);
            return (
              <View key={f.key} style={s.summaryCell}>
                <Text style={s.summaryLabel}>
                  {f.label}: <Text style={s.summaryUnderscore}>{numeric || "______"}</Text>
                </Text>
              </View>
            );
          })}
        </View>

        {/* C. Case-wise Daily Activity Report */}
        <Text style={s.sectionTitleBlue}>C. Case-wise Daily Activity Report</Text>
        <View style={s.table}>
          <View style={s.tr} fixed>
            {CASE_COLS.map(col => (
              <Text key={col.key} style={[s.th, { width: `${col.width}%` }]}>{col.head}</Text>
            ))}
          </View>
          {/* Hint row — italic placeholders mirroring the printed template */}
          <View style={s.tr} wrap={false}>
            {CASE_COLS.map(col => {
              const hint = CASE_HINTS[col.key as keyof typeof CASE_HINTS];
              return (
                <Text key={col.key} style={[s.tdHint, { width: `${col.width}%` }]}>{hint ?? ""}</Text>
              );
            })}
          </View>
          {paddedRows.map((row, i) => (
            <View key={i} style={s.tr} wrap={false}>
              {CASE_COLS.map(col => (
                <Text key={col.key} style={[s.td, { width: `${col.width}%` }]}>
                  {getCaseField(row, col.key)}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.footer} fixed>
          Janman People&apos;s Foundation · Jan Nyay Abhiyan — Bihar · Confidential: Use Case ID/Client Code. Avoid unnecessary disclosure of survivor/victim identity.
        </Text>
        <Text style={s.pageNum} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>

      {/* Page 2 — sections D – G */}
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        <View style={s.banner} fixed>
          <Text style={s.bannerOrg}>Janman People&apos;s Foundation</Text>
          <Text style={s.bannerSub}>Jan Nyay Abhiyan — Bihar</Text>
          <Text style={s.bannerLine}>DAILY SOCIAL WORKER REPORT | Survivor/Victim Legal Aid, Rehabilitation and Follow-up</Text>
        </View>

        {/* D. Support Category Checklist */}
        <Text style={s.sectionTitleBlue}>D. Support Category Checklist</Text>
        <View style={s.table}>
          <View style={s.tr} fixed>
            {CHECKLIST_GROUPS.map(g => (
              <Text key={g} style={[s.th, { width: "25%" }]}>{CHECKLIST_HEADERS[g]}</Text>
            ))}
          </View>
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <View key={rowIdx} style={s.tr} wrap={false}>
              {CHECKLIST_GROUPS.map(g => {
                const item = CHECKLIST_ITEMS[g][rowIdx];
                const on = (checklist[g] ?? []).includes(item);
                return (
                  <View key={g} style={[s.td, { width: "25%" }]}>
                    <View style={s.checkRow}>
                      <View style={[s.checkBox, on ? s.checkOn : {}]}>
                        {on ? <Text style={s.checkMark}>X</Text> : null}
                      </View>
                      <Text style={s.checkLabel}>{item}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* E. Urgent Escalation / Supervisor Review */}
        <Text style={s.sectionTitleRed}>E. Urgent Escalation / Supervisor Review</Text>
        <View style={s.table}>
          <View style={s.tr} fixed>
            <Text style={[s.thRed, { width: "10%" }]}>Case ID</Text>
            <Text style={[s.thRed, { width: "26%" }]}>Issue requiring escalation</Text>
            <Text style={[s.thRed, { width: "14%" }]}>Immediate risk level</Text>
            <Text style={[s.thRed, { width: "22%" }]}>Action requested from supervisor/lawyer</Text>
            <Text style={[s.thRed, { width: "12%" }]}>Deadline</Text>
            <Text style={[s.thRed, { width: "16%" }]}>Status</Text>
          </View>
          {paddedEscs.map((row, i) => {
            const risk = i === 0 && !row.riskLevel
              ? "Low / Medium / High / Immediate"
              : row.riskLevel ? String(row.riskLevel).replace(/^\w/, c => c.toUpperCase()) : "";
            const riskStyle = (i === 0 && !row.riskLevel) ? s.tdHint : s.td;
            return (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={[s.td,     { width: "10%" }]}>{txt(row.caseNumber)}</Text>
                <Text style={[s.td,     { width: "26%" }]}>{txt(row.issue)}</Text>
                <Text style={[riskStyle, { width: "14%" }]}>{risk}</Text>
                <Text style={[s.td,     { width: "22%" }]}>{txt(row.actionRequested)}</Text>
                <Text style={[s.td,     { width: "12%" }]}>{fmtDate(row.deadline)}</Text>
                <Text style={[s.td,     { width: "16%" }]}>{txt(row.status)}</Text>
              </View>
            );
          })}
        </View>

        {/* F. Narrative Notes / Field Observations */}
        <Text style={s.sectionTitleBlue}>F. Narrative Notes / Field Observations</Text>
        <View style={s.narrativeBox}>
          {r.narrativeNotes
            ? <Text style={s.narrativeText}>{r.narrativeNotes}</Text>
            : <Text style={s.narrativePrompt}>Write brief field observations, survivor/victim concerns, family/community dynamics, institutional response, barriers faced, and any learning from the day.</Text>}
        </View>

        {/* G. Declaration and Signature */}
        <Text style={s.sectionTitleBlue}>G. Declaration and Signature</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.tdLabel, { width: "20%" }]}>Prepared by</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{preparedBy}</Text>
            <Text style={[s.tdLabel, { width: "20%" }]}>Signature</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{r.signatureUrl ? "(on file)" : ""}</Text>
          </View>
          <View style={s.tr}>
            <Text style={[s.tdLabel, { width: "20%" }]}>Date & Time of Submission</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{fmtDateTime(r.submittedAt)}</Text>
            <Text style={[s.tdLabel, { width: "20%" }]}>Reviewed by Supervisor</Text>
            <Text style={[s.tdValue, { width: "30%" }]}>{reviewer}</Text>
          </View>
          <View style={s.tr}>
            <Text style={[s.tdLabel, { width: "20%" }]}>Supervisor Remarks</Text>
            <Text style={[s.tdValue, { width: "80%", minHeight: 36 }]}>{txt(r.supervisorRemarks)}</Text>
          </View>
        </View>

        <Text style={s.reminder}>
          Confidentiality Reminder: This format should be stored securely. Where disclosure is not required, use Case ID and Client/Survivor Code instead of names. Do not include unnecessary details of sexual violence, trauma history, or identity markers in routine daily reports.
        </Text>

        <Text style={s.footer} fixed>
          Janman People&apos;s Foundation · Jan Nyay Abhiyan — Bihar · Confidential: Use Case ID/Client Code. Avoid unnecessary disclosure of survivor/victim identity.
        </Text>
        <Text style={s.pageNum} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
