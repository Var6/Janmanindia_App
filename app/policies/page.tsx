import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { POLICIES } from "@/lib/policies";
import PolicyViewer from "@/components/policies/PolicyViewer";

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
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Policies</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Official HR, Finance, and POSH policies of Janman People&apos;s Foundation. Switch tabs to read each one, search to jump to a section, or download the original signed PDF.
        </p>
      </div>

      <PolicyViewer policies={POLICIES} downloads={DOWNLOADS} />
    </div>
  );
}
