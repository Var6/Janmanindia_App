"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type Copilot = { enabled: boolean; requireApproval: boolean; context: string; datasets: string[]; changedByName?: string; changedAt?: string };
type Settings = {
  copilot: Copilot;
  copilotEnv: { hasKey: boolean; forcedOff: boolean; model: string };
  datasets: { key: string; label: string; description: string }[];
  email: { enabled: boolean; from?: string };
  connectors: { key: string; label: string; configured: boolean; missing: string[] }[];
  files: { storage: "r2" | "local"; private: boolean };
  cron: { hasSecret: boolean };
  unconfirmedTargets: number;
};

const card = "rounded-2xl border border-(--border) p-5 space-y-3";

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: ok ? "var(--success-bg)" : "var(--warning-bg)", color: ok ? "var(--success-text)" : "var(--warning-text)" }}>
      {children}
    </span>
  );
}

/** Insights settings: the Copilot controls a director decides, and a plain
 *  view of which outside services are connected, each with a way to test it. */
export default function SettingsPage() {
  const { data, error, reload } = useApi<Settings>("/api/insights/settings");
  if (error) return <p className="text-sm text-(--error-text)">{error}</p>;
  if (!data) return <p className="text-sm text-(--muted)">Loading…</p>;
  return (
    <div className="space-y-5">
      <PageHeader icon="⚙️" title="Insights settings" subtitle="Copilot, email, connected sources and uploads" />
      {data.unconfirmedTargets > 0 && (
        <div className="rounded-2xl border p-4 text-sm flex flex-wrap items-center gap-3" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning-text)" }}>
          <span className="flex-1 min-w-60">
            {data.unconfirmedTargets} KPI{data.unconfirmedTargets === 1 ? " still has a placeholder target" : "s still have placeholder targets"}. Their red, amber and green
            status means little until the real targets are set.
          </span>
          <Link href="/director/insights/kpis?targets=1" className="btn-primary">Set targets</Link>
        </div>
      )}
      <CopilotCard key={data.copilot.changedAt ?? "new"} data={data} onSaved={reload} />
      <EmailCard data={data} />
      <ConnectorsCard data={data} />
      <FilesCard data={data} />
    </div>
  );
}

function CopilotCard({ data, onSaved }: { data: Settings; onSaved: () => void }) {
  const toast = useNotify();
  const [c, setC] = useState<Copilot>(data.copilot);
  const [saving, setSaving] = useState(false);
  const all = data.datasets.map((d) => d.key);
  const chosen = c.datasets.length ? c.datasets : all;
  const blocked = data.copilotEnv.forcedOff ? "It is forced off for this deployment (INSIGHTS_COPILOT=off)." : !data.copilotEnv.hasKey ? "The server has no ANTHROPIC_API_KEY yet, so it cannot run." : null;
  const dirty = JSON.stringify(c) !== JSON.stringify(data.copilot);

  function toggle(key: string) {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    setC({ ...c, datasets: next.length === all.length ? [] : next });
  }

  async function save() {
    if (c.enabled && !data.copilot.enabled && !window.confirm(
      "Switch Copilot on?\n\nQuestions typed into Copilot, and the grouped totals needed to answer them, will be sent to Anthropic. Names, case titles, documents and imported data are never sent, and groups smaller than 3 are hidden.",
    )) return;
    setSaving(true);
    try {
      await api("/api/insights/settings", { method: "PUT", body: { copilot: { ...c, datasets: c.datasets.length ? c.datasets : all } } });
      toast.success("Copilot settings saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <section className={card} style={{ background: "var(--surface)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-(--text) flex-1">Copilot</h2>
        <Pill ok={data.copilot.enabled && !blocked}>{data.copilot.enabled && !blocked ? "On" : "Off"}</Pill>
      </div>
      <p className="text-sm text-(--muted)">
        Copilot answers questions in plain language. Switching it on is the organisation&rsquo;s consent for questions and grouped totals to
        go to Anthropic (model: {data.copilotEnv.model}). It never reads names, case titles, documents or imported data.
      </p>
      {blocked && <p className="text-sm rounded-lg p-3" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>{blocked}</p>}

      <label className="flex items-start gap-2 text-sm text-(--text)">
        <input type="checkbox" className="mt-1" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} />
        <span><span className="font-medium">Copilot is on</span><br /><span className="text-xs text-(--muted)">Directors and superadmins can use the Copilot tab.</span></span>
      </label>
      <label className="flex items-start gap-2 text-sm text-(--text)">
        <input type="checkbox" className="mt-1" checked={c.requireApproval} onChange={(e) => setC({ ...c, requireApproval: e.target.checked })} />
        <span><span className="font-medium">Ask before each query</span><br /><span className="text-xs text-(--muted)">Each query is shown in plain words and runs only when the person approves it.</span></span>
      </label>

      <div>
        <p className={labelCls}>Data Copilot may use</p>
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.datasets.map((d) => (
            <label key={d.key} className="inline-flex items-center gap-1.5 text-sm text-(--text)" title={d.description}>
              <input type="checkbox" checked={chosen.includes(d.key)} onChange={() => toggle(d.key)} />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="copilot-context">Background for Copilot (optional)</label>
        <textarea id="copilot-context" className={`${inputCls} min-h-28`} maxLength={5000} value={c.context} onChange={(e) => setC({ ...c, context: e.target.value })}
          placeholder={"e.g. Our financial year targets are 120 new cases and 480 hearings. \"The fellowship\" means the District Legal Fellowship in Purnia, Katihar, Araria and Kishanganj."} />
        <p className="text-[11px] text-(--muted) mt-1">
          Sent with every question, so keep it to definitions, targets and how the programme is organised. No names or case details. {c.context.length.toLocaleString("en-IN")} / 5,000
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={!dirty || saving || chosen.length === 0} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        {data.copilot.changedAt && (
          <span className="text-xs text-(--muted)">
            Last changed by {data.copilot.changedByName ?? "a director"} on {new Date(data.copilot.changedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </span>
        )}
      </div>
    </section>
  );
}

function EmailCard({ data }: { data: Settings }) {
  const toast = useNotify();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function test() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api<{ to: string }>("/api/insights/settings/test-email", { method: "POST" });
      setResult({ ok: true, text: `Sent to ${r.to}. Check the inbox (and spam).` });
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
      toast.error("The test email did not go out");
    } finally { setBusy(false); }
  }

  return (
    <section className={card} style={{ background: "var(--surface)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-(--text) flex-1">Email</h2>
        <Pill ok={data.email.enabled}>{data.email.enabled ? "Connected" : "Not set up"}</Pill>
      </div>
      <p className="text-sm text-(--muted)">
        Used for alert emails, emailed reports and @mentions.
        {data.email.enabled ? ` Messages go out as ${data.email.from}.` : " Whoever runs the server needs to add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" disabled={!data.email.enabled || busy} onClick={test}>{busy ? "Sending…" : "Send me a test email"}</button>
        {result && <span className="text-sm" style={{ color: result.ok ? "var(--success-text)" : "var(--error-text)" }}>{result.text}</span>}
      </div>
      <p className="text-xs text-(--muted)">
        Slack is set per alert: open an alert on the <Link className="text-(--accent)" href="/director/insights/alerts">Alerts</Link> tab and use &ldquo;Send a test to Slack&rdquo;.
        {data.cron.hasSecret ? "" : " The daily run of alerts and data refreshes needs CRON_SECRET, which is not set."}
      </p>
    </section>
  );
}

function ConnectorsCard({ data }: { data: Settings }) {
  return (
    <section className={card} style={{ background: "var(--surface)" }}>
      <h2 className="text-base font-semibold text-(--text)">Connected data sources</h2>
      <p className="text-sm text-(--muted)">
        CSV and Excel uploads and Google Sheets need no setup. The others work once their login details are added to the server&rsquo;s settings.
        To check one, import a small table from it on the <Link className="text-(--accent)" href="/director/insights/data?tab=import">Data › Imported data</Link> tab.
      </p>
      <ul className="divide-y divide-(--border)">
        {data.connectors.map((c) => (
          <li key={c.key} className="py-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-(--text) w-44">{c.label}</span>
            <Pill ok={c.configured}>{c.configured ? "Connected" : "Not set up"}</Pill>
            {!c.configured && <span className="text-xs text-(--muted)">Needs {c.missing.join(", ")}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilesCard({ data }: { data: Settings }) {
  const priv = data.files.private;
  return (
    <section className={card} style={{ background: "var(--surface)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-(--text) flex-1">Uploaded files</h2>
        <Pill ok={priv}>{priv ? "Private" : "Open by link"}</Pill>
      </div>
      {priv ? (
        <p className="text-sm text-(--muted)">
          New uploads (ID documents, case files, receipts, photos) are stored as private links. Only signed-in users can open them, and a
          link copied out of the app stops working.
        </p>
      ) : (
        <p className="text-sm text-(--muted)">
          Uploads are stored as public links: anyone who has a file&rsquo;s link can open it without signing in. This covers ID documents and
          case files. The app can now serve files privately; the switch-over is three steps for whoever runs the server (move the old
          links with <code>scripts/migrate-file-urls.mjs</code>, set <code>FILES_PRIVATE=on</code>, then turn off public access on the storage bucket).
        </p>
      )}
    </section>
  );
}
