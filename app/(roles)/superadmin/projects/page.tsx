"use client";

import { useEffect, useState } from "react";

type Manager = { _id: string; name: string; email?: string } | null;
type Allocation = { _id: string; source: string; amount: number; receivedAt?: string; notes?: string };
type Project = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "on_hold";
  startDate?: string;
  endDate?: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  manager?: Manager;
  allocations: Allocation[];
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: "var(--success-bg)",   text: "var(--success-text)" },
  completed: { bg: "var(--bg-secondary)", text: "var(--muted)" },
  on_hold:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [allocateOpen, setAllocateOpen] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      code: fd.get("code"),
      name: fd.get("name"),
      description: fd.get("description"),
      totalBudget: Number(fd.get("totalBudget") || 0),
      startDate: fd.get("startDate") || undefined,
      endDate: fd.get("endDate") || undefined,
      allocations: fd.get("source") && fd.get("amount") ? [{
        source: String(fd.get("source")),
        amount: Number(fd.get("amount")),
        notes: String(fd.get("allocationNotes") ?? ""),
      }] : [],
    };
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      setOpen(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function addAllocation(projectId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addAllocation: {
          source: fd.get("source"),
          amount: Number(fd.get("amount")),
          notes: fd.get("notes"),
          receivedAt: fd.get("receivedAt") || undefined,
        },
      }),
    });
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setAllocateOpen(null);
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Projects & Funds</h1>
          <p className="text-sm text-(--muted) mt-1 max-w-3xl">
            Create projects, allocate donor funds, and watch spend in real time. Each project's 3-letter code matches its
            employee-ID prefix (e.g. JNA → JPF/JNA/26/01). Expense approval drains the budget; rejections don't.
          </p>
        </div>
        <button onClick={() => setOpen(s => !s)}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: open ? "var(--bg-secondary)" : "var(--accent)", color: open ? "var(--muted)" : "var(--accent-contrast)" }}>
          {open ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {open && (
        <form onSubmit={createProject} className="rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="code" required maxLength={3} pattern="[A-Za-z]{3}" placeholder="Code (3 letters, e.g. JNA)"
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, ""); }}
              className="px-3 py-2 rounded-lg border text-sm uppercase font-mono tracking-widest"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="name" required placeholder="Project name (e.g. Janman Bihar)"
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <textarea name="description" rows={2} placeholder="What is this project about?"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="totalBudget" type="number" min={0} placeholder="Total budget (₹)"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="startDate" type="date" placeholder="Start"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="endDate" type="date" placeholder="End"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
            <legend className="text-xs font-semibold text-(--text) px-1">First fund allocation (optional)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input name="source" placeholder="Donor / Grant"
                className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              <input name="amount" type="number" min={0} placeholder="Amount (₹)"
                className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              <input name="allocationNotes" placeholder="Notes (optional)"
                className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            </div>
          </fieldset>
          <button type="submit" disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {busy ? "Creating…" : "Create Project"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-(--muted)">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-(--muted)">No projects yet. Create one above to start tracking funds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => {
            const stat = STATUS_STYLE[p.status] ?? STATUS_STYLE.active;
            const pct = p.totalBudget > 0 ? Math.min(100, Math.round((p.spent / p.totalBudget) * 100)) : 0;
            const overrun = p.spent > p.totalBudget && p.totalBudget > 0;
            return (
              <article key={p._id} className="rounded-2xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{p.code}</span>
                      <p className="text-base font-bold text-(--text)">{p.name}</p>
                    </div>
                    {p.description && <p className="text-xs text-(--muted) mt-1">{p.description}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                    style={{ background: stat.bg, color: stat.text }}>{p.status.replace("_", " ")}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat label="Total" value={`₹${p.totalBudget.toLocaleString("en-IN")}`} />
                  <Stat label="Spent" value={`₹${p.spent.toLocaleString("en-IN")}`} color={overrun ? "var(--error-text)" : "var(--text)"} />
                  <Stat label="Remaining" value={`₹${p.remaining.toLocaleString("en-IN")}`} color="var(--success-text)" />
                </div>

                <div className="rounded-full h-2 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                  <div className="h-full transition-all" style={{ width: `${pct}%`, background: overrun ? "var(--error)" : "var(--accent)" }} />
                </div>
                <p className="text-[11px] text-(--muted)">
                  {pct}% utilised{overrun && " — overrunning budget"}
                </p>

                {p.allocations.length > 0 && (
                  <details className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-(--muted) uppercase tracking-wide">
                      Allocations ({p.allocations.length})
                    </summary>
                    <ul className="px-3 pb-3 space-y-1">
                      {p.allocations.map(a => (
                        <li key={a._id} className="text-xs flex items-center justify-between gap-3">
                          <span className="text-(--text)">{a.source}</span>
                          <span className="text-(--muted)">₹{a.amount.toLocaleString("en-IN")}{a.receivedAt && ` · ${new Date(a.receivedAt).toLocaleDateString("en-IN")}`}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {allocateOpen === p._id ? (
                  <form onSubmit={(e) => addAllocation(p._id, e)} className="rounded-xl border p-3 space-y-2"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <p className="text-xs font-semibold text-(--text)">Add a fund allocation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input name="source" required placeholder="Donor"
                        className="px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                      <input name="amount" required type="number" min={1} placeholder="Amount (₹)"
                        className="px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                    </div>
                    <input name="notes" placeholder="Notes"
                      className="w-full px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                    <div className="flex items-center gap-2">
                      <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Save</button>
                      <button type="button" onClick={() => setAllocateOpen(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setAllocateOpen(p._id)}
                    className="w-full text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                    + Add allocation (donor receipt)
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-2 text-center" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] uppercase tracking-wide text-(--muted)">{label}</p>
      <p className="text-sm font-bold" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  );
}
