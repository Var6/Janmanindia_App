import { getSessionFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";

type VideoModule = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  category: string;
  durationMins: number;
};

const TRAINING_MODULES: VideoModule[] = [
  {
    id: "1",
    title: "Understanding the Right to Information Act",
    description: "How to file an RTI, timelines, and what to do if your application is denied.",
    youtubeId: "p0wOFQbKt-A",
    category: "Civil Rights",
    durationMins: 22,
  },
  {
    id: "2",
    title: "MGNREGA — Your Right to Employment",
    description: "Register for rural employment guarantee, demand job cards, and escalate non-payment.",
    youtubeId: "ysz5S6PUM-M",
    category: "Labour Rights",
    durationMins: 18,
  },
  {
    id: "3",
    title: "Filing an FIR — Step by Step",
    description: "Know your rights when police refuse to register an FIR and how to approach magistrates.",
    youtubeId: "kCpjgl2baLs",
    category: "Criminal Law",
    durationMins: 15,
  },
  {
    id: "4",
    title: "Domestic Violence Protection Act",
    description: "Protection orders, shelter homes, and the role of protection officers.",
    youtubeId: "TrMBHt_Cl10",
    category: "Family Law",
    durationMins: 25,
  },
  {
    id: "5",
    title: "How to File a PIL",
    description: "Public Interest Litigation — who can file, which court, and the process.",
    youtubeId: "Mk5d2iyRDLw",
    category: "Constitutional Law",
    durationMins: 30,
  },
  {
    id: "6",
    title: "Child Rights & POCSO Act",
    description: "Reporting child abuse, POCSO procedures, and special court proceedings.",
    youtubeId: "WBCh7mANJy8",
    category: "Child Rights",
    durationMins: 20,
  },
  {
    id: "7",
    title: "Ayushman Bharat — Health Scheme Enrolment",
    description: "How to register, what is covered, and how to resolve claim rejections.",
    youtubeId: "Tz29s2n4lAE",
    category: "Healthcare Rights",
    durationMins: 12,
  },
  {
    id: "8",
    title: "Land Rights & Tenancy Laws",
    description: "Trespass, eviction notices, and how to approach revenue courts.",
    youtubeId: "0diGgkOPa0w",
    category: "Property Law",
    durationMins: 28,
  },
];

const CATEGORIES = [...new Set(TRAINING_MODULES.map((m) => m.category))];

export default async function TrainingPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Legal Training Center</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Free video tutorials on your rights, government schemes, and legal procedures.
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const modules = TRAINING_MODULES.filter((m) => m.category === category);
        return (
          <section key={category}>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--accent)] transition-colors"
                >
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
                    <p className="font-semibold text-sm text-[var(--text)] leading-snug">{mod.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{mod.description}</p>
                    <p className="text-xs text-[var(--accent)] mt-2">{mod.durationMins} min</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Social worker feedback section */}
      {session.role === "socialworker" && (
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h2 className="font-semibold text-[var(--text)] mb-2">Submit Training Feedback</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Upload audio or video feedback on training content for review.
          </p>
          <form action="/api/training/feedback" method="POST" encType="multipart/form-data" className="space-y-3">
            <input
              type="text"
              name="title"
              placeholder="Feedback title"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              required
            />
            <textarea
              name="notes"
              placeholder="Written notes (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <div className="flex items-center gap-3">
              <input
                type="file"
                name="media"
                accept="audio/*,video/*"
                className="text-sm text-[var(--muted)]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Submit
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
