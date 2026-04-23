import User from "@/models/User";

/**
 * Generate the next sequential Employee Code:  JPF/JNA/26/01
 *
 *   JPF      — Janman People's Foundation (constant)
 *   {PROJECT}— 3-letter project code chosen by HR (e.g. JNA, DLF, COR). Forced uppercase.
 *   {YY}     — last 2 digits of the joining year
 *   {NN}     — joining sequence within that project + year, zero-padded to at least 2 digits
 */
export async function nextEmployeeId(projectCode: string): Promise<string> {
  const project = sanitizeProjectCode(projectCode);
  const yy = String(new Date().getFullYear() % 100).padStart(2, "0");
  const stem = `JPF/${project}/${yy}/`;

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

/** Normalise a project code: keep A–Z only, uppercase, exactly 3 chars. */
export function sanitizeProjectCode(raw: string): string {
  const cleaned = (raw || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length !== 3) {
    throw new Error("Project code must be exactly 3 letters (A–Z), e.g. JNA, DLF, COR");
  }
  return cleaned;
}
