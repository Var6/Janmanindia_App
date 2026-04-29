import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Janman Legal Aid",
  description:
    "How Janman People's Foundation collects, uses, stores, and protects your data, including the use of Google account information for sign-in and calendar synchronisation.",
};

const LAST_UPDATED = "29 April 2026";

/** Public Privacy Policy. Linked from the Google OAuth consent screen — must
 *  remain reachable without a login session. */
export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <Section title="1. Who we are">
        <p>
          Janman Legal Aid (&ldquo;Janman&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;)
          is a platform operated by Janman People&apos;s Foundation that connects
          community members in need of legal assistance with social workers,
          paralegal volunteers, advocates, and supporting administrative staff.
          Our application is reachable at{" "}
          <a href="https://app.janmanindia.org" className="underline" style={{ color: "var(--accent)" }}>
            app.janmanindia.org
          </a>.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>We only collect information that is needed to deliver legal-aid services:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account information:</strong> name, email address, phone
            number (optional), profile photo, role within the platform
            (community member, social worker, advocate, HR, finance,
            administrator, director, super admin), employee ID where
            applicable, and the date you joined or left the organisation.
          </li>
          <li>
            <strong>Google sign-in data:</strong> when you sign in with Google,
            we receive your Google account ID, email, profile name, and
            profile picture, along with a refresh token that lets us keep your
            calendar in sync (see section 4).
          </li>
          <li>
            <strong>Case and matter data:</strong> if you are a community
            member, we store the case details you submit (case title, case
            type, supporting documents, hearing dates, notes) so that the
            assigned social worker and advocate can act on your behalf.
          </li>
          <li>
            <strong>Operational data:</strong> activities, appointments,
            attendance, daily reports, expense submissions, training
            enrolments, and chat messages between staff members. This data is
            visible only to the people involved in the matter and to
            authorised supervisors.
          </li>
          <li>
            <strong>Technical data:</strong> standard server logs (IP address,
            user-agent, timestamp) used for security and abuse-prevention.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your information">
        <ul className="list-disc pl-6 space-y-2">
          <li>To authenticate you and route you to the correct dashboard for your role.</li>
          <li>To match community members to social workers and advocates.</li>
          <li>To track cases, hearings, and outcomes through their lifecycle.</li>
          <li>To synchronise scheduled work to your Google Calendar so you don&apos;t miss it.</li>
          <li>To enable internal collaboration (chat, daily reports, attendance).</li>
          <li>To comply with applicable Indian law and respond to lawful requests.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data, share it with advertisers,
          or use it to train AI models.
        </p>
      </Section>

      <Section title="4. Google user data and Google Calendar">
        <p>
          When you sign in with Google, we request the{" "}
          <code className="text-[13px] px-1 py-0.5 rounded" style={{ background: "var(--bg-secondary)" }}>
            calendar.events
          </code>{" "}
          scope so that activities, appointments, and offline trainings
          assigned to you on Janman appear automatically on your Google
          Calendar. Specifically, we use this access to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Create a calendar event when an activity / appointment / training is scheduled with you.</li>
          <li>Update that event when its time, title, or attendee list changes inside Janman.</li>
          <li>Delete that event when the underlying item is cancelled or removed.</li>
          <li>Add other invited Janman users as attendees on the event so it propagates to their calendars.</li>
        </ul>
        <p>
          We do <strong>not</strong> read your existing calendar entries, do
          not list your other calendars, and do not access events that Janman
          itself didn&apos;t create. Janman&apos;s use of information received
          from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline" style={{ color: "var(--accent)" }}
            target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements.
        </p>
        <p>
          You can revoke our access at any time at{" "}
          <a href="https://myaccount.google.com/permissions"
            className="underline" style={{ color: "var(--accent)" }}
            target="_blank" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>. Revoking access will stop calendar sync; events already
          created on your calendar will remain there until you delete them.
        </p>
      </Section>

      <Section title="5. How we share your information">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Within Janman:</strong> only with the people involved in
            handling your case (the assigned social worker and advocate, the
            director who oversees them, and HR / finance / administrator staff
            for operational matters such as invoices and attendance).
          </li>
          <li>
            <strong>With Google:</strong> to deliver calendar invitations to
            attendees of an event you are part of.
          </li>
          <li>
            <strong>With infrastructure providers:</strong> MongoDB Atlas
            (database hosting) and Cloudflare R2 (file storage). These
            providers process data on our behalf under their respective data
            processing terms.
          </li>
          <li>
            <strong>With authorities:</strong> if compelled by a valid Indian
            legal process, or to protect the safety of a person where there is
            a risk of imminent harm.
          </li>
        </ul>
      </Section>

      <Section title="6. Data retention">
        <p>
          Account information is retained for the lifetime of your account
          and for up to 7 years after deactivation, in line with general
          record-keeping obligations for legal-aid organisations. Case data is
          retained for the legal life of the matter plus any statutory
          archival period. Server logs are retained for up to 90 days. You can
          request earlier deletion of personally identifiable data by writing
          to us (see section 9), subject to overriding legal obligations.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Data is encrypted in transit (HTTPS) and at rest (provider-managed
          encryption). Access is gated by role-based permissions and audited
          on the server. Refresh tokens for Google Calendar are stored
          encrypted and excluded from regular database queries by default.
        </p>
      </Section>

      <Section title="8. Your rights">
        <p>You can:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access your data through your profile page.</li>
          <li>Correct your profile details there.</li>
          <li>Disconnect Google Calendar from the profile page.</li>
          <li>Request deletion or export of your data (see section 9).</li>
        </ul>
      </Section>

      <Section title="9. Contact">
        <p>
          For privacy questions, deletion requests, or anything else, write
          to{" "}
          <a href="mailto:shashwat@janmanindia.org"
            className="underline" style={{ color: "var(--accent)" }}>
            shashwat@janmanindia.org
          </a>. We aim to respond within 30 days.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy as the platform evolves. The &ldquo;Last
          updated&rdquo; date at the top of the page reflects the most recent
          revision. Material changes will be notified through the app and / or
          email.
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
