import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Grievance from "@/models/Grievance";
import SubmitForm from "@/components/grievance/SubmitForm";
import MyGrievances from "@/components/grievance/MyGrievances";
import NoDBBanner from "@/components/shared/NoDBBanner";

interface Populated {
  _id: unknown;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_review" | "responded" | "closed";
  hrResponse?: string;
  respondedBy?: { _id: unknown; name?: string; role?: string } | null;
  respondedAt?: Date;
  createdAt: Date;
  anonymous?: boolean;
}

export default async function GrievancePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const dbOk = await tryConnectDB();

  let mine: ReturnType<typeof serialize>[] = [];
  if (dbOk && mongoose.Types.ObjectId.isValid(session.id)) {
    const docs = await Grievance.find({ submittedBy: new mongoose.Types.ObjectId(session.id) })
      .sort({ createdAt: -1 })
      .populate("respondedBy", "name role")
      .lean();
    mine = (docs as unknown as Populated[]).map(serialize);
  }

  const isHr = ["hr", "director", "superadmin"].includes(session.role);

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Grievance Box</h1>
        <p className="text-sm text-(--muted) mt-1">
          A direct, confidential channel to HR. Every grievance is logged, tracked, and answered.
        </p>
      </div>

      <SubmitForm />

      <section>
        <h2 className="text-lg font-semibold text-(--text) mb-3">My Submissions</h2>
        <MyGrievances grievances={mine} />
      </section>

      {isHr && (
        <div className="p-4 rounded-xl border border-(--border) bg-(--surface)">
          <p className="text-xs text-(--muted)">
            HR view — go to{" "}
            <a href="/hr/grievances" className="font-semibold underline" style={{ color: "var(--accent)" }}>
              HR Grievance Inbox
            </a>{" "}
            to review and respond to all submissions.
          </p>
        </div>
      )}
    </div>
  );
}

function serialize(g: Populated) {
  return {
    _id:         String(g._id),
    category:    g.category,
    subject:     g.subject,
    description: g.description,
    status:      g.status,
    hrResponse:  g.hrResponse,
    respondedBy: g.respondedBy ? { name: g.respondedBy.name ?? "HR", role: g.respondedBy.role ?? "hr" } : null,
    respondedAt: g.respondedAt ? new Date(g.respondedAt).toISOString() : undefined,
    createdAt:   new Date(g.createdAt).toISOString(),
    anonymous:   g.anonymous,
  };
}
