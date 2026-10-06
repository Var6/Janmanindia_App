import InsightsNav from "@/components/insights/InsightsNav";

/** Every Insights page sits under the director layout (director + superadmin
 *  only, enforced by AppShell) and shares this tab strip. */
export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <InsightsNav />
      {children}
    </div>
  );
}
