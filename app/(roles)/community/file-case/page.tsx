"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import { CASE_TYPES, lookupCaseType } from "@/lib/case-types";
import { CASE_ISSUES, JANMAN_DISTRICTS } from "@/lib/case-issues";

type Me = {
  _id: string;
  name: string;
  phone?: string;
  role: string;
};

type CommunityMember = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
};

/** Filing scope: am I the victim, or am I filing for someone else? */
type FilingFor = "self" | "existing" | "new";

export default function FileCasePage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);

  /* Filing scope */
  const [filingFor, setFilingFor]   = useState<FilingFor>("self");
  /* Existing-member picker */
  const [memberQuery, setMemberQuery]     = useState("");
  const [memberResults, setMemberResults] = useState<CommunityMember[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [pickedMember, setPickedMember]   = useState<CommunityMember | null>(null);
  /* New-member stub */
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    email: "",
    district: "",
    village: "",
  });

  /* Filer fields (auto-filled from session) */
  const [filerName, setFilerName]   = useState("");
  const [filerPhone, setFilerPhone] = useState("");
  const [relationship, setRelationship] = useState(""); // "self" / "father" / "advocate" / etc.

  /* Victim fields */
  const [victimName, setVictimName]       = useState("");
  const [victimAddress, setVictimAddress] = useState("");
  const [victimContact, setVictimContact] = useState("");

  /* Case basics */
  const [caseTitle, setCaseTitle] = useState("");
  const [caseType, setCaseType]   = useState("");
  const [district, setDistrict]   = useState("");

  /* Issues multi-select */
  const [issues, setIssues] = useState<string[]>([]);

  /* Incident facts */
  const [facts, setFacts]                       = useState("");
  const [incidentDateTime, setIncidentDateTime] = useState("");
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState("");
  const [policeStation, setPoliceStation]       = useState("");
  const [firNumber, setFirNumber]               = useState("");
  const [accusedNames, setAccusedNames]         = useState("");
  const [accusedCount, setAccusedCount]         = useState<string>("");

  /* Voice + state */
  const [voiceUrl, setVoiceUrl]           = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  /* Pull session user so filer fields are pre-filled and the relationship
     defaults to "self" when the community filer is also the victim. */
  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then((d: { user?: Me }) => {
        if (d.user) {
          setMe(d.user);
          setFilerName(d.user.name);
          setFilerPhone(d.user.phone ?? "");
          if (d.user.role === "community") {
            setRelationship("self");
            setVictimName(d.user.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  /* Reset victim/filer scoping when the radio changes so stale picks don't
     leak into the next submission. */
  useEffect(() => {
    if (filingFor === "self") {
      setRelationship("self");
      setVictimName(me?.name ?? "");
      setVictimAddress("");
      setPickedMember(null);
      setMemberQuery("");
    } else {
      // Filer is filing on behalf of someone else — clear "self" defaults so
      // they have to enter the victim's actual name/address.
      if (relationship === "self") setRelationship("");
      setVictimName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filingFor]);

  /* Mirror picked member into victim fields. The user can still edit them —
     useful when the victim's name on record differs from what the filer wants
     to record (e.g. matronymic vs father's name). */
  useEffect(() => {
    if (pickedMember) {
      setVictimName(prev => prev || pickedMember.name);
    }
  }, [pickedMember]);

  /* Debounced existing-member search. Only enabled when filing for an
     existing member, which keeps the noisy effect off the self/new paths. */
  useEffect(() => {
    if (filingFor !== "existing" || pickedMember || memberQuery.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setMemberSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(memberQuery)}&role=community`);
        const data = await res.json();
        setMemberResults(data.users ?? []);
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [memberQuery, filingFor, pickedMember]);

  function toggleIssue(value: string) {
    setIssues(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  }

  /** Resolve the case's `community` ObjectId based on filing scope. May
   *  trigger a stub-user creation for the "new" path. Returns null on error
   *  (with `setError` already populated). */
  async function resolveCommunityId(): Promise<string | null> {
    if (filingFor === "self") return me?._id ?? null;
    if (filingFor === "existing") {
      if (!pickedMember) {
        setError("Pick the community member you're filing for, or switch to creating a new one.");
        return null;
      }
      return pickedMember._id;
    }
    // "new" → create a stub community account
    if (!newMember.name.trim()) {
      setError("Enter the victim's name so we can create their community profile.");
      return null;
    }
    if (!newMember.phone.trim() && !newMember.email.trim()) {
      setError("Add a phone number or email for the new community member so the social worker can reach them.");
      return null;
    }
    const res = await fetch("/api/community/lite-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create the community member profile.");
      return null;
    }
    return data.user._id;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!caseTitle.trim()) { setError("Add a one-line case title."); return; }
    if (!caseType)         { setError("Pick a case type."); return; }
    const meta = lookupCaseType(caseType);
    if (!meta)             { setError("That case type isn't recognised."); return; }
    if (!facts.trim() && !voiceUrl) {
      setError("Describe what happened — type the facts or record your voice.");
      return;
    }

    setLoading(true);
    try {
      const communityId = await resolveCommunityId();
      if (!communityId) { setLoading(false); return; }

      const enquiry = {
        filerName: filerName.trim() || undefined,
        filerPhone: filerPhone.trim() || undefined,
        relationshipWithVictim: relationship.trim() || undefined,
        victimName: victimName.trim() || undefined,
        victimAddress: victimAddress.trim() || undefined,
        victimContact: victimContact.trim() || undefined,
        issues,
        accusedNames: accusedNames.trim() || undefined,
        accusedCount: accusedCount.trim() ? Number(accusedCount) : undefined,
        factsOfTheCase: facts.trim() || undefined,
        firNumber: firNumber.trim() || undefined,
        policeStation: policeStation.trim() || undefined,
        placeOfOccurrence: placeOfOccurrence.trim() || undefined,
        incidentDateTime: incidentDateTime || undefined,
      };

      const body = {
        caseTitle: caseTitle.trim(),
        caseType,
        path: meta.path,
        communityId,
        district: district || undefined,
        enquiry,
        ...(voiceUrl ? { voiceAttachment: { url: voiceUrl, durationSec: voiceDuration } } : {}),
      };

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to file case. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/community/case-tracker"), 1500);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-6 rounded-2xl text-center"
          style={{ background: "var(--success-bg, #dcfce7)", border: "1px solid color-mix(in srgb, var(--success, #16a34a) 30%, transparent)" }}>
          <p className="text-3xl mb-2">✅</p>
          <p className="font-semibold" style={{ color: "var(--success-text, #15803d)" }}>Case enquiry submitted!</p>
          <p className="text-sm mt-1" style={{ color: "var(--success-text, #15803d)", opacity: 0.8 }}>
            A social worker will review and reach out within 48 hours. Redirecting to your case tracker…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface) px-6 py-6">
        <Spotlight color="var(--accent)" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-1">Case Enquiry</p>
          <h1 className="text-2xl font-bold text-(--text)">File a New Case Enquiry</h1>
          <p className="text-sm text-(--muted) mt-1.5 leading-relaxed">
            Capture the facts so a social worker can review and assign a lawyer within 48 hours. You can file for yourself or on behalf of someone else.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-(--surface) rounded-2xl border border-(--border) p-6 space-y-6">
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}

        {/* ─── Filing scope ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Who is this enquiry for?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { v: "self",     label: "Myself",                   hint: "I am the victim" },
              { v: "existing", label: "Existing community member", hint: "Someone already on Janman" },
              { v: "new",      label: "New community member",      hint: "Create their profile too" },
            ] as { v: FilingFor; label: string; hint: string }[]).map(opt => (
              <label key={opt.v}
                className="flex items-start gap-2.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors"
                style={{ borderColor: filingFor === opt.v ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                <input type="radio" name="filingFor" checked={filingFor === opt.v}
                  onChange={() => setFilingFor(opt.v)} className="mt-0.5 accent-(--accent) cursor-pointer" />
                <span>
                  <p className="text-sm font-medium text-(--text)">{opt.label}</p>
                  <p className="text-[11px] text-(--muted) mt-0.5">{opt.hint}</p>
                </span>
              </label>
            ))}
          </div>

          {filingFor === "existing" && (
            <div>
              {pickedMember ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
                  style={{ background: "var(--bg)", borderColor: "var(--accent)" }}>
                  <div>
                    <p className="text-sm font-medium text-(--text)">{pickedMember.name}</p>
                    <p className="text-xs text-(--muted)">{pickedMember.email}{pickedMember.phone ? ` · ${pickedMember.phone}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => { setPickedMember(null); setMemberQuery(""); }}
                    className="text-xs hover:underline" style={{ color: "var(--error)" }}>
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search by name or email…" />
                  {memberSearching && (
                    <p className="text-[11px] text-(--muted) mt-1">Searching…</p>
                  )}
                  {memberResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      {memberResults.map((u) => (
                        <button key={u._id} type="button"
                          onClick={() => { setPickedMember(u); setMemberQuery(""); setMemberResults([]); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-(--bg-secondary)"
                          style={{ borderBottom: "1px solid var(--border)" }}>
                          <p className="font-medium text-(--text)">{u.name}</p>
                          <p className="text-xs text-(--muted)">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {memberQuery.length >= 2 && !memberSearching && memberResults.length === 0 && (
                    <p className="text-[11px] text-(--muted) mt-1">
                      No member matches "{memberQuery}". Switch to "New community member" to create their profile.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {filingFor === "new" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-3"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <Field label="Their name" required>
                <Input value={newMember.name} onChange={(e) => setNewMember(s => ({ ...s, name: e.target.value }))}
                  placeholder="Priya Sharma" />
              </Field>
              <Field label="Phone">
                <Input value={newMember.phone} onChange={(e) => setNewMember(s => ({ ...s, phone: e.target.value }))}
                  placeholder="+91 98765 43210" inputMode="tel" />
              </Field>
              <Field label="Email (optional)">
                <Input value={newMember.email} onChange={(e) => setNewMember(s => ({ ...s, email: e.target.value }))}
                  placeholder="priya@example.com" type="email" />
              </Field>
              <Field label="District">
                <Select value={newMember.district} onChange={(e) => setNewMember(s => ({ ...s, district: e.target.value }))}>
                  <option value="">Select…</option>
                  {JANMAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Village / Area">
                <Input value={newMember.village} onChange={(e) => setNewMember(s => ({ ...s, village: e.target.value }))}
                  placeholder="Khajanchi Hat" />
              </Field>
              <p className="text-[11px] text-(--muted) sm:col-span-2 -mt-1">
                We'll create a basic community profile for them. They can claim the account later by registering with the same email/phone.
              </p>
            </div>
          )}
        </section>

        {/* ─── Filer / victim ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Filer &amp; victim</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Your name (filer)" required>
              <Input value={filerName} onChange={(e) => setFilerName(e.target.value)} required placeholder="Your name" />
            </Field>
            <Field label="Your phone">
              <Input value={filerPhone} onChange={(e) => setFilerPhone(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" />
            </Field>
            <Field label="Relationship with victim" required
              hint="self · father · sister · neighbour · advocate · paralegal volunteer">
              <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} required placeholder="self / father / advocate" />
            </Field>
            <Field label="Victim's name" required>
              <Input value={victimName} onChange={(e) => setVictimName(e.target.value)} required placeholder="Victim's full name" />
            </Field>
            <Field label="Victim / relative contact"
              hint="Phone or email the lawyer can reach the victim or their family on (if different from your phone above)">
              <Input value={victimContact} onChange={(e) => setVictimContact(e.target.value)}
                placeholder="+91 98765 43210 or relative@example.com" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Victim's address" required>
                <Textarea value={victimAddress} onChange={(e) => setVictimAddress(e.target.value)} required rows={2}
                  placeholder="House / lane, village, block, district, PIN" />
              </Field>
            </div>
          </div>
        </section>

        {/* ─── Issues multi-select ────────────────────────────────────── */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Issues / what happened</h2>
          <p className="text-xs text-(--muted)">Pick all that apply — these describe what the victim feels happened (separate from legal procedure).</p>
          <div className="flex flex-wrap gap-2">
            {CASE_ISSUES.map(issue => {
              const on = issues.includes(issue.value);
              return (
                <button key={issue.value} type="button" onClick={() => toggleIssue(issue.value)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    background: on ? "var(--accent)" : "var(--bg)",
                    color: on ? "var(--accent-contrast)" : "var(--text)",
                    borderColor: on ? "var(--accent)" : "var(--border)",
                  }}>
                  {issue.value}{issue.hi ? ` · ${issue.hi}` : ""}
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Case basics ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Case basics</h2>
          <Field label="One-line case title" required example="Police refused to file FIR for theft on April 18">
            <Input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} required maxLength={200}
              placeholder="Short summary of the issue" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Type of case (legal procedure)" required
              hint="Pick the closest match — your social worker will reclassify if needed.">
              <Select value={caseType} onChange={(e) => setCaseType(e.target.value)} required>
                <option value="" disabled>Choose a case type…</option>
                {CASE_TYPES.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.types.map((t) => (
                      <option key={t.code + g.group} value={t.code}>
                        {t.code} — {t.name}{t.hi ? ` · ${t.hi}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="District">
              <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">Select…</option>
                {JANMAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        {/* ─── Incident facts ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Incident facts</h2>
          <Field label="Facts of the case" required
            hint="What we know from first interactive enquiry — who, when, where, what, how.">
            <Textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={6}
              placeholder="On 18 April around 7pm, two men forced their way into our shop in Purnia and demanded money…" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date and time of incident">
              <Input type="datetime-local" value={incidentDateTime}
                onChange={(e) => setIncidentDateTime(e.target.value)} />
            </Field>
            <Field label="Place of occurrence">
              <Input value={placeOfOccurrence} onChange={(e) => setPlaceOfOccurrence(e.target.value)}
                placeholder="Khajanchi Hat market, Purnia" />
            </Field>
            <Field label="Police station">
              <Input value={policeStation} onChange={(e) => setPoliceStation(e.target.value)}
                placeholder="Khajanchi Hat PS" />
            </Field>
            <Field label="FIR number (if filed)">
              <Input value={firNumber} onChange={(e) => setFirNumber(e.target.value)} placeholder="123/2026" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Name(s) of accused">
                <Textarea value={accusedNames} onChange={(e) => setAccusedNames(e.target.value)} rows={2}
                  placeholder="Ramesh Kumar, Suresh Kumar (brothers, residents of Khajanchi Hat)…" />
              </Field>
            </div>
            <Field label="Total number of accused">
              <Input type="number" min={0} value={accusedCount}
                onChange={(e) => setAccusedCount(e.target.value)} placeholder="2" />
            </Field>
          </div>
        </section>

        {/* ─── Voice ──────────────────────────────────────────────────── */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">Voice description (optional)</h2>
          <p className="text-xs text-(--muted)">
            Tap the mic to record. Useful when typing the full story is hard. <span className="font-normal">हिंदी या आपकी भाषा में</span>
          </p>
          {voiceUrl ? (
            <div className="rounded-xl border p-3 flex items-center gap-3"
              style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)" }}>
              <span className="text-xl">🎤</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>Voice recorded ({voiceDuration}s)</p>
                <audio controls preload="metadata" src={voiceUrl} className="block w-full mt-1" />
              </div>
              <button type="button" onClick={() => { setVoiceUrl(null); setVoiceDuration(0); }}
                className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                Re-record
              </button>
            </div>
          ) : (
            <VoiceRecorder onUploaded={(url, dur) => { setVoiceUrl(url); setVoiceDuration(dur); }} />
          )}
        </section>

        <div className="p-4 rounded-xl flex gap-3"
          style={{ background: "var(--warning-bg, #fef3c7)", border: "1px solid color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent)" }}>
          <span className="text-lg shrink-0">📎</span>
          <div className="text-xs leading-relaxed" style={{ color: "var(--warning-text, #92400e)" }}>
            <p className="font-semibold">About supporting documents</p>
            <p className="mt-0.5 opacity-90">
              You don't need to upload anything now. After review, your social worker will tell you exactly which documents to send (FIR copy, photos, ID proof, etc.).
            </p>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold text-(--accent-contrast) hover:brightness-110 transition disabled:opacity-60"
          style={{ background: "var(--accent)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
          {loading ? "Filing your enquiry…" : "Submit Enquiry"}
        </button>

        <p className="text-[11px] text-center text-(--muted)">
          Your enquiry is private. Only your assigned social worker and lawyer can see it.
        </p>
      </form>
    </div>
  );
}
