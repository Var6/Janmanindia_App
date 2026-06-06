"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

interface Props {
  userId: string;
  userName: string;
  currentRole: string;
  /** Extra roles this user can ALSO act as (multi-position), excluding primary. */
  currentRoles?: string[];
  isActive: boolean;
  /** Order matters — used to populate the dropdown. */
  roles: readonly string[];
  /** display labels keyed by role. */
  roleLabels: Record<string, string>;
  /** Superadmin can permanently delete the user. */
  canDelete?: boolean;
}

/** Per-row actions on /director/users:
 *   • Role dropdown — change is confirmed via window.confirm, no separate Set
 *     button. Posts JSON to /api/users/set-role and refreshes the page on
 *     success.
 *   • NPA toggle — confirms before deactivating ("mark this person as a past
 *     employee"). Reinstating goes through without a confirm because it's
 *     non-destructive. */
export default function UserActions({
  userId, userName, currentRole, currentRoles, isActive, roles, roleLabels, canDelete,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local copy so the <select> stays in sync after a confirm-cancel.
  const [role, setRole] = useState(currentRole);

  // Multi-position editor: which EXTRA roles this user may switch into.
  // Community/pending aren't real "positions" a staffer toggles, so exclude them.
  const POSITION_ROLES = roles.filter((r) => r !== "community" && r !== "pending");
  const [editingPos, setEditingPos] = useState(false);
  const [extra, setExtra] = useState<string[]>(currentRoles ?? []);

  async function saveRoles() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: userId, roles: extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : t("Failed.")); return; }
      setEditingPos(false);
      router.refresh();
    } finally { setBusy(false); }
  }

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
        setError(typeof data.error === "string" ? data.error : t("Failed to change role."));
        return;
      }
      setRole(newRole);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function deleteUser() {
    const ok = window.confirm(
      `Permanently DELETE ${userName}? This cannot be undone.\n\nConsider "NPA" (deactivate) instead if you only want to revoke access.`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE", headers: { Accept: "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : t("Failed.")); return; }
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
        setError(typeof data.error === "string" ? data.error : t("Failed."));
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
      {isActive && currentRole !== "pending" && currentRole !== "community" && (
        <button type="button" disabled={busy} onClick={() => setEditingPos((v) => !v)}
          className="text-xs font-semibold hover:underline disabled:opacity-50" style={{ color: "var(--accent)" }}>
          {extra.length > 0 ? `+${extra.length} ${t("roles")}` : t("Positions")}
        </button>
      )}
      <button type="button" disabled={busy} onClick={toggleActive}
        className={`text-xs font-semibold hover:underline disabled:opacity-50 ${
          isActive ? "text-red-500" : "text-green-600"
        }`}>
        {isActive ? t("NPA") : t("Reinstate")}
      </button>
      {canDelete && (
        <button type="button" disabled={busy} onClick={deleteUser}
          className="text-xs font-semibold hover:underline disabled:opacity-50 text-red-600"
          title={t("Permanently delete this user")}>
          {t("Delete")}
        </button>
      )}
      {error && <span className="text-[11px] text-(--error-text) basis-full">{error}</span>}

      {editingPos && (
        <div className="basis-full mt-1 rounded-xl border p-3"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <p className="text-[11px] text-(--muted) mb-2">
            {t("Extra roles this person can switch into (besides their primary role). They get a role switcher in the top bar.")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POSITION_ROLES.map((r) => {
              const on = extra.includes(r) || r === role;
              const isPrimary = r === role;
              return (
                <button key={r} type="button" disabled={isPrimary}
                  onClick={() => setExtra((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
                  className="text-[11px] font-medium px-2 py-1 rounded-full border transition-colors disabled:opacity-60"
                  style={on
                    ? { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "var(--accent)" }
                    : { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }}>
                  {roleLabels[r] ?? r}{isPrimary ? ` · ${t("primary")}` : ""}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={saveRoles} disabled={busy}
              className="text-xs font-semibold px-3 py-1 rounded-lg disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {busy ? t("Saving…") : t("Save")}
            </button>
            <button type="button" onClick={() => { setExtra(currentRoles ?? []); setEditingPos(false); }}
              className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
