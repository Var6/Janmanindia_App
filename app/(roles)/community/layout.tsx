import AppShell from "@/components/shared/AppShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["community"]}>{children}</AppShell>;
}
