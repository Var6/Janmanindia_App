"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import Spotlight from "@/components/ui/Spotlight";

const ID_TYPES: { value: string; label: string; hi?: string }[] = [
  { value: "Aadhar",         label: "Aadhaar",         hi: "आधार" },
  { value: "VoterId",        label: "Voter ID",        hi: "मतदाता पहचान पत्र" },
  { value: "RationCard",     label: "Ration card",     hi: "राशन कार्ड" },
  { value: "DrivingLicense", label: "Driving license", hi: "ड्राइविंग लाइसेंस" },
  { value: "Passport",       label: "Passport",        hi: "पासपोर्ट" },
  { value: "Other",          label: "Other",           hi: "अन्य" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [idDocUrl, setIdDocUrl] = useState<string>("");
  const [uploadingId, setUploadingId] = useState(false);
  const idFileRef = useRef<HTMLInputElement>(null);

  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [voiceDur, setVoiceDur] = useState(0);

  async function uploadIdDoc(file: File) {
    setUploadingId(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "ID upload failed."); return; }
      setIdDocUrl(data.url);
      setError(null);
    } finally {
      setUploadingId(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const fd = new FormData(event.currentTarget);
    const payload = {
      name:              String(fd.get("name") ?? "").trim(),
      email:             String(fd.get("email") ?? "").trim(),
      password:          String(fd.get("password") ?? ""),
      phone:             String(fd.get("phone") ?? "").trim() || undefined,
      district:          String(fd.get("district") ?? "").trim() || undefined,
      village:           String(fd.get("village") ?? "").trim() || undefined,
      preferredLanguage: String(fd.get("preferredLanguage") ?? "").trim() || undefined,
      govtIdType:        String(fd.get("govtIdType") ?? ""),
      govtIdUrl:         idDocUrl || undefined,
      voiceIntroUrl:     voiceUrl || undefined,
      voiceIntroDurationSec: voiceUrl ? voiceDur : undefined,
    };

    if (!payload.govtIdUrl && !payload.voiceIntroUrl) {
      setError("Attach an ID document OR record a short voice intro so a social worker can verify you.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
      } else {
        setSuccess(data.message ?? "Registration submitted. A social worker will reach out shortly.");
        setTimeout(() => router.push("/login"), 2800);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-(--text)">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">

        {/* Brand row */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Janman" width={36} height={36} priority
              className="rounded-lg object-contain" style={{ border: "1px solid var(--border)" }} />
            <div>
              <p className="text-sm font-bold text-(--text) leading-none tracking-tight">Janman</p>
              <p className="text-[10px] text-(--muted) mt-0.5 uppercase tracking-widest">Legal Aid · निःशुल्क कानूनी सहायता</p>
            </div>
          </Link>
          <Link href="/login" className="text-sm font-medium text-(--muted) hover:text-(--text) transition-colors">
            Already registered? Sign in →
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,460px)] items-start">

          {/* ── Welcome / blog side ─────────────────────────────────────────── */}
          <article className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl glass p-7">
              <Spotlight color="var(--accent)" />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                  Free legal aid · Bihar
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-(--text)">
                  Welcome.
                  <span className="block text-xl sm:text-2xl mt-2 font-medium" style={{ color: "var(--muted)" }}>
                    आप अकेले नहीं हैं — हम आपके साथ हैं।
                  </span>
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-(--text)" style={{ opacity: 0.85 }}>
                  Janman People&apos;s Foundation runs <span className="font-semibold">Jan Nyay Abhiyan</span>, a movement that connects people facing
                  injustice — domestic violence, false FIRs, evictions, denial of entitlements, child rights violations — with
                  trained social workers and District Legal Fellows working free of charge across Bihar and beyond.
                </p>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  आप जो बता रहे हैं वो गोपनीय है। आपकी जानकारी सिर्फ़ आपके सामाजिक कार्यकर्ता और वकील देख सकते हैं।
                </p>
              </div>
            </section>

            <section className="rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <h2 className="text-base font-bold text-(--text)">What happens after you register?</h2>
              <ol className="mt-3 space-y-3">
                {[
                  ["📥", "We receive your registration", "A social worker in your district reviews your details — usually within 48 hours."],
                  ["📞", "A social worker calls you", "They listen to your story (in your language), and confirm what kind of help you need."],
                  ["⚖️", "A lawyer is assigned to your case", "If your case needs court action, our District Legal Fellow takes it up — free of cost."],
                  ["🤝", "You're never alone in the process", "Your social worker stays in touch — through the case, schemes, counselling, and follow-up."],
                ].map(([icon, title, body], i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-(--text)">{title}</p>
                      <p className="text-xs text-(--muted) mt-0.5 leading-relaxed">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border p-6 space-y-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <h2 className="text-base font-bold text-(--text)">Can&apos;t read or write?</h2>
              <p className="text-sm text-(--muted) leading-relaxed">
                Tap the <span className="font-semibold text-(--text)">🎤 Record voice introduction</span> button on the form
                instead of writing anything. Tell us your name, where you live, and what happened — in <span className="font-semibold">Hindi, Maithili, Bhojpuri, Urdu</span> or any language you&apos;re comfortable in.
                A social worker will listen and call you back.
              </p>
              <p className="text-sm text-(--muted) leading-relaxed">
                आप पढ़-लिख नहीं सकते? बस माइक का बटन दबाएँ और अपनी बात बोलें। एक सामाजिक कार्यकर्ता आपको वापस फ़ोन करेगा।
              </p>
            </section>

            <section className="rounded-2xl p-5 text-xs leading-relaxed"
              style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
              <p className="font-semibold text-(--text)">A note on privacy</p>
              <p className="mt-1 text-(--muted)">
                Janman never shares your information with police, employer, family member, or anyone else without your written
                consent. Your records are encrypted at rest and only your assigned social worker and lawyer can read them.
                If you change your mind, you can delete your account from your profile at any time.
              </p>
            </section>
          </article>

          {/* ── Form side ───────────────────────────────────────────────────── */}
          <section className="rounded-2xl border p-6 sticky top-6"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                Register
              </p>
              <h2 className="text-xl font-bold text-(--text) mt-1">New community member</h2>
              <p className="text-xs text-(--muted) mt-1">
                Fields marked <span style={{ color: "var(--error)" }}>*</span> are required. Everything else helps us help you faster.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name (पूरा नाम)" required>
                <input name="name" required type="text" autoComplete="name" placeholder="Your name as on ID"
                  className="form-input" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone (मोबाइल)" required>
                  <input name="phone" required type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 99999 99999"
                    className="form-input" />
                </Field>
                <Field label="Preferred language">
                  <select name="preferredLanguage" defaultValue="" className="form-input">
                    <option value="">Choose…</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Maithili">Maithili (मैथिली)</option>
                    <option value="Bhojpuri">Bhojpuri (भोजपुरी)</option>
                    <option value="Urdu">Urdu (اردو)</option>
                    <option value="English">English</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>

              <Field label="Email (so we can reach you)" required>
                <input name="email" required type="email" autoComplete="email" placeholder="you@example.com"
                  className="form-input" />
              </Field>

              <Field label="Password (8+ characters)" required>
                <input name="password" required type="password" minLength={8} autoComplete="new-password"
                  className="form-input" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="District (ज़िला)">
                  <input name="district" type="text" placeholder="e.g. Patna / Purnia"
                    className="form-input" />
                </Field>
                <Field label="Village / area (गाँव / मोहल्ला)">
                  <input name="village" type="text" placeholder="optional"
                    className="form-input" />
                </Field>
              </div>

              {/* ID document */}
              <fieldset className="rounded-xl border p-3 space-y-2"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <legend className="text-xs font-semibold text-(--text) px-1">ID document (or skip and record voice below)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <select name="govtIdType" defaultValue="" className="form-input">
                    <option value="">Choose…</option>
                    {ID_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}{t.hi ? ` · ${t.hi}` : ""}</option>
                    ))}
                  </select>
                  <input ref={idFileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIdDoc(f); e.target.value = ""; }} />
                  {idDocUrl ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs"
                      style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)", color: "var(--success-text)" }}>
                      <span>✓ ID attached</span>
                      <button type="button" onClick={() => setIdDocUrl("")}
                        className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                        Replace
                      </button>
                    </div>
                  ) : (
                    <button type="button" disabled={uploadingId} onClick={() => idFileRef.current?.click()}
                      className="px-3 py-2 rounded-lg border text-xs font-medium disabled:opacity-50"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }}>
                      {uploadingId ? "Uploading…" : "📎 Upload ID (PDF / image)"}
                    </button>
                  )}
                </div>
              </fieldset>

              {/* Voice intro */}
              <fieldset className="rounded-xl border p-3 space-y-2"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <legend className="text-xs font-semibold text-(--text) px-1">Voice introduction (आवाज़ में परिचय)</legend>
                {voiceUrl ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)" }}>
                    <span className="text-lg">🎤</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--success-text)" }}>Voice recorded ({voiceDur}s)</p>
                      <audio controls preload="metadata" src={voiceUrl} className="block w-full mt-1" />
                    </div>
                    <button type="button" onClick={() => { setVoiceUrl(""); setVoiceDur(0); }}
                      className="text-[11px] px-2 py-0.5 rounded shrink-0"
                      style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      Re-record
                    </button>
                  </div>
                ) : (
                  <VoiceRecorder onUploaded={(url, dur) => { setVoiceUrl(url); setVoiceDur(dur); }} />
                )}
              </fieldset>

              {error && (
                <div className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)" }}>
                  ✓ {success}
                </div>
              )}

              <button type="submit" disabled={loading || uploadingId}
                className="w-full rounded-xl py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
                {loading ? "Submitting…" : "Submit registration"}
              </button>

              <p className="text-[11px] text-(--muted) text-center leading-relaxed">
                By registering you agree that a Janman social worker may contact you.
                Your information stays private. <Link href="/policies" className="underline hover:text-(--text)">Read our policies</Link>.
              </p>
            </form>
          </section>
        </div>
      </div>

      <style jsx>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 0.6rem 0.85rem;
          font-size: 0.875rem;
          color: var(--text);
          outline: none;
        }
        .form-input:focus { border-color: var(--accent); }
      `}</style>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-(--text) mb-1.5">
        {label}{required && <span style={{ color: "var(--error)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}
