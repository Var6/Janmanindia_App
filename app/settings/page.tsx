"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/ui/SessionProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateProfile, logout } = useSession();
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
          <h1 className="text-3xl font-semibold">No active session</h1>
          <p className="mt-4 text-[var(--muted)]">Please sign in before updating your profile.</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-8 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile({ name, avatarUrl, password, about });
    setMessage("Profile saved successfully.");
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
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">Settings</p>
              <h1 className="mt-3 text-3xl font-semibold">Edit your profile</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">Update your name, profile image, password, and personal details here.</p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/5">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_0.5fr]">
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[var(--text)]">
                    Full name
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
                    Email
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
                    Password
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
                  Save changes
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
