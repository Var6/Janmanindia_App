"use client";

import { useState, useEffect } from "react";

type Report = {
  _id: string;
  date: string;
  summary: string;
  hoursWorked: number;
  invoiceStatus: string;
  expenses: { description: string; amount: number }[];
};

const INV_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expenses, setExpenses] = useState([{ description: "", amount: "" }]);

  useEffect(() => {
    fetch("/api/eod-reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          date: fd.get("date"),
          summary: fd.get("summary"),
          hoursWorked: Number(fd.get("hoursWorked")),
          expenses: expenses.filter((ex) => ex.description && ex.amount).map((ex) => ({
            description: ex.description,
            amount: Number(ex.amount),
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
          <h1 className="text-2xl font-bold text-(text)">EOD Reports &amp; Invoices</h1>
          <p className="text-sm text-(muted) mt-1">Submit your daily work report and expense claims for HR review.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ Today's Report"}
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-(surface) rounded-2xl border border-(border) p-6 space-y-5">
          <h2 className="font-semibold text-(text)">End-of-Day Report</h2>
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Hours Worked <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="hoursWorked"
                required
                min="1"
                max="16"
                placeholder="8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">Summary of Work Done <span className="text-red-500">*</span></label>
            <textarea
              name="summary"
              required
              rows={4}
              placeholder="What did you work on today? Which tickets, cases, or tasks did you handle?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 resize-none placeholder:text-(muted)"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-(text)">Expenses (optional)</label>
              <button
                type="button"
                onClick={() => setExpenses([...expenses, { description: "", amount: "" }])}
                className="text-xs text-(accent) hover:underline"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {expenses.map((ex, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={ex.description}
                    onChange={(e) => setExpenses(expenses.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    placeholder="Description"
                    className="flex-1 px-3 py-2 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
                  />
                  <input
                    type="number"
                    value={ex.amount}
                    onChange={(e) => setExpenses(expenses.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                    placeholder="₹ Amount"
                    className="w-28 px-3 py-2 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-(muted)">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">No reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const s = INV_COLORS[r.invoiceStatus] ?? "bg-gray-100 text-gray-600";
            const total = r.expenses.reduce((sum, ex) => sum + ex.amount, 0);
            return (
              <div key={r._id} className="bg-(surface) rounded-2xl border border-(border) p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-(text)">
                      {new Date(r.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-xs text-(muted) mt-0.5">{r.hoursWorked} hours worked · {r.expenses.length} expense(s) · ₹{total}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${s}`}>
                    Invoice {r.invoiceStatus}
                  </span>
                </div>
                <p className="text-sm text-(muted) line-clamp-2">{r.summary}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
