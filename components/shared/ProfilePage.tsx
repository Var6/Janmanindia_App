"use client";

import { useState, useEffect } from "react";
import AvatarUpload from "@/components/shared/AvatarUpload";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { useT, useLang } from "@/components/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  googleEmail?: string;
  googleConnectedAt?: string;
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
  const t = useT();
  const { lang, setLang } = useLang();
  const [profile, setProfile]        = useState<UserProfile | null>(null);
  const [loadingProfile, setLoading] = useState(true);

  const [name, setName]              = useState("");
  const [phone, setPhone]            = useState("");
  const [infoMsg, setInfoMsg]        = useState<{ ok: boolean; text: string } | null>(null);
  const [savingInfo, setSavingInfo]  = useState(false);

  const [avatarUrl, setAvatarUrl]    = useState<string | undefined>();

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

  async function saveAvatarUrl(url: string) {
    setAvatarUrl(url);
    setProfile((p) => p ? { ...p, avatarUrl: url } : p);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    });
  }

  async function removeAvatar() {
    setAvatarUrl(undefined);
    setProfile((p) => p ? { ...p, avatarUrl: undefined } : p);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: "" }),
    });
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
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton w={72} h={72} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton w="60%" h={16} />
            <Skeleton w="40%" h={11} />
          </div>
        </div>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  const displayName = profile?.name ?? "User";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("My Profile")}</h1>
        <p className="text-sm text-(--muted) mt-1">{t("Manage your photo, contact details, language, and password.")}</p>
      </div>

      {/* Language — switches the whole app between English and Hindi. Lives
          here (in the profile) so all personal settings sit in one place. */}
      <section className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">{t("Language")} · भाषा</h2>
        <p className="text-sm text-(--muted) mt-1">{t("Choose the language for the entire app.")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {LANGUAGES.map((l) => {
            const active = lang === l.code;
            return (
              <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={active}
                className="rounded-full border px-5 py-2.5 text-sm font-semibold transition"
                style={{
                  background: active ? "var(--accent)" : "var(--bg)",
                  color: active ? "var(--accent-contrast)" : "var(--text)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                }}>
                {l.native}{active ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </section>

      {/* Avatar */}
      <section className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text) mb-4">{t("Profile Photo")}</h2>
        <AvatarUpload
          currentUrl={avatarUrl}
          name={displayName}
          size={100}
          onUploaded={saveAvatarUrl}
          onRemoved={removeAvatar}
        />
      </section>

      {/* Personal info */}
      <form onSubmit={handleInfoSubmit} className="rounded-2xl border p-6 space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">{t("Personal Information")}</h2>

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

      {/* Google Calendar — only Janman staff (with @janmanindia.org workspace
          accounts) can connect their calendar. Community members don't have
          Workspace, and asking them to "Connect Google Calendar" is just noise
          — appointments they request go through the social worker either way. */}
      {profile?.role && profile.role !== "community" && (
        <GoogleCalendarSection profile={profile} onUpdate={(p) => setProfile(p)} />
      )}

      {/* Password */}
      <form onSubmit={handlePasswordSubmit} className="rounded-2xl border p-6 space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">{t("Change Password")}</h2>

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

function GoogleCalendarSection({ profile, onUpdate }: { profile: UserProfile | null; onUpdate: (p: UserProfile | null) => void }) {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy]     = useState(false);

  // Read ?google=connected|denied|failed|invalid_state from the callback redirect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get("google");
    if (!g) return;
    const map: Record<string, { ok: boolean; text: string }> = {
      connected:    { ok: true,  text: "Google Calendar connected. New appointments will sync automatically." },
      denied:       { ok: false, text: "You declined Google access." },
      failed:       { ok: false, text: "Google sign-in failed. Please try again." },
      invalid_state:{ ok: false, text: "Session expired. Please try again." },
    };
    const m = map[g];
    if (m) setStatus(m);
    // Clean the URL
    sp.delete("google");
    const newUrl = window.location.pathname + (sp.toString() ? `?${sp}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []);

  async function disconnect() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
      if (res.ok) {
        onUpdate(profile ? { ...profile, googleEmail: undefined, googleConnectedAt: undefined } : null);
        setStatus({ ok: true, text: "Disconnected from Google Calendar." });
      } else {
        setStatus({ ok: false, text: "Disconnect failed." });
      }
    } finally { setBusy(false); }
  }

  const connected = Boolean(profile?.googleEmail);

  return (
    <section className="rounded-2xl border p-6 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-(--text)">Google Calendar</h2>
          <p className="text-xs text-(--muted) mt-1">
            Connect your @janmanindia.org calendar so appointments you create here automatically appear on it (and on the other person's).
          </p>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{
            background: connected ? "var(--success-bg)" : "var(--bg-secondary)",
            color: connected ? "var(--success-text)" : "var(--muted)",
          }}>
          {connected ? "✓ Connected" : "Not connected"}
        </span>
      </div>

      {status && <Alert ok={status.ok} text={status.text} />}

      {connected ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-(--text)">
            Linked to <span className="font-medium">{profile?.googleEmail}</span>
          </p>
          <button onClick={disconnect} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60"
            style={{ borderColor: "var(--border)", color: "var(--error-text, #dc2626)", background: "var(--bg)" }}>
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <a href="/api/auth/google/connect"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "white", color: "#3c4043", border: "1px solid #dadce0" }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.005 11.005 0 001 12c0 1.78.43 3.46 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google Calendar
        </a>
      )}
    </section>
  );
}
