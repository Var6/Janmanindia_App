"use client";

import { useEffect, useState, useCallback } from "react";

type StaffUser = {
  _id: string; name: string; email: string; role: string;
  isActive: boolean; employeeId?: string; exitedAt?: string;
};

type Asset = {
  _id: string; type: string; name: string; identifier?: string;
  status: "assigned" | "returned" | "lost" | "damaged";
  assignedAt: string; returnedAt?: string;
};

const STAFF_ROLES = "socialworker,litigation,hr,finance,admin";

const RETURN_OPTIONS: { value: "returned" | "lost" | "damaged"; label: string; tone: "ok" | "warn" | "err" }[] = [
  { value: "returned", label: "Returned",  tone: "ok"   },
  { value: "lost",     label: "Lost",      tone: "err"  },
  { value: "damaged",  label: "Damaged",   tone: "warn" },
];

export default function OffboardingPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assetsByEmployee, setAssetsByEmployee] = useState<Record<string, Asset[]>>({});
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; type: "ok" | "err" } | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?role=${STAFF_ROLES}`);
      const d = await res.json();
      setStaff(d.users ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function loadAssets(employeeId: string) {
    const res = await fetch(`/api/hr/assets?employee=${employeeId}`);
    const d = await res.json();
    setAssetsByEmployee((prev) => ({ ...prev, [employeeId]: d.assets ?? [] }));
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!assetsByEmployee[id]) loadAssets(id);
    }
  }

  async function markAsset(assetId: string, employeeId: string, status: "returned" | "lost" | "damaged") {
    const notes = status === "returned" ? undefined : (prompt(`Reason for marking ${status}:`) ?? "");
    setBusyAsset(assetId);
    try {
      const res = await fetch(`/api/hr/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, returnNotes: notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed");
      } else {
        await loadAssets(employeeId);
      }
    } finally {
      setBusyAsset(null);
    }
  }

  async function offboard(employeeId: string) {
    if (!confirm("Deactivate this employee account? They will no longer be able to log in.")) return;
    setBusyToggle(employeeId);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/toggle?id=${employeeId}&active=false`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ id: employeeId, text: d.error ?? "Failed to offboard", type: "err" });
      } else {
        setMessage({ id: employeeId, text: "Account deactivated successfully.", type: "ok" });
        await loadStaff();
      }
    } finally {
      setBusyToggle(null);
    }
  }

  async function reactivate(employeeId: string) {
    setBusyToggle(employeeId);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/toggle?id=${employeeId}&active=true`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setMessage({ id: employeeId, text: d.error ?? "Failed", type: "err" });
      } else {
        setMessage({ id: employeeId, text: "Account reactivated.", type: "ok" });
        await loadStaff();
      }
    } finally {
      setBusyToggle(null);
    }
  }

  const active = staff.filter((s) => s.isActive);
  const inactive = staff.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Offboarding</h1>
        <p className="text-sm text-(--muted) mt-1">
          Collect every assigned asset before deactivating an employee. The system blocks offboarding while assets are outstanding.
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-(--muted)">Loading staff…</div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold text-(--text) mb-3">Active Staff ({active.length})</h2>
            {active.length === 0 ? (
              <div className="py-10 text-center bg-(--surface) rounded-2xl border border-(--border) text-sm text-(--muted)">
                No active staff.
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((s) => {
                  const open = expanded === s._id;
                  const assets = assetsByEmployee[s._id] ?? [];
                  const outstanding = assets.filter((a) => a.status === "assigned").length;
                  const canOffboard = open && outstanding === 0;

                  return (
                    <div key={s._id} className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
                      <button onClick={() => toggleExpand(s._id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-(--accent-subtle) transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-(--text)">{s.name}</p>
                            {s.employeeId && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                                {s.employeeId}
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-(--accent)/10 text-(--accent)">
                              {s.role}
                            </span>
                          </div>
                          <p className="text-xs text-(--muted) mt-0.5">{s.email}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {open && outstanding > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)" }}>
                              {outstanding} outstanding
                            </span>
                          )}
                          <span className="text-xs text-(--muted)">{open ? "▾" : "▸"}</span>
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-(--border) p-5 space-y-4">
                          {message?.id === s._id && (
                            <div className="px-3 py-2 rounded-lg text-xs"
                              style={message.type === "ok"
                                ? { background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }
                                : { background: "var(--error-bg)", color: "var(--error-text)" }}>
                              {message.text}
                            </div>
                          )}

                          <h3 className="text-sm font-semibold text-(--text)">Assets</h3>
                          {assets.length === 0 ? (
                            <p className="text-xs text-(--muted)">No assets recorded for this employee.</p>
                          ) : (
                            <ul className="divide-y divide-(--border) rounded-lg border border-(--border)">
                              {assets.map((a) => (
                                <li key={a._id} className="px-3 py-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm text-(--text)">
                                      <span className="capitalize text-(--muted) text-xs mr-1">{a.type.replace("_", " ")}:</span>
                                      {a.name}
                                      {a.identifier && <span className="text-(--muted) text-xs"> · {a.identifier}</span>}
                                    </p>
                                    <p className="text-[11px] text-(--muted)">
                                      Assigned {new Date(a.assignedAt).toLocaleDateString("en-IN")}
                                      {a.returnedAt ? ` · Closed ${new Date(a.returnedAt).toLocaleDateString("en-IN")}` : ""}
                                    </p>
                                  </div>
                                  {a.status === "assigned" ? (
                                    <div className="flex gap-1.5 shrink-0">
                                      {RETURN_OPTIONS.map((opt) => (
                                        <button key={opt.value}
                                          disabled={busyAsset === a._id}
                                          onClick={() => markAsset(a._id, s._id, opt.value)}
                                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg disabled:opacity-50"
                                          style={
                                            opt.tone === "ok"   ? { background: "var(--success, #16a34a)", color: "#fff" }
                                          : opt.tone === "warn" ? { background: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)" }
                                          : { background: "var(--error-bg)", color: "var(--error-text)" }
                                          }>
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full shrink-0 capitalize"
                                      style={a.status === "returned"
                                        ? { background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }
                                        : { background: "var(--error-bg)", color: "var(--error-text)" }}>
                                      {a.status}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="pt-3 border-t border-(--border) flex items-center justify-between">
                            {outstanding > 0 ? (
                              <p className="text-xs text-(--muted)">Resolve {outstanding} outstanding asset{outstanding === 1 ? "" : "s"} before offboarding.</p>
                            ) : (
                              <p className="text-xs text-(--muted)">All assets resolved — safe to offboard.</p>
                            )}
                            <button onClick={() => offboard(s._id)}
                              disabled={!canOffboard || busyToggle === s._id}
                              className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: "var(--error, #dc2626)" }}>
                              {busyToggle === s._id ? "Working…" : "Offboard"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {inactive.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-(--text) mb-3">Inactive ({inactive.length})</h2>
              <div className="bg-(--surface) rounded-2xl border border-(--border) divide-y divide-(--border)">
                {inactive.map((s) => (
                  <div key={s._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-(--text)">{s.name}</p>
                        {s.employeeId && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                            {s.employeeId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--muted)">
                        {s.email} · <span className="capitalize">{s.role}</span>
                        {s.exitedAt ? ` · Exited ${new Date(s.exitedAt).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                    <button onClick={() => reactivate(s._id)} disabled={busyToggle === s._id}
                      className="text-xs font-semibold px-3 py-1 rounded-lg border border-(--border) text-(--text) hover:border-(--accent) disabled:opacity-50">
                      {busyToggle === s._id ? "…" : "Reactivate"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-6 p-4 rounded-xl border border-(--border) bg-(--surface) text-xs text-(--muted)">
        <span className="font-semibold text-(--text)">Note:</span> Deactivating an account preserves all data — cases, reports, and history remain. Reactivation restores access immediately.
      </div>
    </div>
  );
}
