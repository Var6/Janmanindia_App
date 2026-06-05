"use client";

import { useT } from "@/components/i18n/LanguageProvider";

/** Generic "download as Excel" (CSV) button. Server pages pass already-shaped
 *  rows; the click builds a UTF-8 BOM CSV that Excel opens with Hindi intact. */
export default function ExportCasesButton({
  filename, headers, rows, label,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  const t = useT();

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={exportCsv} disabled={rows.length === 0}
      className="px-3 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 hover:border-(--accent)"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
      title={t("Export to Excel")}>
      ⬇ {label ?? t("Excel")}
    </button>
  );
}
