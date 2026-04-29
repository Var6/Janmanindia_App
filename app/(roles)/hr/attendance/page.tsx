"use client";

import { useState, useEffect, useCallback } from "react";
import { SkeletonRow } from "@/components/ui/Skeleton";

type AttendanceStatus = "present" | "absent" | "late" | "half-day";

interface StaffRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  avatarUrl?: string;
  attendance: {
    _id: string;
    status: AttendanceStatus;
    markedAt: string;
    notes?: string;
  } | null;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string; border: string }> = {
  present:   { label: "Present",   bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  absent:    { label: "Absent",    bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
  late:      { label: "Late",      bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "half-day":{ label: "Half Day",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

const ROLE_LABELS: Record<string, string> = {
  socialworker: "Social Worker",
  litigation:   "Litigation",
  hr:           "HR",
  finance:      "Finance",
  administrator: "Administrator",
  director:     "Director",
  superadmin:   "Super Admin",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <svg className={`animate-spin ${sm ? "w-3 h-3" : "w-4 h-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Avatar({ user, size = 36 }: { user: Pick<StaffRecord, "name" | "avatarUrl">; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.32, fontWeight: 700, color: "var(--accent)" }}>
          {initials(user.name)}
        </div>
      )}
    </div>
  );
}

export default function HrAttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]     = useState(today);
  const [staff, setStaff]   = useState<StaffRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState<Record<string, boolean>>({});
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/hr/attendance?date=${d}`);
      const data = await res.json();
      if (data.staff) setStaff(data.staff);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  async function mark(employeeId: string, status: AttendanceStatus) {
    setMarking((m) => ({ ...m, [employeeId]: true }));
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, status, date }),
      });
      if (res.ok) {
        const data = await res.json();
        setStaff((prev) =>
          prev.map((s) => s._id === employeeId ? { ...s, attendance: data.record } : s)
        );
      }
    } finally {
      setMarking((m) => ({ ...m, [employeeId]: false }));
    }
  }

  const roles = ["all", ...Array.from(new Set(staff.map((s) => s.role))).sort()];
  const filtered = roleFilter === "all" ? staff : staff.filter((s) => s.role === roleFilter);

  const counts = {
    present:  staff.filter((s) => s.attendance?.status === "present").length,
    absent:   staff.filter((s) => s.attendance?.status === "absent").length,
    late:     staff.filter((s) => s.attendance?.status === "late").length,
    "half-day": staff.filter((s) => s.attendance?.status === "half-day").length,
    unmarked: staff.filter((s) => !s.attendance).length,
  };

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Attendance</h1>
          <p className="text-sm text-(--muted) mt-1">{dateLabel}</p>
        </div>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm focus:outline-none"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["present", "late", "half-day", "absent", "unmarked"] as const).map((key) => {
          const cfg = key === "unmarked"
            ? { label: "Unmarked", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" }
            : STATUS_CONFIG[key];
          return (
            <div key={key} className={`p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              <p className={`text-xl font-bold ${cfg.text}`}>{counts[key]}</p>
              <p className={`text-xs mt-0.5 ${cfg.text} opacity-80`}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{
              background: roleFilter === r ? "var(--accent)" : "var(--bg)",
              color: roleFilter === r ? "var(--accent-contrast)" : "var(--text)",
              borderColor: roleFilter === r ? "var(--accent)" : "var(--border)",
            }}
          >
            {r === "all" ? "All staff" : (ROLE_LABELS[r] ?? r)}
          </button>
        ))}
      </div>

      {/* Staff list */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {loading ? (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4"><SkeletonRow trailing={true} /></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-(--muted)">No staff found.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((s) => {
              const att = s.attendance;
              const cfg = att ? STATUS_CONFIG[att.status] : null;
              const busy = marking[s._id];

              return (
                <div key={s._id} className="flex items-center gap-4 px-5 py-3 flex-wrap">
                  <Avatar user={s} size={38} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-(--text) truncate">{s.name}</p>
                    <p className="text-xs text-(--muted) truncate">
                      {ROLE_LABELS[s.role] ?? s.role}
                      {s.employeeId ? ` · ${s.employeeId}` : ""}
                    </p>
                  </div>

                  {/* Current status badge */}
                  {cfg && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}>
                      {cfg.label}
                      {att?.markedAt && (
                        <span className="opacity-70 font-normal ml-1">
                          {new Date(att.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Mark buttons */}
                  <div className="flex gap-1.5 shrink-0">
                    {(["present", "late", "half-day", "absent"] as AttendanceStatus[]).map((st) => {
                      const c = STATUS_CONFIG[st];
                      const active = att?.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => mark(s._id, st)}
                          disabled={busy}
                          title={c.label}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                            active
                              ? `${c.bg} ${c.text} ${c.border} ring-1 ring-offset-1`
                              : "border-(--border) text-(--muted) hover:border-(--accent) hover:text-(--accent)"
                          }`}
                          style={active ? { "--tw-ring-color": "currentColor" } as React.CSSProperties : undefined}
                        >
                          {busy ? <Spinner sm /> : c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-(--muted)">
        Records are saved immediately on click. Reload the page to refresh from the database.
      </p>
    </div>
  );
}
