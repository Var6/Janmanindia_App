"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";
import type { FieldDef, ReportTemplate } from "@/lib/report-templates";

interface Props {
  template: ReportTemplate;
}

/** Walks the template's `fields` array and renders the right input per
 *  question type. Stateless inputs — values live in one big `values` map
 *  keyed by `field.id` so the submit handler only has to JSON-serialise
 *  it and POST. */
export default function ReportForm({ template }: Props) {
  const router = useRouter();
  const t = useT();
  const [values, setValues]   = useState<Record<string, unknown>>({});
  const [error, setError]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  function setVal(id: string, v: unknown) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function toggleCheckbox(id: string, opt: string) {
    setValues((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: template.id, data: values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Submission failed."));
        return;
      }
      router.push(`/reports/${data.report._id}`);
    } catch {
      setError(t("Network error."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {template.description && (
        <p className="text-sm text-(--muted) leading-relaxed">{template.description}</p>
      )}

      {template.fields.map((f) => (
        <Field key={f.id} field={f} value={values[f.id]} setValue={setVal} toggleCheckbox={toggleCheckbox} />
      ))}

      {error && (
        <div className="p-3 rounded-xl text-sm"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-(--bg-secondary)"
          style={{ color: "var(--muted)" }}>
          {t("Cancel")}
        </button>
        <button type="submit" disabled={submitting}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {submitting ? t("Submitting…") : t("Submit report")}
        </button>
      </div>
    </form>
  );
}

function Field({ field: f, value, setValue, toggleCheckbox }: {
  field: FieldDef;
  value: unknown;
  setValue: (id: string, v: unknown) => void;
  toggleCheckbox: (id: string, opt: string) => void;
}) {
  const t = useT();
  const labelEl = (
    <span className="block text-sm font-semibold text-(--text) mb-1.5">
      {f.label}
      {f.required && <span style={{ color: "var(--error)" }}> *</span>}
    </span>
  );
  const hintEl = f.hint ? <p className="text-[11px] text-(--muted) mt-1 leading-relaxed">{f.hint}</p> : null;
  const inputBase = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all";
  const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as const;

  switch (f.type) {
    case "short_text":
    case "url":
      return (
        <label className="block">
          {labelEl}
          <input type={f.type === "url" ? "url" : "text"}
            required={f.required}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(f.id, e.target.value)}
            placeholder={f.type === "url" ? "https://…" : undefined}
            className={`${inputBase} ${f.small ? "max-w-xs" : ""}`} style={inputStyle} />
          {hintEl}
        </label>
      );
    case "long_text":
      return (
        <label className="block">
          {labelEl}
          <textarea
            required={f.required}
            rows={3}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(f.id, e.target.value)}
            className={`${inputBase} resize-y min-h-[72px]`} style={inputStyle} />
          {hintEl}
        </label>
      );
    case "number":
      return (
        <label className="block">
          {labelEl}
          <input type="number"
            required={f.required}
            min={0}
            value={typeof value === "number" ? value : (value === undefined ? "" : String(value))}
            onChange={(e) => setValue(f.id, e.target.value === "" ? "" : Number(e.target.value))}
            className={`${inputBase} ${f.small ? "max-w-[120px]" : "max-w-xs"}`} style={inputStyle} />
          {hintEl}
        </label>
      );
    case "date":
      return (
        <label className="block">
          {labelEl}
          <input type="date"
            required={f.required}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(f.id, e.target.value)}
            className={`${inputBase} max-w-xs`} style={inputStyle} />
          {hintEl}
        </label>
      );
    case "dropdown":
      return (
        <label className="block">
          {labelEl}
          <select
            required={f.required}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(f.id, e.target.value)}
            className={`${inputBase} max-w-sm`} style={inputStyle}>
            <option value="" disabled>{t("Choose…")}</option>
            {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {hintEl}
        </label>
      );
    case "radio":
      return (
        <fieldset className="block">
          {labelEl}
          <div className="space-y-1.5">
            {f.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-(--text)">
                <input type="radio" name={f.id}
                  required={f.required}
                  checked={value === opt}
                  onChange={() => setValue(f.id, opt)}
                  className="accent-(--accent)" />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {hintEl}
        </fieldset>
      );
    case "checkbox": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="block">
          {labelEl}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl border p-3"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            {f.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-(--text)">
                <input type="checkbox"
                  checked={arr.includes(opt)}
                  onChange={() => toggleCheckbox(f.id, opt)}
                  className="accent-(--accent)" />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {hintEl}
        </fieldset>
      );
    }
  }
}
