"use client";

import { useState } from "react";

export type OnboardingDocs = {
  panUrl?: string;
  aadharUrl?: string;
  bankAccount: { holder?: string; accountNumber?: string; ifsc?: string; bankName?: string };
  cvUrl?: string;
  academicDocs: { label: string; url: string }[];
  priorExperience?: string;
  emergencyContact: { name?: string; phone?: string; relation?: string };
  otherDocs: { label: string; url: string }[];
};

export const EMPTY_DOCS: OnboardingDocs = {
  bankAccount: {},
  academicDocs: [],
  emergencyContact: {},
  otherDocs: [],
};

interface Props {
  value: OnboardingDocs;
  onChange: (next: OnboardingDocs) => void;
  /** Heading + intro for the docs section. */
  title?: string;
  intro?: string;
}

async function uploadOne(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error ?? "Upload failed");
    return null;
  }
  return data.url as string;
}

export default function OnboardingDocsFields({
  value, onChange,
  title = "Documentation",
  intro = "ID proofs, bank details, prior experience, academic & CV — all optional, but the more you provide upfront the smoother payroll and provisioning are.",
}: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function handleSingleUpload(key: "panUrl" | "aadharUrl" | "cvUrl", file: File) {
    setBusyKey(key);
    try {
      const url = await uploadOne(file);
      if (url) onChange({ ...value, [key]: url });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleMultiUpload(key: "academicDocs" | "otherDocs", file: File, label: string) {
    setBusyKey(`${key}-add`);
    try {
      const url = await uploadOne(file);
      if (url) onChange({ ...value, [key]: [...(value[key] ?? []), { label: label || file.name, url }] });
    } finally {
      setBusyKey(null);
    }
  }

  function removeMulti(key: "academicDocs" | "otherDocs", idx: number) {
    onChange({ ...value, [key]: value[key].filter((_, i) => i !== idx) });
  }

  return (
    <details className="rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <summary className="cursor-pointer px-5 py-4 select-none">
        <span className="font-semibold text-(--text)">{title}</span>
        <p className="text-xs text-(--muted) mt-0.5 leading-relaxed">{intro}</p>
      </summary>
      <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor: "var(--border)" }}>
        {/* IDs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <SingleDoc label="PAN card (PDF / image)" value={value.panUrl} busy={busyKey === "panUrl"}
            onUpload={(f) => handleSingleUpload("panUrl", f)} onClear={() => onChange({ ...value, panUrl: undefined })} />
          <SingleDoc label="Aadhaar card (PDF / image)" value={value.aadharUrl} busy={busyKey === "aadharUrl"}
            onUpload={(f) => handleSingleUpload("aadharUrl", f)} onClear={() => onChange({ ...value, aadharUrl: undefined })} />
        </div>

        {/* Bank details */}
        <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
          <legend className="text-xs font-semibold text-(--text) px-1">Bank Account (for salary)</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Account holder name" value={value.bankAccount.holder ?? ""}
              onChange={e => onChange({ ...value, bankAccount: { ...value.bankAccount, holder: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input placeholder="Bank name" value={value.bankAccount.bankName ?? ""}
              onChange={e => onChange({ ...value, bankAccount: { ...value.bankAccount, bankName: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input placeholder="Account number" value={value.bankAccount.accountNumber ?? ""}
              onChange={e => onChange({ ...value, bankAccount: { ...value.bankAccount, accountNumber: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm font-mono" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input placeholder="IFSC code" value={value.bankAccount.ifsc ?? ""}
              onChange={e => onChange({ ...value, bankAccount: { ...value.bankAccount, ifsc: e.target.value.toUpperCase() } })}
              className="px-3 py-2 rounded-lg border text-sm font-mono uppercase" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
        </fieldset>

        {/* CV + experience */}
        <SingleDoc label="CV / Resume (PDF / Word)" value={value.cvUrl} busy={busyKey === "cvUrl"}
          onUpload={(f) => handleSingleUpload("cvUrl", f)} onClear={() => onChange({ ...value, cvUrl: undefined })} />

        <textarea rows={3} placeholder="Prior experience — companies, roles, years"
          value={value.priorExperience ?? ""}
          onChange={e => onChange({ ...value, priorExperience: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

        {/* Academic docs */}
        <MultiDocList
          label="Academic documents (degrees, certificates)"
          docs={value.academicDocs}
          busy={busyKey === "academicDocs-add"}
          onAdd={(file, label) => handleMultiUpload("academicDocs", file, label)}
          onRemove={(i) => removeMulti("academicDocs", i)}
        />

        {/* Emergency contact */}
        <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
          <legend className="text-xs font-semibold text-(--text) px-1">Emergency contact</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input placeholder="Name" value={value.emergencyContact.name ?? ""}
              onChange={e => onChange({ ...value, emergencyContact: { ...value.emergencyContact, name: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input placeholder="Phone" value={value.emergencyContact.phone ?? ""}
              onChange={e => onChange({ ...value, emergencyContact: { ...value.emergencyContact, phone: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input placeholder="Relation (e.g. Spouse, Father)" value={value.emergencyContact.relation ?? ""}
              onChange={e => onChange({ ...value, emergencyContact: { ...value.emergencyContact, relation: e.target.value } })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
        </fieldset>

        {/* Other docs */}
        <MultiDocList
          label="Other documents (offer letter, references, etc.)"
          docs={value.otherDocs}
          busy={busyKey === "otherDocs-add"}
          onAdd={(file, label) => handleMultiUpload("otherDocs", file, label)}
          onRemove={(i) => removeMulti("otherDocs", i)}
        />
      </div>
    </details>
  );
}

function SingleDoc({ label, value, busy, onUpload, onClear }: {
  label: string; value?: string; busy: boolean;
  onUpload: (f: File) => void; onClear: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-(--text) mb-1.5">{label}</p>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium hover:underline truncate" style={{ color: "var(--accent)" }}>
            ✓ Uploaded — view
          </a>
          <button type="button" onClick={onClear}
            className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
            Remove
          </button>
        </div>
      ) : (
        <input type="file" accept=".pdf,.doc,.docx,image/*" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
          className="block w-full text-xs text-(--muted) file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:cursor-pointer disabled:opacity-50" />
      )}
    </div>
  );
}

function MultiDocList({ label, docs, busy, onAdd, onRemove }: {
  label: string;
  docs: { label: string; url: string }[];
  busy: boolean;
  onAdd: (file: File, label: string) => void;
  onRemove: (i: number) => void;
}) {
  const [pending, setPending] = useState("");

  return (
    <fieldset className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
      <legend className="text-xs font-semibold text-(--text) px-1">{label}</legend>
      {docs.length > 0 && (
        <ul className="space-y-1 mb-2">
          {docs.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                className="hover:underline truncate" style={{ color: "var(--accent)" }}>
                {d.label}
              </a>
              <button type="button" onClick={() => onRemove(i)}
                className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input value={pending} onChange={e => setPending(e.target.value)}
          placeholder="Label (e.g. B.A. degree, 2020)"
          className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <input type="file" accept=".pdf,.doc,.docx,image/*" disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onAdd(f, pending); setPending(""); }
            e.target.value = "";
          }}
          className="text-xs text-(--muted) file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:cursor-pointer disabled:opacity-50" />
      </div>
    </fieldset>
  );
}
