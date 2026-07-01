"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";
import { JANMAN_DISTRICTS } from "@/lib/case-issues";

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
 * "Create Client/Victim" — a fast intake that registers a client without any ID
 * verification step, so staff can immediately enter cases for them. Only Name,
 * Mobile and a Point of Contact are required (matches the case-creation gate).
 */
export default function CreateClientButton() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");

  function reset() {
    setName(""); setPhone(""); setPocName(""); setPocPhone("");
    setEmail(""); setDistrict(""); setVillage(""); setError(""); setCreated(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim())  { setError(t("Name is required.")); return; }
    if (!phone.trim()) { setError(t("Mobile number is required.")); return; }
    if (!pocName.trim() || !pocPhone.trim()) { setError(t("A point of contact (name and phone) is required.")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/community/lite-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          district: district || undefined,
          village: village.trim() || undefined,
          pointOfContact: { name: pocName.trim(), phone: pocPhone.trim() },
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
        <span className="text-base leading-none">＋</span> {t("Create Client/Victim")}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-(--text)">{t("Create Client/Victim")}</h2>
          <p className="text-[11px] text-(--muted) mt-0.5">{t("No verification needed — you can file a case for them right away.")}</p>
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
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("Name")} required><Input value={name} onChange={setName} placeholder={t("Full name")} /></Field>
            <Field label={t("Mobile")} required><Input value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" /></Field>
            <Field label={t("Point of contact — name")} required><Input value={pocName} onChange={setPocName} placeholder={t("Who to call")} /></Field>
            <Field label={t("Point of contact — phone")} required><Input value={pocPhone} onChange={setPocPhone} placeholder="+91 98765 43210" type="tel" /></Field>
            <Field label={t("Email (optional)")}><Input value={email} onChange={setEmail} placeholder="name@example.com" type="email" /></Field>
            <Field label={t("District (optional)")}>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} style={INPUT_STYLE}>
                <option value="">{t("Choose…")}</option>
                {JANMAN_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("Village / area (optional)")}><Input value={village} onChange={setVillage} placeholder={t("optional")} /></Field>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {saving ? t("Creating…") : t("Create client/victim")}
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
