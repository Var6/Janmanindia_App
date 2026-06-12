"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { uploadFileWithProgress, type UploadProgress } from "@/lib/upload-client";

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Tab = "file" | "url";

const CATEGORIES_CRIMINAL: { value: string; label: string }[] = [
  { value: "general",     label: "General document" },
  { value: "fir",         label: "FIR copy" },
  { value: "cognizance",  label: "Cognizance order" },
  { value: "charge",      label: "Charge sheet / framed charges" },
  { value: "evidence",    label: "Trial evidence" },
  { value: "forensic",    label: "Forensic / lab report" },
];
const CATEGORIES_HC: { value: string; label: string }[] = [
  { value: "general",             label: "General document" },
  { value: "petitionfiled",       label: "Petition (Article 226 / 227)" },
  { value: "supportingaffidavit", label: "Supporting affidavit" },
  { value: "admission",           label: "Admission order" },
  { value: "counteraffidavit",    label: "Counter affidavit" },
  { value: "rejoinder",           label: "Rejoinder" },
  { value: "pleaclose",           label: "Plea close" },
  { value: "inducement",          label: "Inducement order" },
];

interface Props {
  caseId: string;
  caseType: "criminal" | "highcourt";
  onUploaded: () => void;
}

export default function CaseDocsUpload({ caseId, caseType, onUploaded }: Props) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("file");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [urlCategory, setUrlCategory] = useState("general");
  const cats = caseType === "criminal" ? CATEGORIES_CRIMINAL : CATEGORIES_HC;

  async function handleFileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const fd = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];
    const label = String(fd.get("label") ?? "").trim();
    const category = String(fd.get("category") ?? "general");
    if (!file) { setError(t("Please choose a file.")); return; }
    if (!label) { setError(t("Label is required.")); return; }

    const form = e.currentTarget;
    setUploading(true);
    setProgress({ percent: 0, loadedBytes: 0, totalBytes: file.size });
    try {
      // Direct-to-storage upload (no size limit) with live progress.
      let url: string;
      try {
        url = await uploadFileWithProgress(file, setProgress);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("Upload failed."));
        return;
      }

      const attach = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addDocument: { label, url, category } }),
      });
      const attachData = await attach.json();
      if (!attach.ok) { setError(attachData.error ?? t("Failed to attach.")); return; }

      setSuccess(t("Document attached."));
      form.reset();
      onUploaded();
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const url = urlValue.trim();
    const label = urlLabel.trim();
    if (!url) { setError(t("Paste a URL.")); return; }
    if (!label) { setError(t("Label is required.")); return; }
    try { new URL(url); } catch { setError(t("That doesn't look like a valid URL.")); return; }

    setUploading(true);
    try {
      const attach = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addDocument: { label, url, category: urlCategory } }),
      });
      const attachData = await attach.json();
      if (!attach.ok) { setError(attachData.error ?? t("Failed to attach.")); return; }
      setSuccess(t("Document linked."));
      setUrlValue(""); setUrlLabel(""); setUrlCategory("general");
      onUploaded();
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-(--text)">{t("Attach Document")}</p>
        {/* Tab toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg border text-xs"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          {(["file", "url"] as Tab[]).map(tv => (
            <button key={tv} type="button" onClick={() => { setTab(tv); setError(""); setSuccess(""); }}
              className="px-2.5 py-1 rounded-md font-semibold transition-colors"
              style={{
                background: tab === tv ? "var(--accent)" : "transparent",
                color: tab === tv ? "var(--accent-contrast)" : "var(--muted)",
              }}>
              {tv === "file" ? t("Upload file") : t("Paste URL (S3 / external)")}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
      {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>{success}</p>}

      {tab === "file" ? (
        <form onSubmit={handleFileSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="label" required maxLength={200} placeholder={t("Label (e.g. Chargesheet copy, Final order)")}
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <select name="category" defaultValue="general"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
              {cats.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" name="file" disabled={uploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,video/*"
            className="block w-full text-sm text-(--muted) file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer disabled:opacity-60" />
          <button type="submit" disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {uploading ? t("Uploading…") : t("Attach to Case")}
          </button>

          {/* Upload progress — large files can take a while, so show the bar
              and the bytes transferred so the user knows to wait. */}
          {uploading && progress && (
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: progress.percent != null ? `${progress.percent}%` : "100%",
                    background: "var(--accent)",
                    opacity: progress.percent == null ? 0.5 : 1,
                  }} />
              </div>
              <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--muted)" }}>
                <span>
                  {progress.percent != null ? `${progress.percent}%` : t("Uploading…")}
                  {progress.totalBytes > 0 && ` · ${fmtMB(progress.loadedBytes)} / ${fmtMB(progress.totalBytes)}`}
                </span>
                <span>{progress.percent === 100 ? t("Finishing…") : t("Please keep this tab open")}</span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-(--muted)">{t("PDF / Word / Excel / image / video · large files supported · choosing a milestone category marks that step as filed.")}</p>
        </form>
      ) : (
        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={urlLabel} onChange={e => setUrlLabel(e.target.value)} required maxLength={200}
              placeholder={t("Label (e.g. Order dated 12 Apr)")}
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <select value={urlCategory} onChange={e => setUrlCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
              {cats.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
            </select>
          </div>
          <input value={urlValue} onChange={e => setUrlValue(e.target.value)} required
            placeholder={t("https://s3.amazonaws.com/… or any public document URL")}
            type="url"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button type="submit" disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {uploading ? t("Linking…") : t("Link to Case")}
          </button>
          <p className="text-[11px] text-(--muted)">{t("Paste any publicly accessible S3 or external document URL — it will be stored as a case document.")}</p>
        </form>
      )}
    </div>
  );
}
