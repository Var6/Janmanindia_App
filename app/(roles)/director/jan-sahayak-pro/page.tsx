import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import JanSahayakPro from "@/components/jan-sahayak-pro/JanSahayakPro";

/** Internal org-management app: casework, kanban, DLF tracker, event pipeline,
 *  annual report drafter. Director / superadmin only. */
export default async function Page() {
  const session = await getSessionFromCookies();
  const allowed = ["director", "superadmin"];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  return (
    <div className="space-y-4">
      <Link
        href="/director/jan-sahayak-pro/sourced/cases"
        className="block bg-(--surface) border border-(--accent)/40 rounded-2xl p-4 hover:border-(--accent) transition-colors"
      >
        <div className="text-[10px] uppercase tracking-wider text-(--accent) font-bold mb-1">
          New · Ported from jan-sahayak-pro repo
        </div>
        <div className="text-sm font-semibold text-(--text)">
          Cases · Drafter · Legal Knowledge · PLV Training →
        </div>
        <div className="text-xs text-(--muted) mt-1">
          Reference modules from the standalone Jan Sahayak Pro source repo.
        </div>
      </Link>
      <JanSahayakPro />
    </div>
  );
}
