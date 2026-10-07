"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import Modal from "@/components/insights/Modal";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

export type Person = { _id: string; name: string; role: string };

export const ROLE_NAMES: Record<string, string> = {
  socialworker: "Social workers", litigation: "Lawyers", hr: "HR", finance: "Finance", administrator: "Administrators",
};
const ROLE_ONE: Record<string, string> = {
  socialworker: "social worker", litigation: "lawyer", hr: "HR", finance: "finance", administrator: "administrator",
  director: "director", superadmin: "superadmin",
};

/** "Shared with Lawyers and 3 people" / "Directors only". */
export function sharingSummary(visibleTo: string[], sharedWith: string[]): string {
  const parts = [
    ...visibleTo.map((r) => ROLE_NAMES[r] ?? r),
    ...(sharedWith.length ? [`${sharedWith.length} ${sharedWith.length === 1 ? "person" : "people"}`] : []),
  ];
  if (!parts.length) return "Directors only";
  return `Shared with ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}`;
}

/** Choose which staff roles and which people can open a dashboard or report. */
export default function ShareDialog({ kind, id, title, initial, onClose, onSaved }: {
  kind: "dashboard" | "report"; id: string; title: string;
  initial: { visibleTo: string[]; sharedWith: string[] };
  onClose: () => void; onSaved: () => void;
}) {
  const toast = useNotify();
  const people = useApi<{ people: Person[] }>("/api/insights/people");
  const [roles, setRoles] = useState<string[]>(initial.visibleTo);
  const [picked, setPicked] = useState<string[]>(initial.sharedWith);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const all = (people.data?.people ?? []).filter((p) => p.role !== "director" && p.role !== "superadmin");
  const shown = all.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const path = kind === "dashboard" ? `/insights/dashboards/${id}` : `/insights/reports/${id}`;

  async function save() {
    setSaving(true);
    try {
      await api(`/api/insights/${kind === "dashboard" ? "dashboards" : "reports"}/${id}/share`, { method: "PUT", body: { visibleTo: roles, sharedWith: picked } });
      toast.success("Sharing saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Share “${title}”`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-(--muted)">
          Directors can always see it. People you add here can open it read-only from Insights in their menu
          {kind === "dashboard" ? " and change its filters" : " and comment on it"}. They cannot edit it, and they cannot open Explore,
          data health or Copilot. Every tile shows totals only, but charts by lawyer or social worker name staff.
        </p>
        <div>
          <p className={labelCls}>Everyone in these roles</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(ROLE_NAMES).map(([r, label]) => (
              <label key={r} className="inline-flex items-center gap-1.5 text-sm text-(--text)">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles(roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r])} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={labelCls}>And these people</p>
          <input className={`${inputCls} mb-2`} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-56 overflow-auto rounded-lg border border-(--border) p-2 space-y-1">
            {people.loading && <p className="text-xs text-(--muted)">Loading…</p>}
            {shown.map((p) => (
              <label key={p._id} className="flex items-center gap-2 text-sm text-(--text)">
                <input type="checkbox" checked={picked.includes(p._id)} onChange={() => setPicked(picked.includes(p._id) ? picked.filter((x) => x !== p._id) : [...picked, p._id])} />
                {p.name} <span className="text-xs text-(--muted)">{ROLE_ONE[p.role] ?? p.role}</span>
                {roles.includes(p.role) && <span className="text-[11px] text-(--muted) ml-auto">already in a shared role</span>}
              </label>
            ))}
            {!people.loading && shown.length === 0 && <p className="text-xs text-(--muted)">No one found.</p>}
          </div>
          <p className="text-[11px] text-(--muted) mt-1">People added by name get a notification.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button className="text-xs text-(--accent)" onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}${path}`);
            toast.success("Link copied. It opens for anyone this is shared with.");
          }}>Copy link</button>
          <span className="flex-1" />
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}
