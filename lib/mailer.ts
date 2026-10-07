import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. Off unless SMTP_HOST is set. With Google
 * Workspace, use smtp.gmail.com (port 465) and an app password for the
 * sending mailbox, or the Workspace SMTP relay.
 *
 *   SMTP_HOST, SMTP_PORT (default 465), SMTP_USER, SMTP_PASS,
 *   MAIL_FROM (e.g. "Janman Insights <insights@janmanindia.org>")
 */

let transport: Transporter | null = null;

export function mailEnabled(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.MAIL_FROM;
}

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

export type Mail = { to: string[]; subject: string; text: string; html?: string };

/** Sends one message per recipient so addresses are not exposed to each
 *  other. Returns how many went out; failures are logged, never thrown. */
export async function sendMail(mail: Mail): Promise<number> {
  if (!mailEnabled()) return 0;
  const to = [...new Set(mail.to.map((t) => t.trim().toLowerCase()).filter((t) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(t)))];
  let sent = 0;
  for (const addr of to) {
    try {
      await getTransport().sendMail({
        from: process.env.MAIL_FROM,
        to: addr,
        subject: mail.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
        text: mail.text,
        html: mail.html,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      sent++;
    } catch (e) {
      console.error("sendMail failed", addr, e);
    }
  }
  return sent;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Absolute link into the app for emails and Slack. */
export function appUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.janmanindia.org").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A plain, branded wrapper for Insights emails. `body` is already-escaped HTML. */
export function mailHtml(title: string, body: string, link?: { href: string; label: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#78716c">Janman People's Foundation · Insights</p>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
${body}
${link ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link.href)}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold">${escapeHtml(link.label)}</a></p>` : ""}
<p style="margin:24px 0 0;font-size:11px;color:#a8a29e">You are getting this because someone at Janman added you. Sign in to the Janman app to see more.</p>
</div></body></html>`;
}
