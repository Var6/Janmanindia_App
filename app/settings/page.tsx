"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/ui/SessionProvider";
import { useT, useLang } from "@/components/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateProfile, logout } = useSession();
  const t = useT();
  const { lang, setLang } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [about, setAbout] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl);
    setPassword(user.password);
    setAbout(user.about);
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-2xl shadow-black/5">
          <h1 className="text-3xl font-semibold">{t("No active session")}</h1>
          <p className="mt-4 text-[var(--muted)]">{t("Please sign in before updating your profile.")}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-8 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
          >
            {t("Go to Login")}
          </button>
        </div>
      </main>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile({ name, avatarUrl, password, about });
    setMessage(t("Profile saved successfully."));
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-16">
      <div className="mx-auto max-w-7xl space-y-8 px-6 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">{t("Settings")}</p>
              <h1 className="mt-3 text-3xl font-semibold">{t("Profile & Settings")}</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">Update your name, profile image, password, and personal details here.</p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
              >
                {t("Dashboard")}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
              >
                {t("Logout")}
              </button>
            </div>
          </div>
        </div>

        {/* Language — switches the whole app between English and Hindi. */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/5">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t("Language")} · भाषा</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("Choose the language for the entire app.")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={active}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold transition"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg)",
                    color: active ? "var(--accent-contrast)" : "var(--text)",
                    borderColor: active ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {l.native}{active ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/5">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_0.5fr]">
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[var(--text)]">
                    {t("Full name")}
                  </label>
                  <input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[var(--text)]">
                    {t("Email")}
                  </label>
                  <input
                    id="email"
                    value={email}
                    readOnly
                    className="mt-3 w-full cursor-not-allowed rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--muted)] outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="avatar" className="block text-sm font-semibold text-[var(--text)]">
                    Profile picture URL
                  </label>
                  <input
                    id="avatar"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[var(--text)]">
                    {t("Password")}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>

                <div>
                  <label htmlFor="about" className="block text-sm font-semibold text-[var(--text)]">
                    About you
                  </label>
                  <textarea
                    id="about"
                    value={about}
                    onChange={(event) => setAbout(event.target.value)}
                    rows={5}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="Add a short profile bio."
                  />
                </div>

                {message && <p className="text-sm text-emerald-500">{message}</p>}

                <button
                  type="submit"
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
                >
                  {t("Save changes")}
                </button>
              </form>
            </div>

            <aside className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-[var(--border)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted)]">No image</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)]">{user.name}</p>
                  <p className="text-sm text-[var(--muted)]">{user.role}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--text)]">Assigned advocate</p>
                <p className="mt-2">{user.assignedLawyer ?? "None assigned yet"}</p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--text)]">Assigned paralegal</p>
                <p className="mt-2">{user.assignedParalegal ?? "None assigned yet"}</p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--text)]">Next court date</p>
                <p className="mt-2">{user.nextCourtDate ?? "No date scheduled"}</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
