"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";

/**
 * EOD Report (invoice-style) PDF.
 *
 *   • Foundation header banner
 *   • Invoice metadata: date, status, prepared-by, employee ID, role
 *   • Work summary
 *   • Itemised expense table with totals
 *   • Approval pipeline trail (HR verified → Director approved → Paid /
 *     Rejected with reason)
 *   • Footer signature block
 */

interface PersonRef { _id?: string; name?: string; email?: string; role?: string; employeeId?: string }
interface EodLike {
  _id?: string;
  date: string | Date;
  summary: string;
  hoursWorked: number;
  expenses: { description: string; amount: number; receiptUrl?: string }[];
  invoiceUrl?: string;
  invoiceStatus: "pending" | "hr_verified" | "approved" | "rejected";
  submittedBy?: PersonRef | string | null;
  submitterRole?: string;
  hrVerifiedBy?: PersonRef | null;
  hrVerifiedAt?: string | Date;
  hrNotes?: string;
  finalApprovedBy?: PersonRef | null;
  finalApprovedAt?: string | Date;
  approvalNotes?: string;
  rejectionReason?: string;
  reviewedBy?: PersonRef | null;
  createdAt?: string | Date;
}

const C = {
  text: "#0f172a",
  text2: "#334155",
  muted: "#64748b",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  zebra: "#f8fafc",
  navy: "#1e3a5f",
  navyLabel: "#dbe5ef",
  green: "#15803d",
  greenBg: "#dcfce7",
  red: "#7c1d1d",
  redBg: "#fee2e2",
  amber: "#92400e",
  amberBg: "#fef3c7",
  info: "#1e40af",
  infoBg: "#dbeafe",
};

const STATUS = {
  pending:     { fill: C.amberBg, color: C.amber, label: "PENDING HR" },
  hr_verified: { fill: C.infoBg,  color: C.info,  label: "HR VERIFIED — AWAITING APPROVAL" },
  approved:    { fill: C.greenBg, color: C.green, label: "APPROVED & PAID" },
  rejected:    { fill: C.redBg,   color: C.red,   label: "REJECTED" },
};

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 36, paddingHorizontal: 32, fontSize: 9.5, color: C.text, fontFamily: "Helvetica" },

  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  brand:    { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.navy },
  brandSub: { fontSize: 8, color: C.muted, fontStyle: "italic" },
  divider:  { height: 0.8, backgroundColor: C.navy, marginVertical: 6 },

  title:       { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.text, marginTop: 6 },
  subtitle:    { fontSize: 9, color: C.muted, marginTop: 1 },

  statusPill: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginBottom: 4, borderWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  metaCell: { width: "50%", padding: 6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  metaLabel: { fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, color: C.text, marginTop: 2 },

  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 14, marginBottom: 5 },

  summaryBox: { borderWidth: 0.6, borderColor: C.borderLight, borderStyle: "solid", padding: 10, fontSize: 10, color: C.text2, lineHeight: 1.45 },

  // Expense table
  table: { borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: C.border, borderStyle: "solid", marginTop: 4 },
  tr:    { flexDirection: "row" },
  th:    { backgroundColor: C.navy, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  td:    { fontSize: 9, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid", color: C.text2 },
  tdRight: { textAlign: "right" },
  totalRow: { flexDirection: "row", marginTop: 6, paddingTop: 6, borderTopWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  totalLabel: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: C.text },
  totalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, textAlign: "right" },

  // Approval timeline
  step:       { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  stepDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 3, marginRight: 8 },
  stepBody:   { flex: 1 },
  stepLabel:  { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.text },
  stepMeta:   { fontSize: 8.5, color: C.muted, marginTop: 1 },

  rejectionBox: { backgroundColor: C.redBg, borderWidth: 0.6, borderColor: C.red, borderStyle: "solid", padding: 8, marginTop: 6 },
  rejectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.red, textTransform: "uppercase", letterSpacing: 0.5 },
  rejectionText: { fontSize: 10, color: C.text, marginTop: 3 },

  notesBox: { backgroundColor: C.zebra, borderWidth: 0.6, borderColor: C.borderLight, borderStyle: "solid", padding: 8, marginTop: 6 },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  notesText: { fontSize: 9.5, color: C.text2, marginTop: 3 },

  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, paddingTop: 6, borderTopWidth: 0.4, borderColor: C.borderLight, borderStyle: "solid", flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted },
  signRow: { flexDirection: "row", marginTop: 24 },
  signCol: { flex: 1, marginRight: 16 },
  signLine: { borderTopWidth: 0.6, borderColor: C.text, borderStyle: "solid", marginTop: 28 },
  signLabel: { fontSize: 8, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  link: { color: C.info, fontSize: 8.5, textDecoration: "underline" },
});

function fmtINR(n: number) {
  return "₹ " + (n ?? 0).toLocaleString("en-IN");
}
function fmtDate(d?: string | Date) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateTime(d?: string | Date) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props { report: EodLike }

export default function EodReportPdfDocument({ report }: Props) {
  const total = (report.expenses ?? []).reduce((s, e) => s + (e?.amount ?? 0), 0);
  const status = STATUS[report.invoiceStatus] ?? STATUS.pending;
  const submitter = (typeof report.submittedBy === "object" ? report.submittedBy : null) as PersonRef | null;
  const submitterRole = (report.submitterRole ?? submitter?.role ?? "—").replace(/(.)/, c => c.toUpperCase());

  const stages: { label: string; by?: PersonRef | null; at?: string | Date; notes?: string; color: string }[] = [];
  stages.push({
    label: "Submitted",
    at: report.createdAt,
    by: submitter,
    color: C.muted,
  });
  if (report.hrVerifiedBy || report.hrVerifiedAt) {
    stages.push({
      label: report.invoiceStatus === "approved" && submitter?.role === "socialworker" ? "HR Verified & Approved" : "HR Verified",
      at: report.hrVerifiedAt,
      by: report.hrVerifiedBy ?? null,
      notes: report.hrNotes,
      color: C.info,
    });
  }
  if (report.finalApprovedBy || report.finalApprovedAt) {
    stages.push({
      label: report.invoiceStatus === "approved" ? "Approved & Paid" : "Approved",
      at: report.finalApprovedAt,
      by: report.finalApprovedBy ?? null,
      notes: report.approvalNotes,
      color: C.green,
    });
  }
  if (report.invoiceStatus === "rejected") {
    stages.push({
      label: "Rejected",
      at: undefined,
      by: report.reviewedBy ?? null,
      notes: report.rejectionReason,
      color: C.red,
    });
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Brand banner */}
        <View style={s.brandRow}>
          <View>
            <Text style={s.brand}>Janman People&apos;s Foundation</Text>
            <Text style={s.brandSub}>Jan Nyay Abhiyan — Bihar</Text>
          </View>
          <Text style={[s.brandSub, { textAlign: "right" }]}>End-of-Day Report &amp; Expense Invoice</Text>
        </View>
        <View style={s.divider} />

        <Text style={s.title}>EOD Report — {fmtDate(report.date)}</Text>
        <Text style={s.subtitle}>
          Report ID: {report._id ?? "—"} · Generated {new Date().toLocaleString("en-IN")}
        </Text>

        <Text style={[s.statusPill, { backgroundColor: status.fill, color: status.color }]}>
          {status.label}
        </Text>

        {/* Metadata */}
        <View style={s.metaGrid}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Prepared by</Text>
            <Text style={s.metaValue}>{submitter?.name ?? "—"}</Text>
            <Text style={[s.metaValue, { fontSize: 8.5, color: C.muted, marginTop: 1 }]}>
              {submitter?.email ?? "—"}{submitter?.employeeId ? ` · ${submitter.employeeId}` : ""}
            </Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Role</Text>
            <Text style={[s.metaValue, { textTransform: "capitalize" }]}>{submitterRole}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Date of work</Text>
            <Text style={s.metaValue}>{fmtDate(report.date)}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Hours worked</Text>
            <Text style={s.metaValue}>{report.hoursWorked} h</Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={s.sectionTitle}>Summary of work</Text>
        <View style={s.summaryBox}>
          <Text>{report.summary || "—"}</Text>
        </View>

        {/* Expenses */}
        <Text style={s.sectionTitle}>Itemised expenses</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: "8%" }]}>#</Text>
            <Text style={[s.th, { width: "52%" }]}>Description</Text>
            <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Amount</Text>
            <Text style={[s.th, { width: "20%" }]}>Receipt</Text>
          </View>
          {(report.expenses ?? []).length === 0 ? (
            <View style={s.tr}>
              <Text style={[s.td, { width: "100%", textAlign: "center", color: C.muted, fontStyle: "italic" }]}>No itemised expenses.</Text>
            </View>
          ) : (
            (report.expenses ?? []).map((ex, i) => (
              <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? "transparent" : C.zebra }]}>
                <Text style={[s.td, { width: "8%", textAlign: "center" }]}>{i + 1}</Text>
                <Text style={[s.td, { width: "52%" }]}>{ex.description ?? "—"}</Text>
                <Text style={[s.td, { width: "20%" }, s.tdRight]}>{fmtINR(ex.amount ?? 0)}</Text>
                <Text style={[s.td, { width: "20%" }]}>
                  {ex.receiptUrl
                    ? <Link src={ex.receiptUrl} style={s.link}>view receipt</Link>
                    : <Text style={{ color: C.muted, fontStyle: "italic" }}>—</Text>}
                </Text>
              </View>
            ))
          )}
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total claimed</Text>
          <Text style={[s.totalValue, { width: 110 }]}>{fmtINR(total)}</Text>
        </View>

        {/* Approval pipeline */}
        <Text style={s.sectionTitle}>Approval timeline</Text>
        {stages.map((st, i) => (
          <View key={i} style={s.step}>
            <View style={[s.stepDot, { backgroundColor: st.color }]} />
            <View style={s.stepBody}>
              <Text style={s.stepLabel}>{st.label}</Text>
              <Text style={s.stepMeta}>
                {st.by?.name ? `${st.by.name}` : "—"}
                {st.at ? ` · ${fmtDateTime(st.at)}` : ""}
              </Text>
              {st.notes && (
                <View style={s.notesBox}>
                  <Text style={s.notesLabel}>Note</Text>
                  <Text style={s.notesText}>{st.notes}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {report.invoiceStatus === "rejected" && report.rejectionReason && (
          <View style={s.rejectionBox}>
            <Text style={s.rejectionLabel}>Rejection reason</Text>
            <Text style={s.rejectionText}>{report.rejectionReason}</Text>
          </View>
        )}

        {/* Signature block */}
        <View style={s.signRow}>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Submitter signature</Text>
          </View>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>HR signature</Text>
          </View>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Approver signature</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Janman People&apos;s Foundation · Jan Nyay Abhiyan</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
