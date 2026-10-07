import AppShell from "@/components/shared/AppShell";

/** Read-only Insights for staff a dashboard or report has been shared with.
 *  Directors build everything under /director/insights. */
const STAFF = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={STAFF}>{children}</AppShell>;
}
