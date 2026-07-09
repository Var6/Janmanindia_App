"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";

const ID_TYPES = [
  { value: "Aadhar",         label: "Aadhaar",         hi: "आधार" },
  { value: "VoterId",        label: "Voter ID",        hi: "मतदाता पहचान पत्र" },
  { value: "RationCard",     label: "Ration card",     hi: "राशन कार्ड" },
  { value: "DrivingLicense", label: "Driving license", hi: "ड्राइविंग लाइसेंस" },
  { value: "Passport",       label: "Passport",        hi: "पासपोर्ट" },
  { value: "Other",          label: "Other",           hi: "अन्य" },
];

interface Props {
  status: "pending" | "rejected";
  rejectionReason?: string;
  govtIdType?: string;
}

/** Block screen rendered for un-verified community members. Shows a polite
 *  "we're reviewing" message when status === "pending", or a re-upload form
 *  with the rejection reason when status === "rejected". */
export default function VerificationGate({ status, rejectionReason, govtIdType }: Props) {
  if (status === "pending") return <PendingScreen />;
  return <RejectedScreen reason={rejectionReason} initialType={govtIdType} />;
}

function PendingScreen() {
  const t = useT();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border p-8 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)", color: "var(--warning-text)" }}>
          ⏳
        </div>
        <h1 className="text-xl font-bold text-(--text)">{t("Awaiting verification")}</h1>
        <p className="text-sm font-medium text-(--muted) mt-1">पहचान सत्यापन प्रतीक्षा में</p>
        <p className="text-sm text-(--text) mt-4 leading-relaxed" style={{ opacity: 0.85 }}>
          {t("Thanks for registering. A Janman social worker is reviewing your ID document and will reach out within 48 hours. You'll get full access once verified.")}
        </p>
        <p className="text-sm text-(--muted) mt-3 leading-relaxed">
          आपका ID दस्तावेज़ हमारी टीम जाँच रही है। 48 घंटों के भीतर एक सामाजिक कार्यकर्ता आपसे संपर्क करेगा।
        </p>
        <p className="text-xs text-(--muted) mt-6 italic">
          {t("Until then, the rest of the app is locked. Need urgent help? Call your nearest Janman office.")}
        </p>
      </div>
    </div>
  );
}

function RejectedScreen({ reason, initialType }: { reason?: string; initialType?: string }) {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [idType, setIdType]       = useState(initialType ?? "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [newUrl, setNewUrl]       = useState("");

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Upload failed."));
        return;
      }
      setNewUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!newUrl) { setError(t("Pick a new ID document first.")); return; }
    if (!idType) { setError(t("Select the ID type.")); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/reupload-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ govtIdUrl: newUrl, govtIdType: idType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Submission failed."));
        return;
      }
      // The server has reset status to "pending" — full reload so the
      // gate re-evaluates and shows the pending screen.
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border p-8"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          ⚠
        </div>
        <h1 className="text-xl font-bold text-(--text) text-center">{t("Your ID couldn't be verified")}</h1>
        <p className="text-sm font-medium text-(--muted) text-center mt-1">पहचान सत्यापन अस्वीकृत</p>

        {reason && (
          <div className="mt-5 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
            <p className="font-semibold mb-1">{t("Reason")}</p>
            <p>{reason}</p>
          </div>
        )}

        <p className="text-sm text-(--text) mt-5 leading-relaxed" style={{ opacity: 0.85 }}>
          {t("Please upload a fresh, clear photo of your")} <strong>{t("original")}</strong> {t("government ID. We'll delete the old one when you upload the new file.")}
        </p>
        <p className="text-sm text-(--muted) mt-2 leading-relaxed">
          अपने सरकारी ID की एक स्पष्ट तस्वीर फिर से अपलोड करें। पुरानी तस्वीर हटा दी जाएगी।
        </p>

        <div className="mt-6 space-y-3">
          <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide">{t("ID type")}</label>
          <select value={idType} onChange={(e) => setIdType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
            <option value="">{t("Choose…")}</option>
            {ID_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label} · {t.hi}</option>
            ))}
          </select>

          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />

          {newUrl ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs"
              style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)", color: "var(--success-text)" }}>
              <span>✓ {t("New ID attached")}</span>
              <button type="button" onClick={() => setNewUrl("")}
                className="text-[12px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                {t("Replace")}
              </button>
            </div>
          ) : (
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              className="w-full px-3 py-2.5 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }}>
              {uploading ? t("Uploading…") : `📎 ${t("Upload new ID (PDF / image)")}`}
            </button>
          )}

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {error}
            </div>
          )}

          <button type="button" onClick={submit} disabled={submitting || uploading || !newUrl || !idType}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {submitting ? t("Submitting…") : t("Submit for re-verification")}
          </button>
        </div>
      </div>
    </div>
  );
}
