import AppShell from "@/components/shared/AppShell";

// Every staff role can file an expenditure application. Community members can't.
const STAFF = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={STAFF}>{children}</AppShell>;
}
