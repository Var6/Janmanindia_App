import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — Janman Legal Aid",
  description:
    "Terms governing your use of the Janman Legal Aid platform, including account responsibilities, acceptable use, and the limits of liability.",
};

const LAST_UPDATED = "29 April 2026";

/** Public Terms of Service. Linked from the Google OAuth consent screen and
 *  must remain reachable without a login session. */
export default function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <Section title="1. Acceptance">
        <p>
          By creating an account on Janman Legal Aid (&ldquo;Janman&rdquo;,
          &ldquo;the platform&rdquo;) or by signing in with a Google account,
          you agree to these Terms of Service and to our{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </Link>. If you do not agree, do not use the platform.
        </p>
      </Section>

      <Section title="2. Who can use Janman">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Community members:</strong> any adult resident of India
            seeking legal aid for matters within the scope of our practice.
            Minors must be represented by a parent or guardian who creates
            the account on their behalf.
          </li>
          <li>
            <strong>Staff and volunteers:</strong> social workers, paralegal
            volunteers, advocates, HR, finance, administrators, directors,
            and superadmins authorised by Janman People&apos;s Foundation.
            Staff use is governed by your engagement letter or volunteer
            agreement in addition to these Terms.
          </li>
        </ul>
        <p>
          We reserve the right to refuse, suspend, or terminate accounts
          that misuse the platform.
        </p>
      </Section>

      <Section title="3. Your account">
        <ul className="list-disc pl-6 space-y-2">
          <li>You are responsible for keeping your sign-in credentials safe.</li>
          <li>
            If you sign in via Google, you are responsible for the security of
            the underlying Google account.
          </li>
          <li>
            Tell us immediately if you suspect unauthorised access — write to{" "}
            <a href="mailto:shashwat@janmanindia.org"
              className="underline" style={{ color: "var(--accent)" }}>
              shashwat@janmanindia.org
            </a>.
          </li>
          <li>One person per account. Don&apos;t share logins.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Submit knowingly false information about a case, a person, or a hearing.</li>
          <li>Upload content you don&apos;t have the legal right to share.</li>
          <li>Attempt to access another user&apos;s account or data.</li>
          <li>Probe, scan, or otherwise attempt to compromise the platform&apos;s security.</li>
          <li>Use the platform to harass, threaten, or defame any person.</li>
          <li>
            Use automated tools to bulk-extract content beyond what is
            necessary for your role.
          </li>
        </ul>
      </Section>

      <Section title="5. Content you submit">
        <p>
          You retain ownership of content you submit to Janman (case
          descriptions, documents, voice recordings, etc.). You grant Janman
          People&apos;s Foundation a non-exclusive, royalty-free licence to
          store, display, and process that content as needed to deliver the
          legal-aid services you have asked for. We will not publish or share
          your content beyond what is described in our{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </Link>.
        </p>
      </Section>

      <Section title="6. Google services">
        <p>
          When you sign in with Google, you also authorise Janman to manage
          calendar events on your behalf to deliver scheduling features. The
          full scope and your control over it are described in the{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </Link>{" "}
          (section 4). You can revoke access at any time from your Google
          account permissions page.
        </p>
      </Section>

      <Section title="7. Not legal advice from the platform itself">
        <p>
          Janman is a coordination platform for legal-aid services. The
          platform itself does not provide legal advice. Advice you receive
          inside the platform comes from the specific advocates and
          paralegals working on your matter. Use of the platform does not by
          itself create an advocate-client relationship; that relationship is
          established by the assigned advocate accepting the matter.
        </p>
      </Section>

      <Section title="8. Service availability">
        <p>
          We aim to keep Janman available around the clock but cannot
          guarantee uninterrupted service. We may schedule maintenance,
          patch security vulnerabilities, or temporarily suspend features
          without prior notice.
        </p>
      </Section>

      <Section title="9. Disclaimers and limitation of liability">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; basis. To the
          fullest extent permitted by Indian law, Janman People&apos;s
          Foundation, its trustees, employees, and volunteers will not be
          liable for any indirect, incidental, special, or consequential
          damages arising out of your use of the platform. Nothing in these
          Terms limits or excludes any liability that cannot be limited or
          excluded under law.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may stop using Janman at any time. We may suspend or terminate
          your account if you breach these Terms or applicable law, or if
          your continued use poses a safety risk to another person. Where
          reasonable, we will tell you why. After termination, your data is
          handled in line with the retention rules in the{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </Link>.
        </p>
      </Section>

      <Section title="11. Governing law and disputes">
        <p>
          These Terms are governed by the laws of India. Any dispute arising
          out of your use of the platform will be subject to the exclusive
          jurisdiction of the courts at Delhi.
        </p>
      </Section>

      <Section title="12. Changes to these terms">
        <p>
          We may update these Terms from time to time. Material changes will
          be notified through the app and / or email. Continued use of the
          platform after the changes take effect constitutes acceptance.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these Terms? Write to{" "}
          <a href="mailto:shashwat@janmanindia.org"
            className="underline" style={{ color: "var(--accent)" }}>
            shashwat@janmanindia.org
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
