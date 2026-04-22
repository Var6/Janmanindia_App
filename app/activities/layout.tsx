import AppShell from "@/components/shared/AppShell";

const STAFF = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={STAFF}>{children}</AppShell>;
}
