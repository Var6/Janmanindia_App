"use client";

import { useState, useEffect, useCallback } from "react";
import OnboardingDocsFields, { EMPTY_DOCS, type OnboardingDocs } from "@/components/hr/OnboardingDocsFields";
import { checkOnboardingDocs, missingOnboardingDocs, onboardingCompleteness, type OnboardingDocsLike } from "@/lib/onboarding-docs";

type StaffUser = {
  _id: string; name: string; email: string; phone?: string; role: string;
  isActive: boolean; employeeId?: string; joinedAt?: string; createdAt: string;
  onboardingDocs?: OnboardingDocsLike;
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
  const [docs, setDocs] = useState<OnboardingDocs>(EMPTY_DOCS);

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
      const onboardingPayload =
        docs.panUrl || docs.aadharUrl || docs.cvUrl ||
        docs.priorExperience || docs.bankAccount.accountNumber ||
        docs.academicDocs.length || docs.otherDocs.length || docs.emergencyContact.name
          ? docs
          : undefined;

      const res = await fetch("/api/hr/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          role: fd.get("role"),
          phone: fd.get("phone"),
          project: fd.get("project"),
          barCouncilId: fd.get("barCouncilId"),
          district: fd.get("district"),
          city: fd.get("city"),
          onboardingDocs: onboardingPayload,
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
        setDocs(EMPTY_DOCS);
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
              <label className="block text-sm font-medium text-(--text) mb-1.5">
                Project Code <span className="text-red-500">*</span>
                <span className="ml-1 text-[11px] font-normal text-(--muted)">3 letters · used in Employee ID</span>
              </label>
              <input name="project" required maxLength={3} pattern="[A-Za-z]{3}"
                placeholder="JNA"
                onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, ""); }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm uppercase tracking-widest font-mono focus:outline-none focus:border-(--accent)" />
              <p className="text-[11px] text-(--muted) mt-1 italic">e.g. JNA · DLF · COR — generates JPF/JNA/26/01</p>
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

          <OnboardingDocsFields value={docs} onChange={setDocs} />

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
              const docCompletion = onboardingCompleteness(s.onboardingDocs);
              const docsMissing = missingOnboardingDocs(s.onboardingDocs);
              const isDocComplete = docsMissing.length === 0;
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
                    <div className="flex items-center gap-2 shrink-0">
                      {!isDocComplete && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1"
                          style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                          ⚠ {docsMissing.length} doc{docsMissing.length === 1 ? "" : "s"} missing · {docCompletion.pct}%
                        </span>
                      )}
                      {isDocComplete && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>✓ docs complete</span>
                      )}
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
                      {/* Onboarding documents — show what's missing + inline editor */}
                      <StaffDocsBlock staff={s} onSaved={loadStaff} />

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

/**
 * Per-staff onboarding-docs block. Reads the user's existing docs from /api/hr/staff/[id]/docs
 * (which has the freshest copy), shows a checklist of what's missing, and lets HR edit.
 */
function StaffDocsBlock({ staff, onSaved }: { staff: StaffUser; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [docs, setDocs] = useState<OnboardingDocs>(() => normaliseDocs(staff.onboardingDocs));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const checks = checkOnboardingDocs(docs);
  const missing = checks.filter(c => !c.present);
  const completion = onboardingCompleteness(docs);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/hr/staff/${staff._id}/docs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDocs: docs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Save failed." });
      } else {
        setMsg({ ok: true, text: "Saved." });
        setEditing(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-(--text)">Onboarding documents</h3>
          <p className="text-xs text-(--muted) mt-0.5">
            {completion.present}/{completion.total} collected ({completion.pct}%)
          </p>
        </div>
        <button onClick={() => { setEditing(s => !s); setMsg(null); }}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: editing ? "var(--bg-secondary)" : "var(--accent)", color: editing ? "var(--muted)" : "var(--accent-contrast)" }}>
          {editing ? "Cancel" : (missing.length === 0 ? "Edit" : "Complete profile")}
        </button>
      </div>

      {missing.length > 0 && !editing && (
        <ul className="space-y-1">
          {missing.map(m => (
            <li key={m.key} className="text-xs flex items-center gap-2 text-(--text)">
              <span style={{ color: "var(--warning-text)" }}>⚠</span>
              {m.label}
            </li>
          ))}
        </ul>
      )}

      {missing.length === 0 && !editing && (
        <p className="text-xs" style={{ color: "var(--success-text)" }}>✓ All required documents collected.</p>
      )}

      {msg && (
        <p className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: msg.ok ? "var(--success-bg)" : "var(--error-bg)", color: msg.ok ? "var(--success-text)" : "var(--error-text)" }}>
          {msg.text}
        </p>
      )}

      {editing && (
        <div className="space-y-3">
          <OnboardingDocsFields value={docs} onChange={setDocs}
            title="Documentation" intro="Upload or paste in details that are missing. Saved straight to this staff member's profile."
          />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {saving ? "Saving…" : "Save documents"}
            </button>
            <button onClick={() => { setEditing(false); setDocs(normaliseDocs(staff.onboardingDocs)); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Make a sparse server document safe for the controlled OnboardingDocsFields form. */
function normaliseDocs(d?: OnboardingDocsLike | null): OnboardingDocs {
  return {
    panUrl:    d?.panUrl,
    aadharUrl: d?.aadharUrl,
    bankAccount: {
      holder:        d?.bankAccount?.holder,
      accountNumber: d?.bankAccount?.accountNumber,
      ifsc:          d?.bankAccount?.ifsc,
      bankName:      d?.bankAccount?.bankName,
    },
    cvUrl: d?.cvUrl,
    academicDocs: (d?.academicDocs ?? []).map(x => ({ label: x.label ?? "", url: x.url ?? "" })),
    priorExperience: d?.priorExperience,
    emergencyContact: {
      name:     d?.emergencyContact?.name,
      phone:    d?.emergencyContact?.phone,
      relation: d?.emergencyContact?.relation,
    },
    otherDocs: (d?.otherDocs ?? []).map(x => ({ label: x.label ?? "", url: x.url ?? "" })),
  };
}
