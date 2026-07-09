"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";
import { CASE_ISSUES, JANMAN_DISTRICTS } from "@/lib/case-issues";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.625rem",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  padding: "0.55rem 0.75rem",
  fontSize: "0.8125rem",
  color: "var(--text)",
  outline: "none",
};

/**
 * "Create Client/Victim" — the full Case Enquiry intake, available to every
 * signed-in staff member. Registers a client with NO ID-verification step so a
 * case can be entered right away. Only Name + Mobile are required; the rest of
 * the enquiry (victim, issues, accused, facts, FIR, documents, incident) is
 * optional and stored on the client's profile for the social worker / lawyer.
 */
export default function CreateClientButton() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  // Required
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Victim
  const [victimName, setVictimName] = useState("");
  const [address, setAddress] = useState("");
  const [relationship, setRelationship] = useState("");
  // Point of contact (optional)
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  // Issues
  const [issues, setIssues] = useState<string[]>([]);
  const [otherIssue, setOtherIssue] = useState("");
  // Accused + facts
  const [accusedNames, setAccusedNames] = useState("");
  const [accusedCount, setAccusedCount] = useState("");
  const [facts, setFacts] = useState("");
  // Incident
  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState("");
  const [incidentDateTime, setIncidentDateTime] = useState("");
  // Extras (member profile)
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  // Documents
  const [docs, setDocs] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  function toggleIssue(v: string) {
    setIssues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function reset() {
    setName(""); setPhone(""); setVictimName(""); setAddress(""); setRelationship("");
    setPocName(""); setPocPhone(""); setIssues([]); setOtherIssue("");
    setAccusedNames(""); setAccusedCount(""); setFacts("");
    setFirNumber(""); setPoliceStation(""); setPlaceOfOccurrence(""); setIncidentDateTime("");
    setEmail(""); setDistrict(""); setVillage(""); setDocs([]); setError(""); setCreated(null);
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
      setError("");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim())  { setError(t("Name is required.")); return; }
    if (!phone.trim()) { setError(t("Mobile number is required.")); return; }
    setSaving(true);
    try {
      const factsCombined = [facts.trim(), otherIssue.trim() ? `Other: ${otherIssue.trim()}` : ""]
        .filter(Boolean).join("\n");
      const res = await fetch("/api/community/lite-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          district: district || undefined,
          village: village.trim() || undefined,
          ...((pocName.trim() || pocPhone.trim())
            ? { pointOfContact: { name: pocName.trim() || undefined, phone: pocPhone.trim() || undefined } }
            : {}),
          ...(docs.length ? { intakeDocs: docs } : {}),
          enquiry: {
            relationshipWithVictim: relationship.trim() || undefined,
            victimName: victimName.trim() || undefined,
            victimAddress: address.trim() || undefined,
            issues,
            accusedNames: accusedNames.trim() || undefined,
            accusedCount: accusedCount.trim() ? Number(accusedCount) : undefined,
            factsOfTheCase: factsCombined || undefined,
            firNumber: firNumber.trim() || undefined,
            policeStation: policeStation.trim() || undefined,
            placeOfOccurrence: placeOfOccurrence.trim() || undefined,
            incidentDateTime: incidentDateTime || undefined,
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? t("Could not create the client/victim.")); return; }
      setCreated({ id: String(d.user?._id ?? ""), name: d.user?.name ?? name.trim() });
      router.refresh();
    } catch {
      setError(t("Network error — please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { reset(); setOpen(true); }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        <span className="text-base leading-none">＋</span> {t("Intake Form")}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-(--text)">{t("Intake Form")}</h2>
          <p className="text-[12px] text-(--muted) mt-0.5">{t("Case Enquiry intake — no verification needed. Only Name + Mobile are required.")}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)}
          className="text-xs text-(--muted) hover:text-(--text) px-2 py-1 rounded-lg hover:bg-(--bg-secondary)">{t("Close")}</button>
      </div>

      {created ? (
        <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--success-bg)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>✓ {t("Created")} {created.name}</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/cases/new" className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {t("File a case →")}
            </Link>
            <button type="button" onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              {t("Create another")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("Name / नाम")} required><Input value={name} onChange={setName} placeholder={t("Full name")} /></Field>
            <Field label={t("Phone Number / फ़ोन नंबर")} required><Input value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" /></Field>
            <Field label={t("Victim's Name / पीड़ित का नाम")}><Input value={victimName} onChange={setVictimName} placeholder={t("optional")} /></Field>
            <Field label={t("Relationship with victim")}><Input value={relationship} onChange={setRelationship} placeholder={t("self · father · sister · neighbour")} /></Field>
            <div className="sm:col-span-2">
              <Field label={t("Address")}><Input value={address} onChange={setAddress} placeholder={t("Where does the victim live?")} /></Field>
            </div>
            <Field label={t("Point of contact — name")}><Input value={pocName} onChange={setPocName} placeholder={t("Who to call (optional)")} /></Field>
            <Field label={t("Point of contact — phone")}><Input value={pocPhone} onChange={setPocPhone} placeholder="+91 98765 43210" type="tel" /></Field>
          </div>

          {/* Issues */}
          <div>
            <span className="block text-xs font-semibold text-(--text) mb-1.5">{t("Issues")}</span>
            <div className="flex flex-wrap gap-1.5">
              {CASE_ISSUES.map((iss) => {
                const on = issues.includes(iss.value);
                return (
                  <button key={iss.value} type="button" onClick={() => toggleIssue(iss.value)}
                    className="px-2.5 py-1 rounded-full border text-[12px] transition-colors"
                    style={{
                      background: on ? "var(--accent)" : "var(--bg)",
                      color: on ? "var(--accent-contrast)" : "var(--text)",
                      borderColor: on ? "var(--accent)" : "var(--border)",
                    }}>
                    {iss.value}{iss.hi ? ` · ${iss.hi}` : ""}
                  </button>
                );
              })}
            </div>
            <div className="mt-2"><Input value={otherIssue} onChange={setOtherIssue} placeholder={t("Other (describe)…")} /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("Name/s of Accused")}><Input value={accusedNames} onChange={setAccusedNames} placeholder={t("optional")} /></Field>
            <Field label={t("Total Number of accused")}><Input value={accusedCount} onChange={setAccusedCount} placeholder="0" type="number" /></Field>
          </div>

          <Field label={t("Facts of the case")}>
            <textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={3} placeholder={t("What happened?")} style={{ ...INPUT_STYLE, resize: "vertical" }} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("FIR No. (if filed)")}><Input value={firNumber} onChange={setFirNumber} placeholder={t("optional")} /></Field>
            <Field label={t("Police Station")}><Input value={policeStation} onChange={setPoliceStation} placeholder={t("optional")} /></Field>
            <Field label={t("Place of Occurrence")}><Input value={placeOfOccurrence} onChange={setPlaceOfOccurrence} placeholder={t("optional")} /></Field>
            <Field label={t("Date and Time of incident")}>
              <input type="datetime-local" value={incidentDateTime} onChange={(e) => setIncidentDateTime(e.target.value)} style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Relevant documents */}
          <div>
            <span className="block text-xs font-semibold text-(--text) mb-1.5">{t("Relevant documents, if available")}</span>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }}>
              <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingDoc}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ""; }} />
              {uploadingDoc ? t("Uploading…") : t("📎 Attach a document (PDF / image)")}
            </label>
            {docs.length > 0 && (
              <ul className="space-y-1 mt-2">
                {docs.map((u, i) => (
                  <li key={u} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
                    <span>✓ {t("Document")} {i + 1}</span>
                    <button type="button" onClick={() => setDocs((prev) => prev.filter((x) => x !== u))} className="text-[12px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Remove")}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Profile extras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={t("Email (optional)")}><Input value={email} onChange={setEmail} placeholder="name@example.com" type="email" /></Field>
            <Field label={t("District (optional)")}>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} style={INPUT_STYLE}>
                <option value="">{t("Choose…")}</option>
                {JANMAN_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label={t("Village / area (optional)")}><Input value={village} onChange={setVillage} placeholder={t("optional")} /></Field>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {saving ? t("Saving…") : t("Submit intake form")}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-(--text) mb-1">{label}{required && <span style={{ color: "var(--error)" }}> *</span>}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={type === "tel" ? "tel" : undefined} style={INPUT_STYLE} />
  );
}
