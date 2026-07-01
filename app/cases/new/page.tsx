import AppShell from "@/components/shared/AppShell";
import CreateCaseForm from "@/components/shared/CreateCaseForm";
import CreateClientButton from "@/components/shared/CreateClientButton";
import { getServerT } from "@/lib/i18n-server";

/**
 * Staff-facing "file a new case" page. Any logged-in staff role can open a case
 * here (community members use /community/file-case). Every case still requires
 * the mandatory reporter name + mobile + point of contact, enforced by the form
 * and re-checked by POST /api/cases.
 */
export default async function NewCasePage() {
  const t = await getServerT();
  return (
    <AppShell allow={["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"]}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-(--text)">{t("File a New Case")}</h1>
            <p className="text-sm text-(--muted) mt-1">
              {t("Open a case for a victim/client. Name, mobile and a point of contact are required.")}
            </p>
          </div>
          <CreateClientButton />
        </div>
        <CreateCaseForm defaultOpen />
      </div>
    </AppShell>
  );
}
