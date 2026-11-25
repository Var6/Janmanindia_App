/** Renders a dashboard / report text block: "# " and "## " lines become
 *  headings, "- " lines bullets, **text** bold, the rest paragraphs. No HTML
 *  is ever injected. */
export default function RichText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${out.length}`} className="list-disc pl-5 space-y-0.5">{bullets.map((b, i) => <li key={i}>{bold(b)}</li>)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((l, i) => {
    if (/^\s*-\s+/.test(l)) { bullets.push(l.replace(/^\s*-\s+/, "")); return; }
    flush();
    if (l.startsWith("## ")) out.push(<h4 key={i} className="text-sm font-semibold text-(--text)">{bold(l.slice(3))}</h4>);
    else if (l.startsWith("# ")) out.push(<h3 key={i} className="text-lg font-bold text-(--text)">{bold(l.slice(2))}</h3>);
    else if (l.trim()) out.push(<p key={i}>{bold(l)}</p>);
  });
  flush();
  return <div className="text-sm text-(--text) space-y-1.5 leading-relaxed">{out}</div>;
}

function bold(s: string): React.ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}
