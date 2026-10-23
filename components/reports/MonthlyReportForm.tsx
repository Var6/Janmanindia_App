"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import {
  type ReportTemplate, type ReportSection, type ReportColumn, HEADER_FIELDS,
} from "@/lib/monthly-report-templates";

export interface MonthlyReportData {
  id?: string;
  month: string;
  submissionDate?: string;
  header: Record<string, string>;
  sections: Record<string, unknown>;
}

const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as const;
const fieldCls = "w-full px-3 py-2 rounded-lg border text-sm";

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function emptyRow(cols: ReportColumn[]): Record<string, string> {
  return Object.fromEntries(cols.map((c) => [c.key, ""]));
}

function Field({ col, value, onChange }: { col: ReportColumn; value: string; onChange: (v: string) => void }) {
  const t = useT();
  if (col.type === "longtext") {
    return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={col.hint ? t(col.hint) : ""} className={`${fieldCls} resize-y`} style={inputStyle} />;
  }
  if (col.type === "yesno") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} style={inputStyle}>
        <option value="">—</option>
        <option value="Yes">{t("Yes")}</option>
        <option value="No">{t("No")}</option>
      </select>
    );
  }
  const type = col.type === "number" ? "number" : col.type === "date" ? "date" : col.type === "tel" ? "tel" : "text";
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
    placeholder={col.hint ? t(col.hint) : ""} className={fieldCls} style={inputStyle} />;
}

export default function MonthlyReportForm({
  template, currentUserName, initial, onSaved,
}: {
  template: ReportTemplate;
  currentUserName: string;
  initial?: MonthlyReportData | null;
  onSaved?: () => void;
}) {
  const t = useT();

  const [month, setMonth] = useState(initial?.month ?? thisMonth());
  const [submissionDate, setSubmissionDate] = useState(
    initial?.submissionDate ? initial.submissionDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [header, setHeader] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of HEADER_FIELDS) base[f.key] = (initial?.header?.[f.key] as string) ?? "";
    return base;
  });

  // sections state: dynamic → array of rows; fixed → object keyed by row;
  // note fields stored as sections["<id>__note"].
  const [sections, setSections] = useState<Record<string, unknown>>(() => {
    const init = (initial?.sections ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const sec of template.sections) {
      if (sec.fixedRows) {
        const obj = (init[sec.id] as Record<string, Record<string, string>>) ?? {};
        out[sec.id] = Object.fromEntries(sec.fixedRows.map((r) => [r.key, { ...emptyRow(sec.columns), ...(obj[r.key] ?? {}) }]));
      } else {
        const rows = (init[sec.id] as Record<string, string>[]) ?? [];
        out[sec.id] = rows.length ? rows.map((r) => ({ ...emptyRow(sec.columns), ...r })) : [emptyRow(sec.columns)];
      }
      if (sec.noteField) out[`${sec.id}__note`] = (init[`${sec.id}__note`] as string) ?? "";
    }
    return out;
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const editing = Boolean(initial?.id);

  function setDynRow(secId: string, i: number, key: string, val: string) {
    setSections((prev) => {
      const rows = [...(prev[secId] as Record<string, string>[])];
      rows[i] = { ...rows[i], [key]: val };
      return { ...prev, [secId]: rows };
    });
  }
  function addRow(sec: ReportSection) {
    setSections((prev) => ({ ...prev, [sec.id]: [...(prev[sec.id] as Record<string, string>[]), emptyRow(sec.columns)] }));
  }
  function removeRow(secId: string, i: number) {
    setSections((prev) => {
      const rows = prev[secId] as Record<string, string>[];
      return { ...prev, [secId]: rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows };
    });
  }
  function setFixedCell(secId: string, rowKey: string, key: string, val: string) {
    setSections((prev) => {
      const obj = { ...(prev[secId] as Record<string, Record<string, string>>) };
      obj[rowKey] = { ...obj[rowKey], [key]: val };
      return { ...prev, [secId]: obj };
    });
  }
  function setNote(secId: string, val: string) {
    setSections((prev) => ({ ...prev, [`${secId}__note`]: val }));
  }

  // Strip fully-empty dynamic rows before saving.
  function cleanedSections(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const sec of template.sections) {
      if (sec.fixedRows) {
        out[sec.id] = sections[sec.id];
      } else {
        const rows = (sections[sec.id] as Record<string, string>[]).filter((r) =>
          Object.values(r).some((v) => String(v ?? "").trim() !== "")
        );
        out[sec.id] = rows;
      }
      if (sec.noteField) out[`${sec.id}__note`] = sections[`${sec.id}__note`] ?? "";
    }
    return out;
  }

  async function save() {
    setError(""); setOk(false);
    if (!/^\d{4}-\d{2}$/.test(month)) { setError(t("Please choose a reporting month.")); return; }
    setBusy(true);
    try {
      const payload = { month, submissionDate, header, sections: cleanedSections() };
      const res = await fetch(
        editing ? `/api/monthly-reports/${initial!.id}` : "/api/monthly-reports",
        { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? t("Failed to save."));
        return;
      }
      setOk(true);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return Number.isFinite(y) && Number.isFinite(m)
      ? new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : month;
  }, [month]);

  return (
    <div className="space-y-5">
      {/* Title block */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-lg font-bold text-(--text)">Janman People&apos;s Foundation</h2>
        <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{t(template.program)}</p>
        <p className="text-xs text-(--muted) mt-1">{editing ? t("Editing") : t("New report")} · {monthLabel}</p>
      </div>

      {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
      {ok && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "var(--success-bg, #16351f)", color: "var(--success-text, #7ee2a8)" }}>{t("Saved.")}</p>}

      {/* Header */}
      <div className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t(template.nameLabel)}</span>
          <input value={currentUserName} readOnly className={`${fieldCls} opacity-80 cursor-not-allowed`} style={inputStyle} />
        </label>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Month")}</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={fieldCls} style={inputStyle} />
        </label>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Submission Date")}</span>
          <input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} className={fieldCls} style={inputStyle} />
        </label>
        {HEADER_FIELDS.map((f) => (
          <label key={f.key} className="text-xs font-medium text-(--muted) space-y-1">
            <span>{t(f.label)}</span>
            <input type={f.type === "tel" ? "tel" : "text"} value={header[f.key] ?? ""}
              onChange={(e) => setHeader((h) => ({ ...h, [f.key]: e.target.value }))} className={fieldCls} style={inputStyle} />
          </label>
        ))}
      </div>

      {/* Sections */}
      {template.sections.map((sec) => (
        <div key={sec.id} className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div>
            <h3 className="text-sm font-bold text-(--text)">
              <span style={{ color: "var(--accent)" }}>{sec.marker}.</span> {t(sec.title)}
            </h3>
            {sec.note && <p className="text-xs text-(--muted) mt-0.5">{t(sec.note)}</p>}
          </div>

          {sec.fixedRows ? (
            // Part C — fixed category rows
            <div className="space-y-3">
              {sec.fixedRows.map((r) => (
                <div key={r.key} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <p className="text-xs font-semibold text-(--text)">{t(r.label)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.columns.map((col) => (
                      <label key={col.key} className="text-[11px] text-(--muted) space-y-1">
                        <span>{t(col.label)}</span>
                        <Field col={col} value={((sections[sec.id] as Record<string, Record<string, string>>)[r.key]?.[col.key]) ?? ""}
                          onChange={(v) => setFixedCell(sec.id, r.key, col.key, v)} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Dynamic table — add/remove rows
            <div className="space-y-3">
              {(sections[sec.id] as Record<string, string>[]).map((row, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-(--muted)">{sec.marker}{i + 1}</span>
                    {(sections[sec.id] as unknown[]).length > 1 && (
                      <button type="button" onClick={() => removeRow(sec.id, i)}
                        className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--error-text)" }}>
                        {t("Remove")}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.columns.map((col) => (
                      <label key={col.key} className={`text-[11px] text-(--muted) space-y-1 ${col.type === "longtext" ? "sm:col-span-2" : ""}`}>
                        <span>{t(col.label)}{col.hint ? <span className="opacity-70"> · {t(col.hint)}</span> : null}</span>
                        <Field col={col} value={row[col.key] ?? ""} onChange={(v) => setDynRow(sec.id, i, col.key, v)} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow(sec)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text)", border: "1px dashed var(--border)" }}>
                + {t("Add row")}
              </button>
            </div>
          )}

          {sec.noteField && (
            <label className="text-xs text-(--muted) space-y-1 block">
              <span>{t(sec.noteField.label)}</span>
              <textarea rows={2} value={(sections[`${sec.id}__note`] as string) ?? ""} onChange={(e) => setNote(sec.id, e.target.value)}
                className={`${fieldCls} resize-y`} style={inputStyle} />
            </label>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy}
          className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {busy ? t("Saving…") : editing ? t("Update Report") : t("Submit Report")}
        </button>
        <p className="text-[11px] text-(--muted)">{t("Please enclose relevant documents (orders, fact-findings, clippings) by email.")}</p>
      </div>
    </div>
  );
}
