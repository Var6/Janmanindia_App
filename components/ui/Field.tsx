import React from "react";

interface Props {
  label: string;
  hint?: string;
  example?: string;       // shown as small helper under the input ("e.g. …")
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

/**
 * Labelled form field with helper text — designed for community users.
 * "Tell what to fill where": label + hint + example are all surfaced.
 */
export default function Field({ label, hint, example, required, children, error }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-(--text)">
        {label}
        {required && <span style={{ color: "var(--error, #dc2626)" }}>*</span>}
      </label>
      {hint && <p className="text-xs text-(--muted) leading-relaxed">{hint}</p>}
      {children}
      {example && <p className="text-[11px] text-(--muted) italic">e.g. {example}</p>}
      {error && (
        <p className="text-xs font-medium" style={{ color: "var(--error-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Pre-styled <input> matching Field. */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm placeholder:text-(--muted)/70 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm placeholder:text-(--muted)/70 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all resize-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all ${props.className ?? ""}`}
    />
  );
}
