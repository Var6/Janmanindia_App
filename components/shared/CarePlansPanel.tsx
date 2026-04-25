"use client";

import { useEffect, useState } from "react";

type Goal = { _id: string; description: string; targetDate?: string; completed: boolean; completedAt?: string };
type Session = { _id: string; date: string; type: string; notes: string; conductedBy?: { _id: string; name: string } };
type Plan = {
  _id: string;
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "on_hold" | "completed" | "cancelled";
  summary: string;
  referredTo?: string;
  confidentialNotes?: string;
  goals: Goal[];
  sessions: Session[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { _id: string; name: string };
  community?: { _id: string; name: string };
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "counselling",     label: "Counselling" },
  { value: "medical",         label: "Medical" },
  { value: "shelter",         label: "Shelter" },
  { value: "education",       label: "Education" },
  { value: "rehabilitation",  label: "Rehabilitation" },
  { value: "legal_support",   label: "Legal Support" },
  { value: "financial_aid",   label: "Financial Aid" },
  { value: "other",           label: "Other" },
];

const PRIO_STYLE: Record<Plan["priority"], { bg: string; text: string }> = {
  low:      { bg: "var(--bg-secondary)", text: "var(--muted)" },
  medium:   { bg: "var(--info-bg)",      text: "var(--info-text)" },
  high:     { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  critical: { bg: "var(--error-bg)",     text: "var(--error-text)" },
};

const STATUS_STYLE: Record<Plan["status"], { bg: string; text: string }> = {
  active:    { bg: "var(--success-bg)",   text: "var(--success-text)" },
  on_hold:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  completed: { bg: "var(--bg-secondary)", text: "var(--muted)" },
  cancelled: { bg: "var(--error-bg)",     text: "var(--error-text)" },
};

interface Props {
  caseId: string;
  communityId: string;
  canManage: boolean;
}

export default function CarePlansPanel({ caseId, communityId, canManage }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/care-plans?caseId=${caseId}`);
      const data = await res.json();
      setPlans(data.plans ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  async function createPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      community: communityId,
      case: caseId,
      title: fd.get("title"),
      category: fd.get("category"),
      priority: fd.get("priority"),
      summary: fd.get("summary"),
      referredTo: fd.get("referredTo") || undefined,
      confidentialNotes: fd.get("confidentialNotes") || undefined,
      goals: String(fd.get("goals") ?? "").split("\n").map(s => s.trim()).filter(Boolean).map(d => ({ description: d })),
    };
    try {
      const res = await fetch("/api/care-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create plan"); return; }
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function patchPlan(id: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/care-plans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-(--text)">Individual Care Plans</h2>
          <p className="text-xs text-(--muted) mt-0.5">Counselling, shelter, medical, and rehabilitation tracking for this person.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(s => !s)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: showForm ? "var(--bg-secondary)" : "var(--accent)", color: showForm ? "var(--muted)" : "var(--accent-contrast)" }}>
            {showForm ? "Cancel" : "+ New Care Plan"}
          </button>
        )}
      </header>

      {showForm && canManage && (
        <form onSubmit={createPlan} className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="title" required maxLength={200} placeholder="Plan title (e.g. POCSO trauma counselling)"
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <select name="category" required defaultValue="counselling"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select name="priority" defaultValue="medium"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="critical">Critical priority</option>
            </select>
            <input name="referredTo" placeholder="Referred to (e.g. Dr. Rao, Dist. Hospital)"
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <textarea name="summary" required rows={2} placeholder="Why this plan exists — context, vulnerabilities, what support is needed."
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <textarea name="goals" rows={3} placeholder="Goals — one per line (e.g. Weekly counselling for 8 weeks; Enroll in school by June)"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <textarea name="confidentialNotes" rows={2} placeholder="Confidential notes (visible only to social workers)"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button type="submit" disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {busy ? "Creating…" : "Create Plan"}
          </button>
        </form>
      )}

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {loading ? (
          <p className="px-5 py-6 text-sm text-(--muted)">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="px-5 py-6 text-sm text-(--muted)">
            No care plans yet. {canManage ? "Click + New Care Plan to start one — useful for survivors needing counselling, shelter, or medical follow-up." : ""}
          </p>
        ) : (
          plans.map(p => <CarePlanCard key={p._id} plan={p} canManage={canManage} onPatch={patchPlan} />)
        )}
      </div>
    </section>
  );
}

function CarePlanCard({ plan, canManage, onPatch }: { plan: Plan; canManage: boolean; onPatch: (id: string, payload: Record<string, unknown>) => void }) {
  const [openSession, setOpenSession] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const prio = PRIO_STYLE[plan.priority];
  const stat = STATUS_STYLE[plan.status];

  return (
    <article className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold text-(--text)">{plan.title}</p>
          <p className="text-xs text-(--muted) mt-0.5 capitalize">
            {plan.category.replace(/_/g, " ")} · created by {plan.createdBy?.name ?? "—"} · {new Date(plan.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: prio.bg, color: prio.text }}>{plan.priority}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: stat.bg, color: stat.text }}>{plan.status.replace("_", " ")}</span>
        </div>
      </div>

      <p className="text-sm text-(--text) leading-relaxed">{plan.summary}</p>

      {plan.referredTo && (
        <p className="text-xs text-(--muted)">Referred to: <span className="font-medium text-(--text)">{plan.referredTo}</span></p>
      )}

      {plan.goals.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-2">Goals ({plan.goals.filter(g => g.completed).length}/{plan.goals.length})</p>
          <ul className="space-y-1.5">
            {plan.goals.map(g => (
              <li key={g._id} className="flex items-start gap-2 text-xs text-(--text)">
                <button
                  type="button"
                  disabled={!canManage || g.completed}
                  onClick={() => onPatch(plan._id, { completeGoal: g._id })}
                  className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 disabled:cursor-default"
                  style={{ background: g.completed ? "var(--success)" : "transparent", borderColor: g.completed ? "var(--success)" : "var(--border)" }}>
                  {g.completed && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2"><path d="M2 6l3 3 5-6"/></svg>}
                </button>
                <span className={g.completed ? "line-through text-(--muted)" : ""}>{g.description}</span>
                {g.targetDate && <span className="text-(--muted) text-[10px] ml-auto">by {new Date(g.targetDate).toLocaleDateString("en-IN")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.sessions.length > 0 && (
        <details className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-(--muted) uppercase tracking-wide">Sessions ({plan.sessions.length})</summary>
          <ul className="px-3 pb-3 space-y-2">
            {plan.sessions.slice().reverse().map(s => (
              <li key={s._id} className="text-xs text-(--text) border-t pt-2 first:border-0 first:pt-0" style={{ borderColor: "var(--border)" }}>
                <p className="font-medium">{new Date(s.date).toLocaleDateString("en-IN")} · {s.type.replace("_", " ")} · {s.conductedBy?.name ?? "—"}</p>
                <p className="text-(--muted) whitespace-pre-line mt-0.5">{s.notes}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.confidentialNotes && canManage && (
        <div className="rounded-xl p-3 text-xs" style={{ background: "color-mix(in srgb, var(--warning) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}>
          <p className="font-semibold text-(--warning-text) mb-1">Confidential (SW only)</p>
          <p className="text-(--text) whitespace-pre-line">{plan.confidentialNotes}</p>
        </div>
      )}

      {canManage && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => { setOpenSession(s => !s); setOpenGoal(false); }}
            className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            + Log Session
          </button>
          <button type="button" onClick={() => { setOpenGoal(s => !s); setOpenSession(false); }}
            className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            + Add Goal
          </button>
          {plan.status === "active" && (
            <>
              <button onClick={() => onPatch(plan._id, { status: "on_hold" })} className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>Hold</button>
              <button onClick={() => onPatch(plan._id, { status: "completed" })} className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Complete</button>
            </>
          )}
          {plan.status === "on_hold" && (
            <button onClick={() => onPatch(plan._id, { status: "active" })} className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Resume</button>
          )}
        </div>
      )}

      {openSession && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onPatch(plan._id, { addSession: { date: fd.get("date"), type: fd.get("type"), notes: fd.get("notes") } });
            (e.target as HTMLFormElement).reset();
            setOpenSession(false);
          }}
          className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)}
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <select name="type" defaultValue="phone"
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
              <option value="phone">Phone</option>
              <option value="in_person">In person</option>
              <option value="video">Video</option>
              <option value="home_visit">Home visit</option>
            </select>
          </div>
          <textarea name="notes" required rows={2} placeholder="Session notes — what happened, mood, next steps."
            className="w-full px-3 py-1.5 rounded-lg border text-xs resize-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button type="submit" className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Log Session</button>
        </form>
      )}

      {openGoal && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onPatch(plan._id, { addGoal: { description: fd.get("description"), targetDate: fd.get("targetDate") || undefined } });
            (e.target as HTMLFormElement).reset();
            setOpenGoal(false);
          }}
          className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <input name="description" required placeholder="New goal — e.g. Counselling session every Friday"
            className="w-full px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex items-center gap-2">
            <input name="targetDate" type="date" placeholder="Target date"
              className="px-3 py-1.5 rounded-lg border text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <button type="submit" className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>Add Goal</button>
          </div>
        </form>
      )}
    </article>
  );
}
