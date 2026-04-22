"use client";

import { useState, useEffect } from "react";

type StaffUser = { _id: string; name: string; email: string; role: string; isActive: boolean };

const ROLE_COLORS: Record<string, string> = {
  socialworker: "bg-purple-100 text-purple-700",
  litigation: "bg-indigo-100 text-indigo-700",
  hr: "bg-teal-100 text-teal-700",
  finance: "bg-emerald-100 text-emerald-700",
};

export default function OffboardingPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    fetch("/api/users?role=socialworker,litigation,hr,finance")
      .then((r) => r.json())
      .then((d) => setStaff(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(userId: string, activate: boolean) {
    setProcessing(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/toggle?id=${userId}&active=${activate}`, { method: "POST" });
      if (res.ok) {
        setStaff((prev) => prev.map((s) => s._id === userId ? { ...s, isActive: activate } : s));
        setMessage({ id: userId, text: activate ? "Account reactivated." : "Account deactivated.", type: "ok" });
      } else {
        const d = await res.json();
        setMessage({ id: userId, text: d.error ?? "Action failed.", type: "err" });
      }
    } catch {
      setMessage({ id: userId, text: "Network error.", type: "err" });
    } finally {
      setProcessing(null);
    }
  }

  const active = staff.filter((s) => s.isActive);
  const inactive = staff.filter((s) => !s.isActive);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(text)">Offboarding</h1>
        <p className="text-sm text-(muted) mt-1">
          Deactivate staff accounts when they leave or are terminated. Deactivated accounts cannot log in but all their data is preserved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-green-50 border-green-200 text-green-700">
          <p className="text-2xl font-bold">{active.length}</p>
          <p className="text-xs mt-0.5">Active staff</p>
        </div>
        <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 text-gray-600">
          <p className="text-2xl font-bold">{inactive.length}</p>
          <p className="text-xs mt-0.5">Deactivated</p>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-(muted)">Loading staff…</div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="font-semibold text-(text) mb-3">Active Staff</h2>
              <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
                <div className="divide-y divide-(border)">
                  {active.map((s) => (
                    <div key={s._id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-(text)">{s.name}</p>
                        <p className="text-xs text-(muted)">{s.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] ?? "bg-gray-100 text-gray-600"}`}>{s.role}</span>
                        {message?.id === s._id && (
                          <span className={`text-xs ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>{message.text}</span>
                        )}
                        <button
                          onClick={() => toggle(s._id, false)}
                          disabled={processing === s._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {processing === s._id ? "…" : "Deactivate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <h2 className="font-semibold text-(text) mb-3">Deactivated Accounts</h2>
              <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
                <div className="divide-y divide-(border)">
                  {inactive.map((s) => (
                    <div key={s._id} className="flex items-center justify-between px-5 py-4 opacity-60">
                      <div>
                        <p className="text-sm font-medium text-(text)">{s.name}</p>
                        <p className="text-xs text-(muted)">{s.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                        {message?.id === s._id && (
                          <span className={`text-xs ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>{message.text}</span>
                        )}
                        <button
                          onClick={() => toggle(s._id, true)}
                          disabled={processing === s._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          {processing === s._id ? "…" : "Reactivate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-xs text-amber-700">
          <span className="font-semibold">Note:</span> Deactivating an account does not delete any data. Cases, reports, and history are preserved. The staff member will simply be unable to log in. Reactivation restores full access immediately.
        </p>
      </div>
    </div>
  );
}
