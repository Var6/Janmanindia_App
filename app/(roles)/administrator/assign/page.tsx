"use client";

import { useState, useEffect, useCallback } from "react";

type Priority = "low" | "medium" | "high";
type Status   = "planned" | "in_progress" | "done" | "cancelled";
type Category = "fieldwork" | "meeting" | "court" | "training" | "documentation" | "outreach" | "research" | "admin" | "other";

interface StaffUser { _id: string; name: string; role: string; employeeId?: string; avatarUrl?: string }
interface Activity  {
  _id: string; title: string; status: Status; priority: Priority; category: Category;
  dueDate?: string; assignee?: { _id: string; name: string; role: string };
  createdBy?: { _id: string; name: string };
}
interface AssignmentRecord {
  _id: string;
  activity?: { _id: string; title: string; status: Status; priority: Priority };
  assignedTo?:       { name: string; role: string; employeeId?: string };
  assignedBy?:       { name: string; role: string };
  previousAssignee?: { name: string; role: string };
  assignedAt: string;
  note?: string;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   "text-red-600 bg-red-50 border-red-200",
  medium: "text-orange-600 bg-orange-50 border-orange-200",
  low:    "text-green-600 bg-green-50 border-green-200",
};
const STATUS_COLOR: Record<Status, string> = {
  planned:     "text-gray-600 bg-gray-50 border-gray-200",
  in_progress: "text-blue-600 bg-blue-50 border-blue-200",
  done:        "text-green-600 bg-green-50 border-green-200",
  cancelled:   "text-red-400 bg-red-50 border-red-200",
};
const CATEGORIES: Category[] = ["fieldwork","meeting","court","training","documentation","outreach","research","admin","other"];
const ROLE_LABELS: Record<string, string> = {
  socialworker: "Social Worker", litigation: "Litigation", hr: "HR",
  finance: "Finance", administrator: "Administrator", director: "Director", superadmin: "Super Admin",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function Spinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}
function Avatar({ user, size = 32 }: { user: Pick<StaffUser, "name" | "avatarUrl">; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize: size * 0.35, fontWeight: 700, color: "var(--accent)" }}>{initials(user.name)}</div>}
    </div>
  );
}

export default function AdminAssignPage() {
  const [staff, setStaff]           = useState<StaffUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory]       = useState<AssignmentRecord[]>([]);
  const [loadingActs, setLoadingActs] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [tab, setTab]               = useState<"assign" | "history">("assign");

  // New task form
  const [title, setTitle]           = useState("");
  const [desc, setDesc]             = useState("");
  const [category, setCategory]     = useState<Category>("other");
  const [priority, setPriority]     = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate]       = useState("");
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // Reassign state
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [newAssignee, setNewAssignee] = useState("");
  const [reassignNote, setReassignNote] = useState("");
  const [reassignBusy, setReassignBusy] = useState(false);

  // Status filter for activities list
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const loadAll = useCallback(async () => {
    setLoadingActs(true);
    setLoadingHist(true);
    const [staffRes, actsRes, histRes] = await Promise.all([
      fetch("/api/users?role=socialworker,litigation,hr,finance,administrator,director"),
      fetch("/api/activities?assignee=all"),
      fetch("/api/task-assignments?limit=100"),
    ]);
    const [staffData, actsData, histData] = await Promise.all([
      staffRes.json(), actsRes.json(), histRes.json(),
    ]);
    if (staffData.users) setStaff(staffData.users);
    if (actsData.activities) setActivities(actsData.activities);
    setLoadingActs(false);
    if (histData.records) setHistory(histData.records);
    setLoadingHist(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeId) { setFormMsg({ ok: false, text: "Select an assignee." }); return; }
    setSubmitting(true); setFormMsg(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim(), category, priority, assignee: assigneeId, dueDate: dueDate || undefined, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setFormMsg({ ok: false, text: data.error ?? "Failed." }); return; }
      setFormMsg({ ok: true, text: "Task assigned successfully." });
      setTitle(""); setDesc(""); setAssigneeId(""); setDueDate(""); setNote(""); setCategory("other"); setPriority("medium");
      loadAll();
    } finally { setSubmitting(false); }
  }

  async function handleReassign(activityId: string) {
    if (!newAssignee) return;
    setReassignBusy(true);
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: newAssignee, note: reassignNote.trim() || undefined }),
      });
      if (res.ok) { setReassigning(null); setNewAssignee(""); setReassignNote(""); loadAll(); }
    } finally { setReassignBusy(false); }
  }

  const filteredActivities = statusFilter === "all"
    ? activities
    : activities.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Task Assignment</h1>
        <p className="text-sm text-(--muted) mt-1">Create and assign tasks to any staff member. Full history is recorded.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {(["assign", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent-contrast)" : "var(--muted)",
            }}>
            {t === "assign" ? "Assign Tasks" : "Assignment History"}
          </button>
        ))}
      </div>

      {tab === "assign" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Create form */}
          <form onSubmit={handleCreate} className="xl:col-span-2 rounded-2xl border p-5 space-y-4 h-fit"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="font-semibold text-(--text)">New Task</h2>

            {formMsg && (
              <div className="p-3 rounded-lg text-sm" style={{
                background: formMsg.ok ? "var(--success-bg)" : "var(--error-bg)",
                color: formMsg.ok ? "var(--success-text)" : "var(--error-text)",
              }}>{formMsg.ok ? "✓ " : "✗ "}{formMsg.text}</div>
            )}

            <div className="space-y-3">
              <input required value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title *" maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

              <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)" rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-(--muted) mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-(--muted) mb-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-(--muted) mb-1">Assign to *</label>
                <select required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                  <option value="">— Select staff member —</option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({ROLE_LABELS[u.role] ?? u.role}{u.employeeId ? ` · ${u.employeeId}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-(--muted) mb-1">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              </div>

              <div>
                <label className="block text-xs text-(--muted) mb-1">Assignment note (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Follow up with client on Tuesday"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {submitting ? "Assigning…" : "Assign Task"}
            </button>
          </form>

          {/* Activities list */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-(--text)">Filter:</span>
              {(["all","planned","in_progress","done","cancelled"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-1 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    background: statusFilter === s ? "var(--accent)" : "var(--bg)",
                    color: statusFilter === s ? "var(--accent-contrast)" : "var(--muted)",
                    borderColor: statusFilter === s ? "var(--accent)" : "var(--border)",
                  }}>
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {loadingActs ? (
                <div className="flex items-center justify-center py-12 gap-2 text-(--muted)"><Spinner /> Loading…</div>
              ) : filteredActivities.length === 0 ? (
                <p className="py-10 text-center text-sm text-(--muted)">No tasks found.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {filteredActivities.map((act) => (
                    <div key={act._id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[act.priority]}`}>
                              {act.priority}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[act.status]}`}>
                              {act.status.replace("_"," ")}
                            </span>
                            <span className="text-[10px] text-(--muted) border border-(--border) px-2 py-0.5 rounded-full capitalize">
                              {act.category}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-(--text)">{act.title}</p>
                          <p className="text-xs text-(--muted) mt-0.5">
                            {act.assignee ? `${act.assignee.name} · ${ROLE_LABELS[act.assignee.role] ?? act.assignee.role}` : "Unassigned"}
                            {act.dueDate ? ` · Due ${new Date(act.dueDate).toLocaleDateString("en-IN")}` : ""}
                          </p>
                        </div>
                        {act.status !== "done" && act.status !== "cancelled" && (
                          <button onClick={() => { setReassigning(act._id); setNewAssignee(""); setReassignNote(""); }}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0"
                            style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--bg)" }}>
                            Reassign
                          </button>
                        )}
                      </div>

                      {reassigning === act._id && (
                        <div className="flex gap-2 flex-wrap pt-1">
                          <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border text-xs"
                            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                            <option value="">— Select new assignee —</option>
                            {staff.filter((u) => u._id !== act.assignee?._id).map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name} ({ROLE_LABELS[u.role] ?? u.role})
                              </option>
                            ))}
                          </select>
                          <input value={reassignNote} onChange={(e) => setReassignNote(e.target.value)}
                            placeholder="Reason (optional)"
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border text-xs"
                            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                          <button onClick={() => handleReassign(act._id)} disabled={!newAssignee || reassignBusy}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                            {reassignBusy ? <Spinner /> : "Save"}
                          </button>
                          <button onClick={() => setReassigning(null)}
                            className="px-3 py-1.5 rounded-lg text-xs border"
                            style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b text-sm font-semibold text-(--text)"
            style={{ borderColor: "var(--border)" }}>
            Assignment History ({history.length} records)
          </div>
          {loadingHist ? (
            <div className="flex items-center justify-center py-12 gap-2 text-(--muted)"><Spinner /> Loading…</div>
          ) : history.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--muted)">No assignments recorded yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {history.map((r) => (
                <div key={r._id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    {initials(r.assignedTo?.name ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-(--text) truncate">
                      {r.activity?.title ?? "Deleted task"}
                    </p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      Assigned to <span className="font-medium text-(--text)">{r.assignedTo?.name ?? "?"}</span>
                      {r.previousAssignee ? ` (was: ${r.previousAssignee.name})` : ""}
                      {" "}&middot; by <span className="font-medium text-(--text)">{r.assignedBy?.name ?? "?"}</span>
                    </p>
                    {r.note && (
                      <p className="text-xs mt-1 italic" style={{ color: "var(--muted)" }}>"{r.note}"</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {r.activity && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.activity.status]}`}>
                        {r.activity.status.replace("_"," ")}
                      </span>
                    )}
                    <p className="text-[10px] text-(--muted) mt-1">
                      {new Date(r.assignedAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                      {" "}{new Date(r.assignedAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
