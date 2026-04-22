"use client";

import { useState, useEffect, useRef } from "react";

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
};

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <svg className={`animate-spin ${sm ? "w-4 h-4" : "w-5 h-5"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function ProfilePage() {
  const [profile, setProfile]        = useState<UserProfile | null>(null);
  const [loadingProfile, setLoading] = useState(true);

  const [name, setName]              = useState("");
  const [phone, setPhone]            = useState("");
  const [infoMsg, setInfoMsg]        = useState<{ ok: boolean; text: string } | null>(null);
  const [savingInfo, setSavingInfo]  = useState(false);

  const [avatarUrl, setAvatarUrl]    = useState<string | undefined>();
  const [uploading, setUploading]    = useState(false);
  const fileRef                      = useRef<HTMLInputElement>(null);

  const [curPw, setCurPw]            = useState("");
  const [newPw, setNewPw]            = useState("");
  const [confirmPw, setConfirmPw]    = useState("");
  const [pwMsg, setPwMsg]            = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw]      = useState(false);
  const [showCur, setShowCur]        = useState(false);
  const [showNew, setShowNew]        = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile(d.user);
          setName(d.user.name ?? "");
          setPhone(d.user.phone ?? "");
          setAvatarUrl(d.user.avatarUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarChange(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes  = await fetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { alert(uploadData.error ?? "Upload failed"); return; }

      const patchRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadData.url }),
      });
      if (patchRes.ok) {
        setAvatarUrl(uploadData.url);
        setProfile((p) => p ? { ...p, avatarUrl: uploadData.url } : p);
      } else {
        const d = await patchRes.json();
        alert(d.error ?? "Failed to save avatar");
      }
    } catch {
      alert("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setProfile((p) => p ? { ...p, name: name.trim(), phone: phone.trim() } : p);
        setInfoMsg({ ok: true, text: "Profile updated successfully." });
      } else {
        setInfoMsg({ ok: false, text: d.error ?? "Update failed." });
      }
    } catch {
      setInfoMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingInfo(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "New passwords do not match." }); return; }
    if (newPw.length < 8)    { setPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    setSavingPw(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg({ ok: true, text: "Password changed successfully." });
        setCurPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setPwMsg({ ok: false, text: d.error ?? "Password change failed." });
      }
    } catch {
      setPwMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingPw(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20 text-(--muted)">
        <Spinner />
      </div>
    );
  }

  const displayName = profile?.name ?? "User";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">My Profile</h1>
        <p className="text-sm text-(--muted) mt-1">Manage your photo, contact details, and password.</p>
      </div>

      {/* Avatar */}
      <section className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text) mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center text-xl font-bold"
              style={{ borderColor: "var(--accent)", background: "var(--bg-secondary)", color: "var(--accent)" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                : initials(displayName)
              }
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}>
                <Spinner sm />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M7 3a2 2 0 00-1.732 1H4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.268A2 2 0 0013 3H7zm3 3a4 4 0 110 8 4 4 0 010-8zm0 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
              </svg>
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <p className="text-xs text-(--muted)">JPG, PNG or WebP · max 5 MB</p>
          </div>
        </div>
      </section>

      {/* Personal info */}
      <form onSubmit={handleInfoSubmit} className="rounded-2xl border p-6 space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">Personal Information</h2>

        {infoMsg && (
          <Alert ok={infoMsg.ok} text={infoMsg.text} />
        )}

        <Field label="Email">
          <input value={profile?.email ?? ""} disabled
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm cursor-not-allowed"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--muted)" }}
          />
          <p className="text-xs text-(--muted) mt-1">Email cannot be changed.</p>
        </Field>

        <Field label="Full Name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name"
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </Field>

        <Field label="Phone Number">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999"
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </Field>

        <button type="submit" disabled={savingInfo}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {savingInfo ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordSubmit} className="rounded-2xl border p-6 space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">Change Password</h2>

        {pwMsg && <Alert ok={pwMsg.ok} text={pwMsg.text} />}

        <PasswordField label="Current Password"      value={curPw}     onChange={setCurPw}     show={showCur} onToggle={() => setShowCur(!showCur)} />
        <PasswordField label="New Password"          value={newPw}     onChange={setNewPw}     show={showNew} onToggle={() => setShowNew(!showNew)} hint="Minimum 8 characters" />
        <PasswordField label="Confirm New Password"  value={confirmPw} onChange={setConfirmPw} show={showNew} onToggle={() => setShowNew(!showNew)} />

        <button type="submit" disabled={savingPw || !curPw || !newPw || !confirmPw}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {savingPw ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function Alert({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="p-3 rounded-lg text-sm"
      style={{
        background: ok ? "var(--success-bg)" : "var(--error-bg)",
        color:      ok ? "var(--success-text)" : "var(--error-text)",
        border:     `1px solid color-mix(in srgb,${ok ? "var(--success)" : "var(--error)"} 25%,transparent)`,
      }}>
      {ok ? "✓ " : "✗ "}{text}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-(--text) mb-1.5">
        {label} {required && <span style={{ color: "var(--error)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; hint?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 pr-11 rounded-xl border text-sm focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--text)">
          {show
            ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 3C5 3 1.73 7.11 1.06 9.94c-.09.38-.09.74 0 1.12C1.73 13.89 5 17 10 17s8.27-3.11 8.94-5.94c.09-.38.09-.74 0-1.12C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/></svg>
            : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.64-1.64A9.87 9.87 0 0018.94 11.06a1.08 1.08 0 000-1.12C18.27 7.11 15 3 10 3c-1.55 0-3 .37-4.27 1.01L3.28 2.22zM10 5c.64 0 1.26.1 1.85.28L10.5 6.62A2.5 2.5 0 007.62 9.5L6.27 8.15A4 4 0 0110 5zm-4.8 2.47l1.37 1.37A4 4 0 0010 14a3.96 3.96 0 002.06-.58l1.37 1.37A8.1 8.1 0 0110 15.5c-3.86 0-6.67-2.8-7.44-5.5.31-1.08.9-2.18 1.72-3.06l.92.53z"/></svg>
          }
        </button>
      </div>
      {hint && <p className="text-xs text-(--muted) mt-1">{hint}</p>}
    </Field>
  );
}
