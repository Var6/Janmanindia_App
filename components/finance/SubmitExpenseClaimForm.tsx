"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

type Project = { _id: string; code: string; name: string };
type Director = { _id: string; name: string; role: string };

type LineItem = {
  incurredAt: string;
  vendor: string;
  head: string;
  amount: string;
  receiptUrls: string[];
  uploading: boolean;
};

const DESIGNATIONS = [
  { value: "volunteer",  label: "Volunteer" },
  { value: "consultant", label: "Consultant" },
  { value: "director",   label: "Director" },
];

const OTHER = "__other__";

function emptyLine(): LineItem {
  return { incurredAt: "", vendor: "", head: "", amount: "", receiptUrls: [], uploading: false };
}

const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as const;

export default function SubmitExpenseClaimForm({
  applicantName,
  onCreated,
}: {
  applicantName: string;
  onCreated?: () => void;
}) {
  const t = useT();
  const [projects, setProjects] = useState<Project[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);

  const [designation, setDesignation] = useState("");
  const [applicationDate, setApplicationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState("");
  const [projectOther, setProjectOther] = useState("");
  const [approverId, setApproverId] = useState("");
  const [approverOther, setApproverOther] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
    fetch("/api/expense-claims/directors").then(r => r.json()).then(d => setDirectors(d.directors ?? [])).catch(() => {});
  }, []);

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  function setLine(i: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() { setLines(prev => [...prev, emptyLine()]); }
  function removeLine(i: number) { setLines(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)); }

  async function uploadDocs(i: number, files: FileList) {
    const line = lines[i];
    const room = 10 - line.receiptUrls.length;
    if (room <= 0) { alert(t("Up to 10 files per expense line.")); return; }
    setLine(i, { uploading: true });
    try {
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const file of picked) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) urls.push(data.url);
        else alert(data.error ?? "Upload failed");
      }
      setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, receiptUrls: [...l.receiptUrls, ...urls], uploading: false } : l)));
    } catch {
      setLine(i, { uploading: false });
    }
  }

  function removeDoc(i: number, url: string) {
    setLine(i, { receiptUrls: lines[i].receiptUrls.filter(u => u !== url) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setOk(false);
    if (!designation) { setError(t("Please choose a designation.")); return; }
    if (!projectId && !projectOther.trim()) { setError(t("Please choose a project.")); return; }
    if (!approverId && !approverOther.trim()) { setError(t("Please choose who approves this claim.")); return; }
    const cleanLines = lines
      .map(l => ({ ...l, head: l.head.trim(), amount: Number(l.amount) }))
      .filter(l => l.head || l.amount);
    if (cleanLines.length === 0) { setError(t("Add at least one expense line.")); return; }
    for (const [i, l] of cleanLines.entries()) {
      if (!l.head) { setError(t(`Line ${i + 1}: enter a head.`)); return; }
      if (!Number.isFinite(l.amount) || l.amount <= 0) { setError(t(`Line ${i + 1}: enter a valid amount.`)); return; }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation,
          applicationDate,
          projectId: projectId && projectId !== OTHER ? projectId : undefined,
          projectOther: projectId === OTHER ? projectOther : undefined,
          approverId: approverId && approverId !== OTHER ? approverId : undefined,
          approverOther: approverId === OTHER ? approverOther : undefined,
          lineItems: cleanLines.map(l => ({
            incurredAt: l.incurredAt || undefined,
            vendor: l.vendor || undefined,
            head: l.head,
            amount: l.amount,
            receiptUrls: l.receiptUrls,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }
      // reset
      setDesignation(""); setProjectId(""); setProjectOther("");
      setApproverId(""); setApproverOther("");
      setLines([emptyLine()]);
      setOk(true);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-5 space-y-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <h3 className="text-base font-bold text-(--text)">{t("Application for Expenditure")}</h3>
        <p className="text-[12px] text-(--muted) mt-0.5">
          {t("Fill the header, then add one row per expense. Routes to the director you pick → Finance pays.")}
        </p>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
      {ok && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--success-bg, #16351f)", color: "var(--success-text, #7ee2a8)" }}>{t("Submitted — it's now in the approver's queue.")}</p>}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Name")}</span>
          <input value={applicantName} readOnly
            className="w-full px-3 py-2 rounded-lg border text-sm opacity-80 cursor-not-allowed"
            style={inputStyle} />
        </label>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Designation")}</span>
          <select value={designation} onChange={e => setDesignation(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
            <option value="" disabled>{t("Select…")}</option>
            {DESIGNATIONS.map(d => <option key={d.value} value={d.value}>{t(d.label)}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Date")}</span>
          <input type="date" value={applicationDate} onChange={e => setApplicationDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
        </label>
        <label className="text-xs font-medium text-(--muted) space-y-1">
          <span>{t("Project")}</span>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
            <option value="" disabled>{t("Select…")}</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
            <option value={OTHER}>{t("Other…")}</option>
          </select>
        </label>
        {projectId === OTHER && (
          <input value={projectOther} onChange={e => setProjectOther(e.target.value)}
            placeholder={t("Project name")} className="w-full px-3 py-2 rounded-lg border text-sm sm:col-span-2" style={inputStyle} />
        )}
        <label className="text-xs font-medium text-(--muted) space-y-1 sm:col-span-2">
          <span>{t("Expense Approved By")}</span>
          <select value={approverId} onChange={e => setApproverId(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
            <option value="" disabled>{t("Select a director…")}</option>
            {directors.map(d => <option key={d._id} value={d._id}>{d.name}{d.role === "director" ? " (Director)" : ""}</option>)}
            <option value={OTHER}>{t("Other…")}</option>
          </select>
        </label>
        {approverId === OTHER && (
          <input value={approverOther} onChange={e => setApproverOther(e.target.value)}
            placeholder={t("Approver name")} className="w-full px-3 py-2 rounded-lg border text-sm sm:col-span-2" style={inputStyle} />
        )}
      </div>

      {/* ── Line items ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-(--text)">{t("Details of Expenses")}</h4>
          <span className="text-xs text-(--muted)">{t("Total")}: <b className="text-(--text)">₹{total.toLocaleString("en-IN")}</b></span>
        </div>

        {lines.map((line, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-(--muted)">{t("Expense")} #{i + 1}</span>
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(i)}
                  className="text-[12px] px-2 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--error-text)" }}>
                  {t("Remove")}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" value={line.incurredAt} onChange={e => setLine(i, { incurredAt: e.target.value })}
                className="px-3 py-2 rounded-lg border text-sm" style={inputStyle} aria-label={t("Date of Expense Incurred")} />
              <input value={line.vendor} onChange={e => setLine(i, { vendor: e.target.value })}
                placeholder={t("Name of the vendor")} className="px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
              <input value={line.head} onChange={e => setLine(i, { head: e.target.value })}
                placeholder={t("Head (e.g. Travel, Stay, Printing)")} className="px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
              <input type="number" min={1} step="0.01" value={line.amount} onChange={e => setLine(i, { amount: e.target.value })}
                placeholder={t("Amount (INR)")} className="px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  {line.uploading ? t("Uploading…") : `📎 ${t("Supporting Docs")}`}
                  <input type="file" multiple accept=".pdf,image/*,audio/*" className="hidden"
                    disabled={line.uploading || line.receiptUrls.length >= 10}
                    onChange={e => { if (e.target.files?.length) uploadDocs(i, e.target.files); e.target.value = ""; }} />
                </label>
                <span className="text-[11px] text-(--muted)">{line.receiptUrls.length}/10 · PDF, image or audio</span>
              </div>
              {line.receiptUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {line.receiptUrls.map((url, k) => (
                    <span key={url} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg" style={{ background: "var(--bg)", color: "var(--text)" }}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>📄 {t("File")} {k + 1}</a>
                      <button type="button" onClick={() => removeDoc(i, url)} className="text-(--muted)">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <button type="button" onClick={addLine}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text)", border: "1px dashed var(--border)" }}>
          + {t("Add another expense")}
        </button>
      </div>

      <button type="submit" disabled={busy}
        className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {busy ? t("Submitting…") : t("Submit Application")}
      </button>
    </form>
  );
}
