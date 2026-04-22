"use client";

import { useState, useEffect } from "react";

type StaffUser = { _id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string };

export default function OnboardingPage() {
  const [tab, setTab] = useState<"onboard" | "active">("onboard");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/users?role=socialworker,litigation,hr,finance")
      .then((r) => r.json())
      .then((d) => setStaff(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleOnboard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          role: fd.get("role"),
          phone: fd.get("phone"),
          ...(fd.get("role") === "litigation" ? {
            barCouncilId: fd.get("barCouncilId"),
            location: fd.get("location"),
          } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create account.");
      } else {
        const d = await res.json();
        setStaff((prev) => [...prev, d.user]);
        setSuccess(`${(fd.get("name") as string)} onboarded successfully.`);
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeStaff = staff.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(text)">Onboarding</h1>
        <p className="text-sm text-(muted) mt-1">Create accounts for social workers, litigation team, HR, and finance staff.</p>
      </div>

      <div className="flex gap-1 p-1 bg-(surface) border border-(border) rounded-xl w-fit">
        {(["onboard", "active"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-(accent) text-(accent-contrast)" : "text-(muted) hover:text-(text)"}`}
          >
            {t === "onboard" ? "New Staff" : `Active Staff (${activeStaff.length})`}
          </button>
        ))}
      </div>

      {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {tab === "onboard" ? (
        <form onSubmit={handleOnboard} className="bg-(surface) rounded-2xl border border-(border) p-6 space-y-5">
          <h2 className="font-semibold text-(text)">New Staff Account</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input name="name" required placeholder="Full name" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Email <span className="text-red-500">*</span></label>
              <input name="email" type="email" required placeholder="email@example.com" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Phone</label>
              <input name="phone" type="tel" placeholder="+91 XXXXX XXXXX" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Role <span className="text-red-500">*</span></label>
              <select name="role" required className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40">
                <option value="">Select role…</option>
                <option value="socialworker">Social Worker</option>
                <option value="litigation">Litigation Team</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
              <input name="password" type="password" required minLength={8} placeholder="Min 8 characters" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Bar Council ID <span className="text-xs text-(muted)">(Litigation only)</span></label>
              <input name="barCouncilId" placeholder="BCI/UP/XXXX/XXXX" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-(text) mb-1.5">Location / District <span className="text-xs text-(muted)">(Litigation only)</span></label>
              <input name="location" placeholder="e.g. Lucknow" className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 disabled:opacity-60">
            {submitting ? "Creating account…" : "Create Staff Account"}
          </button>
        </form>
      ) : (
        <section>
          {loading ? (
            <div className="py-10 text-center text-sm text-(muted)">Loading staff…</div>
          ) : activeStaff.length === 0 ? (
            <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
              <p className="text-sm text-(muted)">No active staff found.</p>
            </div>
          ) : (
            <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
              <div className="divide-y divide-(border)">
                {activeStaff.map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-(text)">{s.name}</p>
                      <p className="text-xs text-(muted)">{s.email} · Joined {new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-(accent)/10 text-(accent)">{s.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
