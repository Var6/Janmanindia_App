import React from "react";

interface Props {
  label: string;
  hint?: string;
  /** Shown as small italic helper under the input ("e.g. …"). Use to give a
   *  realistic value the user can pattern-match against — not a generic
   *  description. Bad: "your full name". Good: "Priya Sharma". */
  example?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  /** Optional id wired up to the input — `htmlFor` on the label and used for
   *  the aria-describedby chain on the helper text. */
  htmlFor?: string;
}

/** Labelled form field with helper text — designed for community users in
 *  Bihar who may need extra hand-holding. Surfaces label, hint, AND example
 *  so the user always knows what to type. */
export default function Field({ label, hint, example, required, children, error, htmlFor }: Props) {
  const hintId    = hint    && htmlFor ? `${htmlFor}-hint`    : undefined;
  const errorId   = error   && htmlFor ? `${htmlFor}-error`   : undefined;
  const exampleId = example && htmlFor ? `${htmlFor}-example` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-sm font-semibold text-(--text)">
        {label}
        {required && (
          <span aria-hidden style={{ color: "var(--error, #dc2626)" }}>*</span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <p id={hintId} className="text-xs text-(--muted) leading-relaxed">{hint}</p>}
      {children}
      {example && (
        <p id={exampleId} className="text-[11px] text-(--muted) italic">
          e.g. <span className="not-italic font-mono text-(--text-2)">{example}</span>
        </p>
      )}
      {error && (
        <p id={errorId} role="alert"
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--error-text)" }}>
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

/** Visual primitives. Polished focus states, hover feedback, disabled
 *  styling, and a uniform ring colour across input/textarea/select. */
const BASE_INPUT = `
  w-full px-3.5 py-2.5 rounded-xl
  border border-(--border) bg-(--bg) text-(--text) text-sm
  placeholder:text-(--muted)/60 placeholder:italic
  hover:border-(--muted-2)
  focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/25
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-150
`.trim().replace(/\s+/g, " ");

interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional icon glyph rendered inside the input on the left (e.g. an emoji
   *  or a small inline SVG). Adds left padding automatically. */
  leftIcon?: React.ReactNode;
}

/** Pre-styled <input> matching Field. Supports an optional leftIcon for the
 *  search / search-with-magnifier pattern. */
export function Input({ leftIcon, className, ...rest }: InputWithIconProps) {
  if (!leftIcon) {
    return <input {...rest} className={`${BASE_INPUT} ${className ?? ""}`.trim()} />;
  }
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--muted) pointer-events-none">
        {leftIcon}
      </span>
      <input {...rest} className={`${BASE_INPUT} pl-10 ${className ?? ""}`.trim()} />
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${BASE_INPUT} resize-y min-h-20 ${props.className ?? ""}`.trim()}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${BASE_INPUT} pr-9 cursor-pointer ${props.className ?? ""}`.trim()}
    />
  );
}
