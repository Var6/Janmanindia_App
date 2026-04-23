import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { POLICIES } from "@/lib/policies";
import PolicyViewer from "@/components/policies/PolicyViewer";
import Spotlight from "@/components/ui/Spotlight";

const DOWNLOADS: Record<string, string> = {
  hr:         "/policies/hr-policy.pdf",
  finance:    "/policies/finance-policy.pdf",
  harassment: "/policies/sexual-harassment-policy.pdf",
};

export default async function PoliciesPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl glass px-6 py-7">
        <Spotlight color="var(--accent)" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-2">Organization Policies</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-(--text) tracking-tight">
            Policies of Janman People&apos;s Foundation
          </h1>
          <p className="text-sm text-(--muted) mt-2 max-w-2xl">
            Switch between HR, Finance and POSH policies using the tabs. Use the search to jump straight to a section, or download the original signed PDF.
          </p>
        </div>
      </header>

      <PolicyViewer policies={POLICIES} downloads={DOWNLOADS} />
    </div>
  );
}
