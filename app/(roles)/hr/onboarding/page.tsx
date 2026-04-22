"use client";

import { useState, useEffect, useCallback } from "react";

type StaffUser = {
  _id: string; name: string; email: string; phone?: string; role: string;
  isActive: boolean; employeeId?: string; joinedAt?: string; createdAt: string;
};

type Asset = {
  _id: string; type: string; name: string; identifier?: string;
  status: "assigned" | "returned" | "lost" | "damaged";
  assignedAt: string; returnedAt?: string; notes?: string;
};

const ASSET_TYPES: { value: string; label: string }[] = [
  { value: "laptop",        label: "Laptop"        },
  { value: "phone",         label: "Phone"         },
  { value: "sim",           label: "SIM Card"      },
  { value: "vehicle",       label: "Vehicle"       },
  { value: "id_card",       label: "ID Card"       },
  { value: "email_account", label: "Email Account" },
  { value: "uniform",       label: "Uniform"       },
  { value: "stationery",    label: "Stationery"    },
  { value: "key",           label: "Office Key"    },
  { value: "other",         label: "Other"         },
];

const STAFF_ROLES = "socialworker,litigation,hr,finance,admin";

export default function OnboardingPage() {
  const [tab, setTab] = useState<"onboard" | "active">("onboard");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assetsByEmployee, setAssetsByEmployee] = useState<Record<string, Asset[]>>({});

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

  async function handleOnboard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(""); setSuccess("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/hr/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          role: fd.get("role"),
          phone: fd.get("phone"),
          barCouncilId: fd.get("barCouncilId"),
          district: fd.get("district"),
          city: fd.get("city"),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Failed to create account.");
      } else {
        setSuccess(`${d.user.name} onboarded — Employee ID: ${d.user.employeeId}`);
        await loadStaff();
        setTab("active");
        setExpanded(d.user._id);
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssetSubmit(employeeId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/hr/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee: employeeId,
        type: fd.get("type"),
        name: fd.get("name"),
        identifier: fd.get("identifier"),
        notes: fd.get("notes"),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed to assign asset");
      return;
    }
    form.reset();
    await loadAssets(employeeId);
  }

  function toggleExpand(employeeId: string) {
    if (expanded === employeeId) {
      setExpanded(null);
    } else {
      setExpanded(employeeId);
      if (!assetsByEmployee[employeeId]) loadAssets(employeeId);
    }
  }

  const activeStaff = staff.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Onboarding</h1>
        <p className="text-sm text-(--muted) mt-1">
          Create accounts with auto-generated Employee IDs and assign equipment in sequence.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
        {(["onboard", "active"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
            }`}
            style={tab === t ? { background: "var(--accent)" } : undefined}>
            {t === "onboard" ? "New Staff" : `Active Staff (${activeStaff.length})`}
          </button>
        ))}
      </div>

      {success && <div className="p-3 rounded-xl text-sm" style={{ background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }}>{success}</div>}
      {error   && <div className="p-3 rounded-xl text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</div>}

      {tab === "onboard" ? (
        <form onSubmit={handleOnboard} className="bg-(--surface) rounded-2xl border border-(--border) p-6 space-y-5">
          <h2 className="font-semibold text-(--text)">New Staff Account</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input name="name" required placeholder="Full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Email <span className="text-red-500">*</span></label>
              <input name="email" type="email" required placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Phone</label>
              <input name="phone" type="tel" placeholder="+91 XXXXX XXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Role <span className="text-red-500">*</span></label>
              <select name="role" required defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)">
                <option value="" disabled>Select role…</option>
                <option value="socialworker">Social Worker</option>
                <option value="litigation">Litigation Team</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="director">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
              <input name="password" type="password" required minLength={8} placeholder="Min 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">Bar Council ID <span className="text-xs text-(--muted)">(Litigation)</span></label>
              <input name="barCouncilId" placeholder="BCI/UP/XXXX/XXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">District <span className="text-xs text-(--muted)">(Litigation)</span></label>
              <input name="district" placeholder="e.g. Patna"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text) mb-1.5">City <span className="text-xs text-(--muted)">(Litigation)</span></label>
              <input name="city" placeholder="e.g. Patna"
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent)" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {submitting ? "Creating account…" : "Create Staff Account & Generate Employee ID"}
          </button>
        </form>
      ) : (
        <section className="space-y-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-(--muted)">Loading staff…</div>
          ) : activeStaff.length === 0 ? (
            <div className="py-16 text-center bg-(--surface) rounded-2xl border border-(--border)">
              <p className="text-sm text-(--muted)">No active staff found.</p>
            </div>
          ) : (
            activeStaff.map((s) => {
              const open = expanded === s._id;
              const assets = assetsByEmployee[s._id] ?? [];
              const outstanding = assets.filter((a) => a.status === "assigned").length;
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
                      <p className="text-xs text-(--muted) mt-0.5">
                        {s.email}{s.phone ? ` · ${s.phone}` : ""}
                        {s.joinedAt ? ` · Joined ${new Date(s.joinedAt).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {open && outstanding > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)" }}>
                          {outstanding} asset{outstanding === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="text-xs text-(--muted)">{open ? "▾" : "▸"}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-(--border) p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-(--text)">Assigned Assets</h3>
                      {assets.length === 0 ? (
                        <p className="text-xs text-(--muted)">No assets assigned yet.</p>
                      ) : (
                        <ul className="divide-y divide-(--border) rounded-lg border border-(--border)">
                          {assets.map((a) => (
                            <li key={a._id} className="px-3 py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm text-(--text)">
                                  <span className="capitalize text-(--muted) text-xs mr-1">{a.type.replace("_", " ")}:</span>
                                  {a.name}
                                  {a.identifier && <span className="text-(--muted) text-xs"> · {a.identifier}</span>}
                                </p>
                                <p className="text-[11px] text-(--muted)">
                                  Assigned {new Date(a.assignedAt).toLocaleDateString("en-IN")}
                                  {a.returnedAt ? ` · Returned ${new Date(a.returnedAt).toLocaleDateString("en-IN")}` : ""}
                                </p>
                              </div>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full shrink-0 capitalize"
                                style={
                                  a.status === "assigned"  ? { background: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)" }
                                : a.status === "returned"  ? { background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }
                                : { background: "var(--error-bg)", color: "var(--error-text)" }
                                }>
                                {a.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add new asset */}
                      <form onSubmit={(e) => handleAssetSubmit(s._id, e)}
                        className="grid grid-cols-1 sm:grid-cols-[150px_1fr_1fr_auto] gap-2 items-end pt-3 border-t border-(--border)">
                        <select name="type" required defaultValue=""
                          className="px-2 py-1.5 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text)">
                          <option value="" disabled>Type…</option>
                          {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input name="name" required placeholder="Item name (e.g. MacBook Air M2)"
                          className="px-2 py-1.5 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text)" />
                        <input name="identifier" placeholder="Serial / IMEI / email / reg no."
                          className="px-2 py-1.5 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text)" />
                        <button type="submit"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--accent-contrast)"
                          style={{ background: "var(--accent)" }}>
                          + Assign
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
