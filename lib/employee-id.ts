import User from "@/models/User";

const ROLE_PREFIX: Record<string, string> = {
  socialworker:  "SW",
  litigation:    "LT",
  hr:            "HR",
  finance:       "FN",
  administrator: "AM",
  director:      "DR",
  superadmin:    "SA",
  community:     "CM",
};

/**
 * Generate the next sequential Employee Code:  JPF/SW/yr26/01
 *
 *   JPF   — Janman People's Foundation
 *   SW    — role abbreviation (SW, LT, HR, FN, AM, DR, SA, CM)
 *   yr26  — last two digits of the joining year, prefixed with `yr`
 *   01    — zero-padded sequence within that role + year
 */
export async function nextEmployeeId(role: string): Promise<string> {
  const code = ROLE_PREFIX[role] ?? "EM";
  const yy = String(new Date().getFullYear() % 100).padStart(2, "0");
  const stem = `JPF/${code}/yr${yy}/`;

  // The existing IDs use `/` as a delimiter — escape it for the Mongo regex.
  const last = await User.findOne({ employeeId: { $regex: `^${stem.replace(/\//g, "\\/")}` } })
    .sort({ employeeId: -1 })
    .select("employeeId")
    .lean();

  let next = 1;
  if (last?.employeeId) {
    const tail = last.employeeId.slice(stem.length);
    const n = parseInt(tail, 10);
    if (!isNaN(n)) next = n + 1;
  }
  return `${stem}${String(next).padStart(2, "0")}`;
}
