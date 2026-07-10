"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

/**
 * Lightweight rich-text editor for daily reports — bold / italic / underline /
 * strikethrough, headings, bullet + numbered lists, tables, quote, divider,
 * undo/redo. Zero dependencies (contentEditable + execCommand, which every
 * browser still ships). The HTML is allowlist-sanitised server-side.
 */
export default function RichTextEditor({
  onChange,
  placeholder,
  minHeight = 220,
}: {
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);

  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  }

  function insertTable() {
    const rows = 3, cols = 3;
    let html = '<table><tbody>';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += r === 0 ? "<th>&nbsp;</th>" : "<td>&nbsp;</td>";
      html += "</tr>";
    }
    html += "</tbody></table><p><br /></p>";
    exec("insertHTML", html);
  }

  function emit() {
    const el = ref.current;
    if (!el) return;
    setEmpty(el.innerText.trim().length === 0);
    onChange(el.innerHTML);
  }

  // Static action ids (no closures in render) — dispatched by runAction so the
  // contentEditable ref is only ever touched inside event handlers.
  const BTNS: { tip: string; label: React.ReactNode; act: string }[] = [
    { tip: t("Bold"),          label: <b>B</b>,                 act: "bold" },
    { tip: t("Italic"),        label: <i>I</i>,                 act: "italic" },
    { tip: t("Underline"),     label: <u>U</u>,                 act: "underline" },
    { tip: t("Strikethrough"), label: <s>S</s>,                 act: "strikeThrough" },
    { tip: t("Heading"),       label: <span className="font-bold">H</span>, act: "h2" },
    { tip: t("Sub-heading"),   label: <span className="font-semibold text-[12px]">H2</span>, act: "h3" },
    { tip: t("Paragraph"),     label: "¶",                      act: "p" },
    { tip: t("Bullet list"),   label: "•≡",                     act: "insertUnorderedList" },
    { tip: t("Numbered list"), label: "1≡",                     act: "insertOrderedList" },
    { tip: t("Insert table"),  label: "⊞",                      act: "table" },
    { tip: t("Quote"),         label: "❝",                      act: "blockquote" },
    { tip: t("Divider"),       label: "—",                      act: "insertHorizontalRule" },
    { tip: t("Clear formatting"), label: "⌫ fmt",               act: "removeFormat" },
    { tip: t("Undo"),          label: "↩",                      act: "undo" },
    { tip: t("Redo"),          label: "↪",                      act: "redo" },
  ];

  function runAction(act: string) {
    if (act === "table") return insertTable();
    if (act === "h2" || act === "h3" || act === "p" || act === "blockquote") {
      return exec("formatBlock", `<${act}>`);
    }
    exec(act);
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        {BTNS.map((b, i) => (
          <button key={i} type="button" data-tip={b.tip}
            onMouseDown={(e) => e.preventDefault() /* keep selection */}
            onClick={() => runAction(b.act)}
            className="min-w-8 h-8 px-2 rounded-lg text-sm flex items-center justify-center transition-colors hover:bg-(--surface) text-(--text)">
            {b.label}
          </button>
        ))}
      </div>

      {/* Editing surface */}
      <div className="relative">
        {empty && (
          <p className="absolute top-3.5 left-4 text-sm pointer-events-none" style={{ color: "var(--muted-2)" }}>
            {placeholder ?? t("What did you work on today? Wins, blockers, visits, calls, plans for tomorrow…")}
          </p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          className="rt-content px-4 py-3 text-sm leading-relaxed focus:outline-none"
          style={{ minHeight, color: "var(--text)", userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>
    </div>
  );
}
