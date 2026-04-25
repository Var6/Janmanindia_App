"use client";

import { useEffect, useRef, useState } from "react";

type Project = { _id: string; code: string; name: string; remaining?: number };

const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: "admin",       label: "Admin / Office",   hint: "stationery, office equipment, AC repair, table & chair, electricals" },
  { value: "training",    label: "Training",         hint: "venue, materials, trainer fees, refreshments" },
  { value: "exploration", label: "Exploration",      hint: "field visits, scoping a new district / village" },
  { value: "staff",       label: "Staff Cost",       hint: "stipends, payroll, advances" },
  { value: "travel",      label: "Travel",           hint: "court travel, fieldwork transport" },
  { value: "legal",       label: "Legal / Court",    hint: "court fees, bar membership, document filing" },
  { value: "other",       label: "Other",            hint: "anything that doesn't fit above" },
];

interface Props {
  /** Restrict the category dropdown — useful for the administrator (admin only). */
  restrictCategories?: string[];
  onCreated?: () => void;
}

export default function SubmitExpenseForm({ restrictCategories, onCreated }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? []));
  }, []);

  const visibleCats = restrictCategories
    ? CATEGORIES.filter(c => restrictCategories.includes(c.value))
    : CATEGORIES;

  async function uploadReceipt(file: File) {
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setReceiptUrl(data.url);
      else alert(data.error ?? "Upload failed");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      projectId: fd.get("projectId"),
      category: fd.get("category"),
      title: fd.get("title"),
      description: fd.get("description"),
      amount: Number(fd.get("amount")),
      vendor: fd.get("vendor"),
      incurredAt: fd.get("incurredAt") || undefined,
      receiptUrl: receiptUrl || undefined,
    };
    try {
      const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      setReceiptUrl("");
      setOpen(false);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
        + Submit Expense
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-(--text)">Submit an expense</h3>
        <button type="button" onClick={() => { setOpen(false); setReceiptUrl(""); setError(""); }}
          className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel</button>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select name="projectId" required defaultValue=""
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          <option value="" disabled>Project…</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>
              {p.code} — {p.name}{typeof p.remaining === "number" ? ` · ₹${p.remaining.toLocaleString("en-IN")} left` : ""}
            </option>
          ))}
        </select>
        <select name="category" required defaultValue=""
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          <option value="" disabled>Category…</option>
          {visibleCats.map(c => <option key={c.value} value={c.value} title={c.hint}>{c.label}</option>)}
        </select>
      </div>

      <input name="title" required maxLength={200} placeholder="Short title (e.g. AC repair – Patna office)"
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      <textarea name="description" rows={2} placeholder="Describe what you bought / did"
        className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input name="amount" required type="number" min={1} step="0.01" placeholder="Amount (₹)"
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <input name="vendor" placeholder="Vendor (optional)"
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <input name="incurredAt" type="date" placeholder="Date incurred"
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </div>

      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); e.target.value = ""; }} />
        {receiptUrl ? (
          <div className="flex items-center gap-2 text-xs">
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>📎 receipt attached</a>
            <button type="button" onClick={() => setReceiptUrl("")}
              className="px-2 py-0.5 rounded text-[11px]" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Remove</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingReceipt}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            {uploadingReceipt ? "Uploading…" : "📎 Attach receipt"}
          </button>
        )}
      </div>

      <button type="submit" disabled={busy}
        className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {busy ? "Submitting…" : "Submit for Approval"}
      </button>
      <p className="text-[11px] text-(--muted)">
        Routing: HR verifies → Director approves → Finance marks it paid (deducts from project budget).
      </p>
    </form>
  );
}
