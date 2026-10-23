"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReportTemplate, ReportSection, ReportColumn } from "@/lib/monthly-report-templates";
import { HEADER_FIELDS } from "@/lib/monthly-report-templates";

export interface MonthlyReportForPdf {
  type: string;
  submitterName?: string;
  submittedBy?: { name?: string; email?: string; employeeId?: string } | null;
  month: string;
  submissionDate?: string | Date;
  header?: Record<string, string>;
  sections?: Record<string, unknown>;
}

const C = {
  text: "#0f172a", text2: "#334155", muted: "#64748b",
  border: "#94a3b8", borderLight: "#cbd5e1", zebra: "#f1f5f9",
  navy: "#1e3a5f", accent: "#7c2d12",
};

const s = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24, fontSize: 8, color: C.text, fontFamily: "Helvetica" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  logo: { height: 38, width: 38, marginRight: 10, objectFit: "contain" },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.navy },
  program: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.accent, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.navy, marginVertical: 6 },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.6, borderColor: C.border, borderStyle: "solid", marginBottom: 8 },
  metaCell: { width: "25%", padding: 5, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  metaLabel: { fontSize: 6.5, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  metaValue: { fontSize: 9, color: C.text, marginTop: 2 },

  sectionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 10, marginBottom: 3 },
  sectionNote: { fontSize: 7, color: C.muted, marginBottom: 3, fontStyle: "italic" },

  table: { borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  tr: { flexDirection: "row" },
  th: { backgroundColor: C.navy, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 7, padding: 4, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid" },
  td: { fontSize: 7.5, padding: 4, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.border, borderStyle: "solid", color: C.text2 },

  noteBox: { marginTop: 4, borderWidth: 0.6, borderColor: C.borderLight, borderStyle: "solid", padding: 5, backgroundColor: C.zebra },
  noteLabel: { fontSize: 6.5, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  noteText: { fontSize: 8, color: C.text2, marginTop: 2 },
  empty: { fontSize: 7.5, color: C.muted, fontStyle: "italic", padding: 4 },

  footer: { position: "absolute", bottom: 14, left: 24, right: 24, paddingTop: 5, borderTopWidth: 0.4, borderColor: C.borderLight, borderStyle: "solid", flexDirection: "row", justifyContent: "space-between", fontSize: 6.5, color: C.muted },
});

function fmtDate(d?: string | Date) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMonth(m: string) {
  const [y, mo] = (m || "").split("-").map(Number);
  return Number.isFinite(y) && Number.isFinite(mo) ? new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : m;
}

/** Normalised column widths (percent), reserving a small Sr/label column. */
function widths(cols: ReportColumn[], leadPct: number): number[] {
  const totalW = cols.reduce((a, c) => a + c.w, 0) || 1;
  return cols.map((c) => (c.w / totalW) * (100 - leadPct));
}

function DynamicTable({ sec, rows }: { sec: ReportSection; rows: Record<string, string>[] }) {
  const w = widths(sec.columns, 5);
  const filled = (rows ?? []).filter((r) => r && Object.values(r).some((v) => String(v ?? "").trim() !== ""));
  return (
    <View style={s.table}>
      <View style={s.tr}>
        <Text style={[s.th, { width: "5%" }]}>#</Text>
        {sec.columns.map((c, i) => <Text key={c.key} style={[s.th, { width: `${w[i]}%` }]}>{c.label}</Text>)}
      </View>
      {filled.length === 0 ? (
        <View style={s.tr}><Text style={[s.td, { width: "100%" }, s.empty]}>Nil / not applicable this month.</Text></View>
      ) : filled.map((row, ri) => (
        <View key={ri} style={[s.tr, { backgroundColor: ri % 2 ? C.zebra : "transparent" }]}>
          <Text style={[s.td, { width: "5%", textAlign: "center" }]}>{ri + 1}</Text>
          {sec.columns.map((c, i) => <Text key={c.key} style={[s.td, { width: `${w[i]}%` }]}>{row[c.key] || "—"}</Text>)}
        </View>
      ))}
    </View>
  );
}

function FixedTable({ sec, data }: { sec: ReportSection; data: Record<string, Record<string, string>> }) {
  const w = widths(sec.columns, 18);
  return (
    <View style={s.table}>
      <View style={s.tr}>
        <Text style={[s.th, { width: "18%" }]}>Activity</Text>
        {sec.columns.map((c, i) => <Text key={c.key} style={[s.th, { width: `${w[i]}%` }]}>{c.label}</Text>)}
      </View>
      {(sec.fixedRows ?? []).map((r, ri) => (
        <View key={r.key} style={[s.tr, { backgroundColor: ri % 2 ? C.zebra : "transparent" }]}>
          <Text style={[s.td, { width: "18%", fontFamily: "Helvetica-Bold", color: C.text }]}>{r.label}</Text>
          {sec.columns.map((c, i) => <Text key={c.key} style={[s.td, { width: `${w[i]}%` }]}>{data?.[r.key]?.[c.key] || "—"}</Text>)}
        </View>
      ))}
    </View>
  );
}

export default function MonthlyReportPdfDocument({
  report, template, logoDataUri,
}: {
  report: MonthlyReportForPdf;
  template: ReportTemplate;
  logoDataUri?: string;
}) {
  const header = report.header ?? {};
  const sections = (report.sections ?? {}) as Record<string, unknown>;
  const name = report.submitterName || report.submittedBy?.name || "—";

  const meta: { label: string; value: string }[] = [
    { label: template.nameLabel, value: name },
    { label: "Month", value: fmtMonth(report.month) },
    { label: "Submission Date", value: fmtDate(report.submissionDate) },
    ...HEADER_FIELDS.map((f) => ({ label: f.label, value: header[f.key] || "—" })),
  ];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.brandRow}>
          {logoDataUri ? <Image src={logoDataUri} style={s.logo} /> : null}
          <View>
            <Text style={s.brand}>Janman People&apos;s Foundation</Text>
            <Text style={s.program}>{template.program}</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* Header meta */}
        <View style={s.metaGrid}>
          {meta.map((m, i) => (
            <View key={i} style={s.metaCell}>
              <Text style={s.metaLabel}>{m.label}</Text>
              <Text style={s.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        {template.sections.map((sec) => (
          <View key={sec.id} wrap={false}>
            <Text style={s.sectionTitle}>{sec.marker}. {sec.title}</Text>
            {sec.note ? <Text style={s.sectionNote}>{sec.note}</Text> : null}
            {sec.fixedRows
              ? <FixedTable sec={sec} data={(sections[sec.id] as Record<string, Record<string, string>>) ?? {}} />
              : <DynamicTable sec={sec} rows={(sections[sec.id] as Record<string, string>[]) ?? []} />}
            {sec.noteField && (sections[`${sec.id}__note`] as string)?.trim() ? (
              <View style={s.noteBox}>
                <Text style={s.noteLabel}>{sec.noteField.label}</Text>
                <Text style={s.noteText}>{sections[`${sec.id}__note`] as string}</Text>
              </View>
            ) : null}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>Janman People&apos;s Foundation · {template.program}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
