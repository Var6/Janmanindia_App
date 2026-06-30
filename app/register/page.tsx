"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import Spotlight from "@/components/ui/Spotlight";
import { useT } from "@/components/i18n/LanguageProvider";
import { CASE_ISSUES, JANMAN_DISTRICTS } from "@/lib/case-issues";

export default function RegisterPage() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // ── Mandatory ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");

  // ── Optional enquiry facts ────────────────────────────────────────────────
  const [pocAddress, setPocAddress] = useState("");
  const [victimName, setVictimName] = useState("");
  const [victimAddress, setVictimAddress] = useState("");
  const [relationship, setRelationship] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [otherIssue, setOtherIssue] = useState("");
  const [accusedNames, setAccusedNames] = useState("");
  const [accusedCount, setAccusedCount] = useState("");
  const [facts, setFacts] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState("");
  const [incidentDateTime, setIncidentDateTime] = useState("");
  const [district, setDistrict] = useState("");

  const [docs, setDocs] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [voiceDur, setVoiceDur] = useState(0);

  // ── Optional login ────────────────────────────────────────────────────────
  const [wantLogin, setWantLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function toggleIssue(value: string) {
    setIssues((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function uploadDoc(file: File) {
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("Document upload failed.")); return; }
      setDocs((prev) => [...prev, data.url]);
      setError(null);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim())     { setError(t("Name is required.")); return; }
    if (!phone.trim())    { setError(t("Mobile number is required.")); return; }
    if (!pocName.trim() || !pocPhone.trim()) {
      setError(t("A point of contact (name and phone number) is required."));
      return;
    }
    if (wantLogin) {
      if (!email.trim())       { setError(t("Enter an email to create a login.")); return; }
      if (password.length < 8) { setError(t("Password must be at least 8 characters.")); return; }
    }

    setLoading(true);

    // "Other" issue free-text is folded into the facts since the issue list is
    // a controlled vocabulary on the case enquiry.
    const factsCombined = [facts.trim(), otherIssue.trim() ? `Other: ${otherIssue.trim()}` : ""]
      .filter(Boolean).join("\n");

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      pointOfContact: { name: pocName.trim(), phone: pocPhone.trim(), address: pocAddress.trim() || undefined },
      district: district || undefined,
      ...(wantLogin ? { email: email.trim(), password } : {}),
      ...(voiceUrl ? { voiceIntroUrl: voiceUrl, voiceIntroDurationSec: voiceDur } : {}),
      ...(docs.length ? { intakeDocs: docs } : {}),
      enquiry: {
        relationshipWithVictim: relationship.trim() || undefined,
        victimName: victimName.trim() || undefined,
        victimAddress: victimAddress.trim() || undefined,
        issues,
        accusedNames: accusedNames.trim() || undefined,
        accusedCount: accusedCount.trim() ? Number(accusedCount) : undefined,
        factsOfTheCase: factsCombined || undefined,
        firNumber: firNumber.trim() || undefined,
        policeStation: policeStation.trim() || undefined,
        placeOfOccurrence: placeOfOccurrence.trim() || undefined,
        incidentDateTime: incidentDateTime || undefined,
      },
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string; message?: string; redirectTo?: string; account?: string };
      if (!res.ok) {
        setError(data.error ?? t("Submission failed."));
        setLoading(false);
        return;
      }
      // Login account → land them inside /community. Passwordless enquiry →
      // show a confirmation since there's nothing to log into.
      if (data.account === "login" && data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      setDone(data.message ?? t("Enquiry received. A social worker will reach out within 48 hours."));
      setLoading(false);
    } catch {
      setError(t("Network error — please try again."));
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
              <p className="text-[10px] text-(--muted) mt-0.5 uppercase tracking-widest">{t("Legal Aid")} · निःशुल्क कानूनी सहायता</p>
            </div>
          </Link>
          <Link href="/login" className="text-sm font-medium text-(--muted) hover:text-(--text) transition-colors">
            {t("Already registered? Sign in →")}
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,520px)] items-start">

          {/* ── Welcome / blog side ─────────────────────────────────────────── */}
          <article className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl glass p-7">
              <Spotlight color="var(--accent)" />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                  {t("Free legal aid · Bihar")}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-(--text)">
                  {t("Case Enquiry")}
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
              <h2 className="text-base font-bold text-(--text)">{t("What happens after you fill this form?")}</h2>
              <ol className="mt-3 space-y-3">
                {[
                  ["📥", t("We receive your enquiry"), t("A social worker in your district reviews your details — usually within 48 hours.")],
                  ["📞", t("A social worker calls you"), t("They listen to your story (in your language), and confirm what kind of help you need.")],
                  ["⚖️", t("A lawyer is assigned to your case"), t("If your case needs court action, our District Legal Fellow takes it up — free of cost.")],
                  ["🤝", t("You're never alone in the process"), t("Your social worker stays in touch — through the case, schemes, counselling, and follow-up.")],
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
              <h2 className="text-base font-bold text-(--text)">{t("Can't read or write?")}</h2>
              <p className="text-sm text-(--muted) leading-relaxed">
                Tap the <span className="font-semibold text-(--text)">🎤 Record voice description</span> button on the form
                instead of writing anything. Tell us your name, where you live, and what happened — in <span className="font-semibold">Hindi, Maithili, Bhojpuri, Urdu</span> or any language you&apos;re comfortable in.
                A social worker will listen and call you back.
              </p>
              <p className="text-sm text-(--muted) leading-relaxed">
                आप पढ़-लिख नहीं सकते? बस माइक का बटन दबाएँ और अपनी बात बोलें। एक सामाजिक कार्यकर्ता आपको वापस फ़ोन करेगा।
              </p>
            </section>

            <section className="rounded-2xl p-5 text-xs leading-relaxed"
              style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
              <p className="font-semibold text-(--text)">{t("A note on privacy")}</p>
              <p className="mt-1 text-(--muted)">
                {t("Janman never shares your information with police, employer, family member, or anyone else without your written consent. Your records are encrypted at rest and only your assigned social worker and lawyer can read them.")}
              </p>
            </section>
          </article>

          {/* ── Form side ───────────────────────────────────────────────────── */}
          <section className="rounded-2xl border p-6 sticky top-6"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                {t("Case Enquiry Form")}
              </p>
              <h2 className="text-xl font-bold text-(--text) mt-1">{t("Tell us what happened")}</h2>
              <p className="text-xs text-(--muted) mt-1">
                Fields marked <span style={{ color: "var(--error)" }}>*</span> are required. Everything else is optional — share what you can.
              </p>
            </div>

            {done ? (
              <div className="p-6 rounded-2xl text-center space-y-3"
                style={{ background: "var(--success-bg)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}>
                <div className="text-3xl">✓</div>
                <p className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>{done}</p>
                <Link href="/" className="inline-block text-xs font-medium underline" style={{ color: "var(--success-text)" }}>
                  {t("Back to home")}
                </Link>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              <Field label={t("Name / नाम")} required>
                <input value={name} onChange={(e) => setName(e.target.value)} required type="text" autoComplete="name"
                  placeholder={t("Your full name")} className="form-input" />
              </Field>

              <Field label={t("Phone Number / फ़ोन नंबर")} required>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" inputMode="tel"
                  autoComplete="tel" placeholder="+91 99999 99999" className="form-input" />
              </Field>

              {/* Point of contact — mandatory */}
              <fieldset className="rounded-xl border p-3 space-y-3"
                style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))", background: "var(--bg)" }}>
                <legend className="text-xs font-semibold text-(--text) px-1">
                  {t("Point of Contact")} <span style={{ color: "var(--error)" }}>*</span>
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("Contact name")} required>
                    <input value={pocName} onChange={(e) => setPocName(e.target.value)} required type="text"
                      placeholder={t("Who should we call?")} className="form-input" />
                  </Field>
                  <Field label={t("Contact mobile")} required>
                    <input value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} required type="tel" inputMode="tel"
                      placeholder="+91 99999 99999" className="form-input" />
                  </Field>
                </div>
                <Field label={t("Contact address")}>
                  <input value={pocAddress} onChange={(e) => setPocAddress(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("Victim's Name / पीड़ित का नाम")}>
                  <input value={victimName} onChange={(e) => setVictimName(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
                <Field label={t("Relationship with victim")}>
                  <input value={relationship} onChange={(e) => setRelationship(e.target.value)} type="text"
                    placeholder={t("self · father · sister · neighbour")} className="form-input" />
                </Field>
              </div>

              <Field label={t("Address")}>
                <textarea value={victimAddress} onChange={(e) => setVictimAddress(e.target.value)} rows={2}
                  placeholder={t("Where does the victim live?")} className="form-input resize-y" />
              </Field>

              <Field label={t("District")}>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="form-input">
                  <option value="">{t("Choose…")}</option>
                  {JANMAN_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>

              {/* Issues multi-select */}
              <div>
                <span className="block text-xs font-semibold text-(--text) mb-1.5">{t("Issues")}</span>
                <div className="flex flex-wrap gap-2">
                  {CASE_ISSUES.map((iss) => {
                    const on = issues.includes(iss.value);
                    return (
                      <button key={iss.value} type="button" onClick={() => toggleIssue(iss.value)}
                        className="px-2.5 py-1 rounded-lg border text-xs transition-colors"
                        style={{
                          borderColor: on ? "var(--accent)" : "var(--border)",
                          background: on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--bg)",
                          color: on ? "var(--accent)" : "var(--text)",
                        }}>
                        {iss.value}{iss.hi ? ` · ${iss.hi}` : ""}
                      </button>
                    );
                  })}
                </div>
                <input value={otherIssue} onChange={(e) => setOtherIssue(e.target.value)} type="text"
                  placeholder={t("Other (describe)…")} className="form-input mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("Name/s of Accused")}>
                  <input value={accusedNames} onChange={(e) => setAccusedNames(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
                <Field label={t("Total no. of accused")}>
                  <input value={accusedCount} onChange={(e) => setAccusedCount(e.target.value)} type="number" min={0}
                    placeholder="0" className="form-input" />
                </Field>
              </div>

              <Field label={t("Facts of the case")}>
                <textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={4}
                  placeholder={t("What happened? Tell us in your own words.")} className="form-input resize-y" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("FIR No. (if filed)")}>
                  <input value={firNumber} onChange={(e) => setFirNumber(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
                <Field label={t("Police Station")}>
                  <input value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
                <Field label={t("Place of Occurrence")}>
                  <input value={placeOfOccurrence} onChange={(e) => setPlaceOfOccurrence(e.target.value)} type="text"
                    placeholder={t("optional")} className="form-input" />
                </Field>
                <Field label={t("Date and Time of incident")}>
                  <input value={incidentDateTime} onChange={(e) => setIncidentDateTime(e.target.value)}
                    type="datetime-local" className="form-input" />
                </Field>
              </div>

              {/* Relevant documents */}
              <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <legend className="text-xs font-semibold text-(--text) px-1">{t("Relevant documents, if available")}</legend>
                <input ref={docFileRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ""; }} />
                <button type="button" disabled={uploadingDoc} onClick={() => docFileRef.current?.click()}
                  className="px-3 py-2 rounded-lg border text-xs font-medium disabled:opacity-50"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }}>
                  {uploadingDoc ? t("Uploading…") : t("📎 Attach a document (PDF / image)")}
                </button>
                {docs.length > 0 && (
                  <ul className="space-y-1">
                    {docs.map((u, i) => (
                      <li key={u} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                        style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
                        <span>✓ {t("Document")} {i + 1}</span>
                        <button type="button" onClick={() => setDocs((prev) => prev.filter((x) => x !== u))}
                          className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                          {t("Remove")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              {/* Voice description */}
              <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <legend className="text-xs font-semibold text-(--text) px-1">{t("Voice description (आवाज़ में बताएँ)")}</legend>
                {voiceUrl ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)" }}>
                    <span className="text-lg">🎤</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--success-text)" }}>{t("Voice recorded")} ({voiceDur}s)</p>
                      <audio controls preload="metadata" src={voiceUrl} className="block w-full mt-1" />
                    </div>
                    <button type="button" onClick={() => { setVoiceUrl(""); setVoiceDur(0); }}
                      className="text-[11px] px-2 py-0.5 rounded shrink-0" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      {t("Re-record")}
                    </button>
                  </div>
                ) : (
                  <VoiceRecorder onUploaded={(url, dur) => { setVoiceUrl(url); setVoiceDur(dur); }} />
                )}
              </fieldset>

              {/* Optional login */}
              <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border px-3.5 py-2.5"
                style={{ borderColor: wantLogin ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                <input type="checkbox" checked={wantLogin} onChange={(e) => setWantLogin(e.target.checked)}
                  className="mt-0.5 accent-(--accent) cursor-pointer" />
                <span>
                  <p className="text-sm font-medium text-(--text)">{t("I want to create a login to track my case")}</p>
                  <p className="text-[11px] text-(--muted) mt-0.5">{t("Optional — add an email and password to sign in later.")}</p>
                </span>
              </label>
              {wantLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("Email")} required>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
                      placeholder="you@example.com" className="form-input" />
                  </Field>
                  <Field label={t("Password (8+ characters)")} required>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8}
                      autoComplete="new-password" className="form-input" />
                  </Field>
                </div>
              )}

              {error && (
                <div className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || uploadingDoc}
                className="w-full rounded-xl py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
                {loading ? t("Submitting…") : t("Submit enquiry")}
              </button>

              <p className="text-[11px] text-(--muted) text-center leading-relaxed">
                By submitting you agree that a Janman social worker may contact you.
                Your information stays private. <Link href="/policies" className="underline hover:text-(--text)">Read our policies</Link>.
              </p>
            </form>
            )}
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
