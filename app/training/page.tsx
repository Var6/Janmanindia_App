import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { tryConnectDB } from "@/lib/mongoose";
import TrainingMaterial from "@/models/TrainingMaterial";
import UploadForm from "@/components/training/UploadForm";
import MaterialList from "@/components/training/MaterialList";
import ApprovalQueue from "@/components/training/ApprovalQueue";
import OfflineSessions from "@/components/training/OfflineSessions";
import NoDBBanner from "@/components/shared/NoDBBanner";
import type { TrainingMaterial as TrainingMaterialT } from "@/components/training/types";

type VideoModule = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  category: string;
  durationMins: number;
};

const TRAINING_MODULES: VideoModule[] = [
  { id: "1", title: "Understanding the Right to Information Act",  description: "How to file an RTI, timelines, and what to do if your application is denied.",                              youtubeId: "p0wOFQbKt-A", category: "Civil Rights",   durationMins: 22 },
  { id: "2", title: "MGNREGA — Your Right to Employment",          description: "Register for rural employment guarantee, demand job cards, and escalate non-payment.",                      youtubeId: "ysz5S6PUM-M", category: "Labour Rights",  durationMins: 18 },
  { id: "3", title: "Filing an FIR — Step by Step",                description: "Know your rights when police refuse to register an FIR and how to approach magistrates.",                   youtubeId: "kCpjgl2baLs", category: "Criminal Law",   durationMins: 15 },
  { id: "6", title: "Building Defence Strategy under India's New Criminal Laws (BNS | BNSS | BSA)", description: "Lawyers' Training Workshop by Jan Nyay Abhiyan | Nyaya Shiksha Training Programme — Chargesheet Analysis, Cross-Examination, Defence Strategy, Mock Trial. Subscribe: youtube.com/@JanNyayAbhiyan. Share with lawyers, law students & legal aid workers.", youtubeId: "7A4tVYSptQk", category: "Criminal Law",   durationMins: 60 },
  { id: "4", title: "Domestic Violence Protection Act",            description: "Protection orders, shelter homes, and the role of protection officers.",                                    youtubeId: "TrMBHt_Cl10", category: "Family Law",     durationMins: 25 },
  { id: "5", title: "How to File a PIL",                           description: "Public Interest Litigation — who can file, which court, and the process.",                                  youtubeId: "Mk5d2iyRDLw", category: "Property Law",   durationMins: 28 },
];

const CATEGORIES = [...new Set(TRAINING_MODULES.map((m) => m.category))];

const INTERACTIVE_MODULES: { slug: string; title: string; description: string }[] = [
  { slug: "fundamental-rights", title: "Fundamental Rights", description: "Constitutional rights under Articles 12–35 — interactive walkthrough with case scenarios." },
  { slug: "child-rights",       title: "Child Rights",       description: "POCSO, JJ Act, and child protection mechanisms — guided modules for field workers." },
  { slug: "gbv",                title: "Gender-Based Violence", description: "DV Act, Section 498A, workplace harassment — response protocols and remedies." },
  { slug: "scst-atrocities",    title: "SC/ST Atrocities Act", description: "Filing complaints, special courts, and protections under the PoA Act." },
];

function serializeMaterial(m: unknown): TrainingMaterialT {
  const obj = m as Record<string, unknown> & { _id: unknown; uploadedBy: unknown; approvedBy?: unknown; createdAt?: unknown; approvedAt?: unknown };
  const ub = obj.uploadedBy as { _id?: unknown; name?: string; role?: string; email?: string } | null;
  const ab = obj.approvedBy as { _id?: unknown; name?: string } | null | undefined;
  return {
    _id:         String(obj._id),
    title:       String(obj.title ?? ""),
    description: obj.description ? String(obj.description) : undefined,
    category:    obj.category ? String(obj.category) : undefined,
    fileUrl:     String(obj.fileUrl ?? ""),
    fileType:    (obj.fileType as TrainingMaterialT["fileType"]) ?? "other",
    status:      (obj.status as TrainingMaterialT["status"]) ?? "pending",
    uploadedBy:  ub ? { _id: String(ub._id), name: ub.name ?? "Unknown", role: ub.role ?? "—", email: ub.email } : null,
    approvedBy:  ab ? { _id: String(ab._id), name: ab.name ?? "Unknown" } : null,
    approvedAt:  obj.approvedAt ? new Date(obj.approvedAt as string).toISOString() : undefined,
    rejectionReason: obj.rejectionReason ? String(obj.rejectionReason) : undefined,
    createdAt:   obj.createdAt ? new Date(obj.createdAt as string).toISOString() : new Date().toISOString(),
  };
}

export default async function TrainingPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const t = await getServerT();
  const dbOk = await tryConnectDB();
  const canReview = ["hr", "director", "superadmin"].includes(session.role);
  const canUpload = session.role !== "community";

  let approved: TrainingMaterialT[] = [];
  let pending: TrainingMaterialT[] = [];

  if (dbOk) {
    const [approvedDocs, pendingDocs] = await Promise.all([
      TrainingMaterial.find({ status: "approved" }).sort({ createdAt: -1 })
        .populate("uploadedBy", "name role").lean(),
      canReview
        ? TrainingMaterial.find({ status: "pending" }).sort({ createdAt: -1 })
            .populate("uploadedBy", "name role email").lean()
        : Promise.resolve([]),
    ]);
    approved = approvedDocs.map(serializeMaterial);
    pending = (pendingDocs as unknown[]).map(serializeMaterial);
  }

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Legal Training Center")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Free tutorials and team-uploaded materials on rights, schemes, and legal procedure.")}
        </p>
      </div>

      {canReview && pending.length > 0 && <ApprovalQueue materials={pending} />}

      <section>
        <h2 className="text-lg font-semibold text-(--text) mb-1">{t("Interactive Training Modules")}</h2>
        <p className="text-xs text-(--muted) mb-4">
          {t("Self-paced legal modules from Janman People's Foundation — Jan Nyaya Abhiyan.")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTERACTIVE_MODULES.map((mod) => (
            <a
              key={mod.slug}
              href={`https://shashwat-sys.github.io/janman-training/${mod.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-(--surface) rounded-2xl border border-(--border) p-4 hover:border-(--accent) transition-colors block"
            >
              <p className="font-semibold text-sm text-(--text)">{mod.title}</p>
              <p className="text-xs text-(--muted) mt-1">{mod.description}</p>
              <p className="text-xs text-(--accent) mt-3">{t("Open module ↗")}</p>
            </a>
          ))}
        </div>
      </section>

      <OfflineSessions
        currentUserId={session.id}
        canCreate={["socialworker", "hr", "director", "superadmin"].includes(session.role)}
      />

      {canUpload && <UploadForm />}

      <section>
        <h2 className="text-lg font-semibold text-(--text) mb-4">{t("Community Library")}</h2>
        <MaterialList materials={approved} currentUserId={session.id} currentRole={session.role} />
      </section>

      {CATEGORIES.map((category) => {
        const modules = TRAINING_MODULES.filter((m) => m.category === category);
        return (
          <section key={category}>
            <h2 className="text-lg font-semibold text-(--text) mb-4">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((mod) => (
                <div key={mod.id}
                  className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden hover:border-(--accent) transition-colors">
                  <div className="relative aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${mod.youtubeId}`}
                      title={mod.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm text-(--text) leading-snug">{mod.title}</p>
                    <p className="text-xs text-(--muted) mt-1 line-clamp-2">{mod.description}</p>
                    <p className="text-xs text-(--accent) mt-2">{mod.durationMins} {t("min")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
