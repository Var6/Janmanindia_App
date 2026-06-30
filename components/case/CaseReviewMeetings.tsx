"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { roleColor, CREATOR_COLOR } from "@/lib/role-colors";

interface Attendee { name: string; role?: string }
interface ActionItem {
  _id: string;
  text: string;
  activity?: string;
  activityTitle?: string;
  outcome?: string;
  done: boolean;
}
interface Meeting {
  _id: string;
  date: string;
  author: string;
  authorName?: string;
  authorRole?: string;
  attendees: Attendee[];
  summary: string;
  objectives?: string;
  nextDate?: string;
  actionItems: ActionItem[];
  outcome?: string;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
}

const ROLE_OPTIONS = ["director", "litigation", "socialworker", "administrator", "hr", "finance", "community", "superadmin"];

function fmtDate(d?: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d?: string): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RoleBadge({ name, role, creator }: { name: string; role?: string; creator?: boolean }) {
  const c = creator ? CREATOR_COLOR : roleColor(role);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {name}{role ? <span className="opacity-70">· {creator ? "creator" : c.label}</span> : null}
    </span>
  );
}

/**
 * Colour-coded "review meetings & progress" timeline shown below the case
 * workflow tree. Each dated node records who attended, what was decided, the
 * objectives, the action items (which can be promoted to org activities), the
 * outcome, and the next discussion date.
 */
export default function CaseReviewMeetings({ caseId, creatorId }: { caseId: string; creatorId?: string }) {
  const t = useT();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Compose form state
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: "", role: "" }]);
  const [summary, setSummary] = useState("");
  const [objectives, setObjectives] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [actions, setActions] = useState<{ text: string; createActivity: boolean }[]>([{ text: "", createActivity: false }]);
  const [outcome, setOutcome] = useState("");

  const load = useCallback(() => {
    fetch(`/api/cases/${caseId}/meetings`)
      .then((r) => (r.ok ? r.json() : { meetings: [], canWrite: false }))
      .then((d) => { setMeetings(d.meetings ?? []); setCanWrite(Boolean(d.canWrite)); })
      .catch(() => setMeetings([]));
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setDate(""); setAttendees([{ name: "", role: "" }]); setSummary("");
    setObjectives(""); setNextDate(""); setActions([{ text: "", createActivity: false }]); setOutcome("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) { setError(t("Add a short summary of what was decided.")); return; }
    setSaving(true);
    setError("");
    try {
      // Promote flagged action items into organisation activities first, then
      // link them onto the meeting.
      const items: { text: string; activity?: string; activityTitle?: string }[] = [];
      for (const a of actions) {
        if (!a.text.trim()) continue;
        let activity: string | undefined;
        let activityTitle: string | undefined;
        if (a.createActivity) {
          const ar = await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: a.text.trim(),
              category: "meeting",
              priority: "medium",
              ...(nextDate ? { dueDate: new Date(nextDate).toISOString() } : {}),
            }),
          });
          if (ar.ok) {
            const ad = await ar.json();
            activity = ad.activity?._id ? String(ad.activity._id) : undefined;
            activityTitle = ad.activity?.title;
          }
        }
        items.push({ text: a.text.trim(), activity, activityTitle });
      }

      const res = await fetch(`/api/cases/${caseId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date ? new Date(date).toISOString() : undefined,
          attendees: attendees.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), role: a.role || undefined })),
          summary: summary.trim(),
          objectives: objectives.trim() || undefined,
          nextDate: nextDate ? new Date(nextDate).toISOString() : undefined,
          actionItems: items,
          outcome: outcome.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("Could not save the meeting."));
        return;
      }
      resetForm();
      setOpen(false);
      load();
    } catch {
      setError(t("Network error — please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAction(meetingId: string, actionItemId: string, done: boolean) {
    await fetch(`/api/cases/${caseId}/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionItemId, done }),
    }).catch(() => {});
    load();
  }

  async function deleteMeeting(meetingId: string) {
    if (!confirm(t("Delete this meeting entry?"))) return;
    await fetch(`/api/cases/${caseId}/meetings/${meetingId}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="font-semibold text-(--text) text-sm">🗓️ {t("Review meetings & progress")}</h2>
          <p className="text-[11px] text-(--muted) mt-0.5">{t("Who met, what was decided, actions taken, and the next discussion — colour-coded by role.")}</p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen((o) => !o)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: open ? "var(--bg-secondary)" : "var(--accent)", color: open ? "var(--text)" : "var(--accent-contrast)" }}>
            {open ? t("Cancel") : t("＋ Log a meeting")}
          </button>
        )}
      </div>

      {/* Compose form */}
      {open && canWrite && (
        <form onSubmit={submit} className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--border)" }}>
          {error && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-(--text) mb-1">{t("Meeting date")}</span>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="cm-input" />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-(--text) mb-1">{t("Next discussion (optional)")}</span>
              <input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="cm-input" />
            </label>
          </div>

          {/* Attendees */}
          <div>
            <span className="block text-xs font-semibold text-(--text) mb-1">{t("Who was there")}</span>
            <div className="space-y-2">
              {attendees.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input value={a.name} placeholder={t("Name")}
                    onChange={(e) => setAttendees((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="cm-input flex-1" />
                  <select value={a.role ?? ""}
                    onChange={(e) => setAttendees((p) => p.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                    className="cm-input w-36">
                    <option value="">{t("Role…")}</option>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleColor(r).label}</option>)}
                  </select>
                  <button type="button" onClick={() => setAttendees((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p)}
                    className="px-2 rounded-lg text-(--muted) hover:text-(--error)" title={t("Remove")}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setAttendees((p) => [...p, { name: "", role: "" }])}
              className="mt-1.5 text-xs font-medium" style={{ color: "var(--accent)" }}>+ {t("Add attendee")}</button>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold text-(--text) mb-1">{t("What was decided / changed")} <span style={{ color: "var(--error)" }}>*</span></span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} required
              placeholder={t("Summary of the discussion and decisions")} className="cm-input resize-y" />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-(--text) mb-1">{t("Objectives (optional)")}</span>
            <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2}
              placeholder={t("What are we aiming for before the next discussion?")} className="cm-input resize-y" />
          </label>

          {/* Action items */}
          <div>
            <span className="block text-xs font-semibold text-(--text) mb-1">{t("Action items")}</span>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={a.text} placeholder={t("What needs to be done?")}
                    onChange={(e) => setActions((p) => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                    className="cm-input flex-1" />
                  <label className="flex items-center gap-1 text-[11px] text-(--muted) whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={a.createActivity} className="accent-(--accent)"
                      onChange={(e) => setActions((p) => p.map((x, j) => j === i ? { ...x, createActivity: e.target.checked } : x))} />
                    {t("create activity")}
                  </label>
                  <button type="button" onClick={() => setActions((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p)}
                    className="px-2 rounded-lg text-(--muted) hover:text-(--error)" title={t("Remove")}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setActions((p) => [...p, { text: "", createActivity: false }])}
              className="mt-1.5 text-xs font-medium" style={{ color: "var(--accent)" }}>+ {t("Add action")}</button>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold text-(--text) mb-1">{t("Outcome / update (optional)")}</span>
            <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2}
              placeholder={t("Result of the meeting so far")} className="cm-input resize-y" />
          </label>

          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {saving ? t("Saving…") : t("Save meeting")}
          </button>
        </form>
      )}

      {/* Timeline */}
      <div className="px-5 py-4">
        {meetings === null ? (
          <p className="text-xs text-(--muted) text-center py-4">{t("Loading…")}</p>
        ) : meetings.length === 0 ? (
          <p className="text-xs text-(--muted) text-center py-4">{t("No review meetings logged yet.")}</p>
        ) : (
          <ol className="relative border-l-2 ml-2 space-y-5" style={{ borderColor: "var(--border)" }}>
            {meetings.map((m) => {
              const isCreator = creatorId != null && m.author === creatorId;
              const c = isCreator ? CREATOR_COLOR : roleColor(m.authorRole);
              return (
                <li key={m._id} className="ml-5 relative">
                  {/* node dot */}
                  <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2"
                    style={{ background: c.dot, borderColor: "var(--surface)" }} />
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    {/* date + author */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-(--text)">{fmtDate(m.date)}</span>
                        <RoleBadge name={m.authorName ?? t("Unknown")} role={m.authorRole} creator={isCreator} />
                      </div>
                      {m.canDelete && (
                        <button onClick={() => deleteMeeting(m._id)} className="text-[11px] text-(--muted) hover:text-(--error)">{t("Delete")}</button>
                      )}
                    </div>

                    {/* attendees */}
                    {m.attendees.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[11px] text-(--muted) mr-1">{t("Present:")}</span>
                        {m.attendees.map((a, i) => <RoleBadge key={i} name={a.name} role={a.role} />)}
                      </div>
                    )}

                    {/* summary */}
                    <p className="text-sm text-(--text) mt-2 whitespace-pre-wrap leading-relaxed">{m.summary}</p>

                    {/* objectives */}
                    {m.objectives && (
                      <p className="text-xs text-(--muted) mt-2"><span className="font-semibold text-(--text)">🎯 {t("Objectives:")}</span> {m.objectives}</p>
                    )}

                    {/* action items */}
                    {m.actionItems.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {m.actionItems.map((a) => (
                          <li key={a._id} className="flex items-start gap-2 text-xs">
                            <input type="checkbox" checked={a.done} disabled={!m.canDelete}
                              onChange={(e) => toggleAction(m._id, a._id, e.target.checked)}
                              className="mt-0.5 accent-(--accent)" />
                            <span className={a.done ? "line-through text-(--muted)" : "text-(--text)"}>
                              {a.text}
                              {a.activity && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>📋 {t("activity")}</span>}
                              {a.outcome && <span className="block text-[11px] text-(--muted) mt-0.5">↳ {a.outcome}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* outcome + next date */}
                    {m.outcome && (
                      <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                        <span className="font-semibold">{t("Outcome:")}</span> {m.outcome}
                      </p>
                    )}
                    {m.nextDate && (
                      <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--accent)" }}>
                        ⏭ {t("Next discussion:")} {fmtDateTime(m.nextDate)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <style jsx>{`
        .cm-input {
          width: 100%;
          border-radius: 0.625rem;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 0.5rem 0.7rem;
          font-size: 0.8125rem;
          color: var(--text);
          outline: none;
        }
        .cm-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}
