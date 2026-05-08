import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Account Deletion — Janman Legal Aid",
  description:
    "How to request deletion of your Janman Legal Aid account and the associated data.",
};

const LAST_UPDATED = "8 May 2026";

export default function AccountDeletionPage() {
  return (
    <LegalShell title="How to delete your Janman account" lastUpdated={LAST_UPDATED}>
      <Section title="Request deletion">
        <p>
          To delete your Janman Legal Aid account, email{" "}
          <a
            href="mailto:support@janmanindia.org"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            support@janmanindia.org
          </a>{" "}
          from the address linked to your account, or tell your assigned social
          worker. Please include your full name and the phone number or email
          you registered with so we can locate your account.
        </p>
      </Section>

      <Section title="What gets deleted">
        <p>Within 30 days of a verified request, we delete:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your community account and profile details.</li>
          <li>Voice messages and chat content you sent.</li>
          <li>Identity documents and other files you uploaded.</li>
        </ul>
      </Section>

      <Section title="What may be retained">
        <p>
          Some case-related records may be retained for legal record-keeping
          obligations under applicable Indian law — typically up to 7 years.
          Where retention is required, the records are kept on a
          restricted-access basis and are not used for any other purpose.
        </p>
      </Section>

      <Section title="Google Calendar access">
        <p>
          If you signed in with Google, you can additionally revoke Janman&apos;s
          access to your Google account at any time at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline"
            style={{ color: "var(--accent)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          For anything else, see our{" "}
          <a
            href="/privacy"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            Privacy Policy
          </a>{" "}
          or write to{" "}
          <a
            href="mailto:support@janmanindia.org"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            support@janmanindia.org
          </a>.
        </p>
      </Section>
    </LegalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-(--text)">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
