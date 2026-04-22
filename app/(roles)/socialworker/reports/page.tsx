"use client";

import { useState, useEffect, useRef } from "react";

type Expense = {
  description: string;
  amount: string;
  receiptUrl?: string;
  uploading?: boolean;
};

type Report = {
  _id: string;
  date: string;
  summary: string;
  hoursWorked: number;
  invoiceStatus: string;
  expenses: { description: string; amount: number; receiptUrl?: string }[];
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:  { bg: "var(--warning-bg)",  text: "var(--warning-text)"  },
  approved: { bg: "var(--success-bg)",  text: "var(--success-text)"  },
  rejected: { bg: "var(--error-bg)",    text: "var(--error-text)"    },
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v8M5 5l3-3 3 3"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M1 5a1 1 0 011-1h1.5l1-2h5l1 2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5z"/>
      <circle cx="8" cy="8.5" r="2.2"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
      <path d="M3 3l10 10M13 3L3 13"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

export default function ReportsPage() {
  const [reports, setReports]     = useState<Report[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [expenses, setExpenses]   = useState<Expense[]>([{ description: "", amount: "" }]);
  const fileInputRefs             = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/eod-reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateExpense(i: number, patch: Partial<Expense>) {
    setExpenses((prev) => prev.map((ex, j) => j === i ? { ...ex, ...patch } : ex));
  }

  async function uploadReceipt(i: number, file: File) {
    updateExpense(i, { uploading: true });
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        updateExpense(i, { receiptUrl: data.url, uploading: false });
      } else {
        alert(data.error ?? "Upload failed");
        updateExpense(i, { uploading: false });
      }
    } catch {
      alert("Upload failed — network error");
      updateExpense(i, { uploading: false });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/eod-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:        fd.get("date"),
          summary:     fd.get("summary"),
          hoursWorked: Number(fd.get("hoursWorked")),
          expenses: expenses
            .filter((ex) => ex.description && ex.amount)
            .map((ex) => ({
              description: ex.description,
              amount:      Number(ex.amount),
              receiptUrl:  ex.receiptUrl,
            })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit report.");
      } else {
        const d = await res.json();
        setReports((prev) => [d.report, ...prev]);
        setSuccess("EOD report submitted successfully.");
        setShowForm(false);
        setExpenses([{ description: "", amount: "" }]);
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">EOD Reports &amp; Invoices</h1>
          <p className="text-sm text-(--muted) mt-1">Submit your daily work report and expense claims for HR review.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          {showForm ? "Cancel" : "+ Today's Report"}
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl text-sm font-medium"
          style={{ background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid color-mix(in srgb,var(--success) 25%,transparent)" }}>
          ✓ {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border p-6 space-y-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="font-semibold text-(--text)">End-of-Day Report</h2>

          {error && (
            <div className="p-3 rounded-lg text-sm"
              style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">
                Date <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input type="date" name="date" required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">
                Hours Worked <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input type="number" name="hoursWorked" required min="1" max="16" placeholder="8"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              Summary of Work Done <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <textarea name="summary" required rows={4}
              placeholder="What did you work on today? Which tickets, cases, or tasks did you handle?"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-(--text)">Expenses <span className="text-(--muted) font-normal">(optional)</span></label>
              <button type="button"
                onClick={() => setExpenses([...expenses, { description: "", amount: "" }])}
                className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
                + Add line
              </button>
            </div>

            <div className="space-y-3">
              {expenses.map((ex, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2"
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="flex gap-2">
                    <input
                      value={ex.description}
                      onChange={(e) => updateExpense(i, { description: e.target.value })}
                      placeholder="Expense description"
                      className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <input
                      type="number"
                      value={ex.amount}
                      onChange={(e) => updateExpense(i, { amount: e.target.value })}
                      placeholder="₹ Amount"
                      className="w-28 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    {expenses.length > 1 && (
                      <button type="button"
                        onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg border transition-colors hover:bg-(--error-bg)"
                        style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                        <XIcon />
                      </button>
                    )}
                  </div>

                  {/* Receipt upload row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={(el) => { fileInputRefs.current[i] = el; }}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadReceipt(i, file);
                        e.target.value = "";
                      }}
                    />

                    {ex.receiptUrl ? (
                      <div className="flex items-center gap-2 flex-1">
                        <a href={ex.receiptUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline"
                          style={{ color: "var(--info)" }}>
                          <img src={ex.receiptUrl} alt="receipt" className="w-7 h-7 rounded object-cover border" style={{ borderColor: "var(--border)" }} />
                          Receipt attached
                        </a>
                        <button type="button"
                          onClick={() => updateExpense(i, { receiptUrl: undefined })}
                          className="text-xs hover:underline" style={{ color: "var(--error)" }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button type="button"
                        disabled={ex.uploading}
                        onClick={() => fileInputRefs.current[i]?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}>
                        {ex.uploading ? <Spinner /> : <CameraIcon />}
                        {ex.uploading ? "Uploading…" : "Attach receipt photo"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-(--muted)">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-(--muted)">No reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const st    = STATUS_STYLE[r.invoiceStatus] ?? STATUS_STYLE.pending;
            const total = r.expenses.reduce((sum, ex) => sum + ex.amount, 0);
            return (
              <div key={r._id} className="rounded-2xl border p-5"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-xs)" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-(--text)">
                      {new Date(r.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {r.hoursWorked} hrs worked · {r.expenses.length} expense{r.expenses.length !== 1 ? "s" : ""} · ₹{total.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                    style={{ background: st.bg, color: st.text }}>
                    Invoice {r.invoiceStatus}
                  </span>
                </div>
                <p className="text-sm text-(--muted) line-clamp-2 mb-3">{r.summary}</p>

                {r.expenses.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1.5" style={{ borderColor: "var(--border)" }}>
                    {r.expenses.map((ex, ei) => (
                      <div key={ei} className="flex items-center justify-between text-xs">
                        <span className="text-(--text-2)">{ex.description}</span>
                        <div className="flex items-center gap-2">
                          {ex.receiptUrl && (
                            <a href={ex.receiptUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline" style={{ color: "var(--info)" }}>
                              <UploadIcon />
                              receipt
                            </a>
                          )}
                          <span className="font-medium text-(--text)">₹{ex.amount.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
