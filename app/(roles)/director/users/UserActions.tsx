"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  userId: string;
  userName: string;
  currentRole: string;
  isActive: boolean;
  /** Order matters — used to populate the dropdown. */
  roles: readonly string[];
  /** display labels keyed by role. */
  roleLabels: Record<string, string>;
}

/** Per-row actions on /director/users:
 *   • Role dropdown — change is confirmed via window.confirm, no separate Set
 *     button. Posts JSON to /api/users/set-role and refreshes the page on
 *     success.
 *   • NPA toggle — confirms before deactivating ("mark this person as a past
 *     employee"). Reinstating goes through without a confirm because it's
 *     non-destructive. */
export default function UserActions({
  userId, userName, currentRole, isActive, roles, roleLabels,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local copy so the <select> stays in sync after a confirm-cancel.
  const [role, setRole] = useState(currentRole);

  async function changeRole(newRole: string) {
    if (newRole === role) return;
    const ok = window.confirm(
      `Change ${userName}'s role from "${roleLabels[role] ?? role}" to "${roleLabels[newRole] ?? newRole}"?`
    );
    if (!ok) return; // user cancelled — leave the select as-is below
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to change role.");
        return;
      }
      setRole(newRole);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function toggleActive() {
    const next = !isActive;
    if (!next) {
      const ok = window.confirm(
        `Mark ${userName} as NPA (Non-Performing Asset / past employee)?\n\nThey will lose access immediately. You can reinstate later.`
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/toggle?id=${userId}&active=${next ? "true" : "false"}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed.");
        return;
      }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isActive && currentRole !== "pending" && (
        // `value={role}` keeps the select pinned to whatever changeRole last
        // committed — so cancelling the confirm dialog naturally snaps the
        // visible option back to the previous role.
        <select value={role} disabled={busy}
          onChange={(e) => { void changeRole(e.target.value); }}
          className="px-2 py-1 rounded-lg border text-xs"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          {roles.map((r) => (
            <option key={r} value={r}>{roleLabels[r] ?? r}</option>
          ))}
        </select>
      )}
      <button type="button" disabled={busy} onClick={toggleActive}
        className={`text-xs font-semibold hover:underline disabled:opacity-50 ${
          isActive ? "text-red-500" : "text-green-600"
        }`}>
        {isActive ? "NPA" : "Reinstate"}
      </button>
      {error && <span className="text-[11px] text-(--error-text) basis-full">{error}</span>}
    </div>
  );
}
