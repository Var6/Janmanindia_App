/**
 * Remove SEED / DEMO / DUMMY data from the database, preserving everything a
 * real person in the organisation created.
 *
 *   node scripts/cleanup-seed.mjs            # DRY RUN — counts only, no changes
 *   node scripts/cleanup-seed.mjs --apply    # actually delete
 *
 * It targets only unambiguous fixture markers laid down by scripts/seed.mjs,
 * scripts/seed-demo.mjs and scripts/case-import/*:
 *   Users   : @dev.janmanindia.in, @stub.janmanindia.org, employeeId JPF/DEV/* or JPF/DEMO/*
 *   Cases   : caseNumber DEV-*, JMI-2026-09001/09002, JMI-IMP-*
 *   Others  : the literal "dev seed" marker text, project codes JNA/DLF/COR
 *   Cascade : ICPs / expenses / reviews / meetings / messages tied to the above
 *
 * PRESERVED (never matched): real staff on @janmanindia.org (co-founders),
 * citizenjaivik@gmail.com, real registered community members, and lite-create
 * stubs on @noreply.janmanindia.local (those are created by real intake flows).
 * NOTE: kumar@janmanindia.org (seed-admin.mjs) is reported but NOT auto-deleted
 * — review it by hand if you want it gone.
 */

import mongoose from "mongoose";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL)) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const APPLY = process.argv.includes("--apply");
// Risky extras are opt-in — they may be real data, not fixtures.
const INCLUDE_IMPORTS  = process.argv.includes("--include-imports");  // JMI-IMP-* cases + @stub users
const INCLUDE_PROJECTS = process.argv.includes("--include-projects"); // JNA/DLF/COR projects + their expenses
const INCLUDE_SEED_ADMIN = process.argv.includes("--include-seed-admin"); // kumar@janmanindia.org (seed-admin.mjs)

const RX = (s) => new RegExp(s, "i");

function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log("");
  console.log(APPLY ? "=== APPLYING DELETIONS ===" : "=== DRY RUN (no changes will be made) ===");
  console.log("Target:", maskUri(MONGODB_URI), "· db:", db.databaseName);
  console.log("");

  console.log(`flags: ${INCLUDE_IMPORTS ? "include-imports " : ""}${INCLUDE_PROJECTS ? "include-projects" : ""}`.trim() || "flags: (dev/demo fixtures only)");
  console.log("");

  // ── Users ────────────────────────────────────────────────────────────────
  // The Google Play review login is intentionally on the dev domain but is a
  // REAL, needed account (Play Console → Sign in details). Never delete it.
  const PROTECTED_EMAILS = ["community@dev.janmanindia.in"];
  const userOr = [
    { email: RX("@dev\\.janmanindia\\.in$") },
    { employeeId: RX("^JPF/(DEV|DEMO)/") },
  ];
  // @stub.* users belong to the JMI-IMP import — only remove them with imports.
  if (INCLUDE_IMPORTS) userOr.push({ email: RX("@stub\\.janmanindia\\.org$") });
  // Seed-admin (kumar@janmanindia.org) only when explicitly requested.
  if (INCLUDE_SEED_ADMIN) userOr.push({ email: "kumar@janmanindia.org" });
  const userQuery = { $and: [{ $or: userOr }, { email: { $nin: PROTECTED_EMAILS } }] };
  const seededUsers = await db.collection("users").find(userQuery).project({ email: 1, role: 1, employeeId: 1 }).toArray();
  console.log(`users  (seed/demo/stub): ${seededUsers.length}`);
  for (const u of seededUsers) console.log(`   - ${u.email}  [${u.role}${u.employeeId ? " · " + u.employeeId : ""}]`);

  // Report the seed-admin account so a human can decide (unless asked to remove it).
  if (!INCLUDE_SEED_ADMIN) {
    const kumar = await db.collection("users").findOne({ email: "kumar@janmanindia.org" });
    if (kumar) console.log(`   (i) kumar@janmanindia.org exists (seed-admin) — NOT auto-deleted; pass --include-seed-admin to remove.`);
  }

  // ── Cases ────────────────────────────────────────────────────────────────
  const caseOr = [
    { caseNumber: RX("^DEV-") },
    { caseNumber: { $in: ["JMI-2026-09001", "JMI-2026-09002"] } },
  ];
  if (INCLUDE_IMPORTS) caseOr.push({ caseNumber: RX("^JMI-IMP-") });
  const caseQuery = { $or: caseOr };
  const seededCases = await db.collection("cases").find(caseQuery).project({ caseNumber: 1 }).toArray();
  const seededCaseIds = seededCases.map((c) => c._id);
  console.log(`cases  (DEV-/demo${INCLUDE_IMPORTS ? "/IMP-" : ""}): ${seededCases.length}`);
  for (const c of seededCases) console.log(`   - ${c.caseNumber}`);
  if (!INCLUDE_IMPORTS) {
    const impCount = await db.collection("cases").countDocuments({ caseNumber: RX("^JMI-IMP-") });
    if (impCount) console.log(`   (i) ${impCount} JMI-IMP-* cases skipped — pass --include-imports to remove them.`);
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  const projectQuery = { code: { $in: ["JNA", "DLF", "COR"] } };
  const seededProjects = INCLUDE_PROJECTS
    ? await db.collection("projects").find(projectQuery).project({ code: 1 }).toArray()
    : [];
  const seededProjectIds = seededProjects.map((p) => p._id);
  if (!INCLUDE_PROJECTS) {
    const pj = await db.collection("projects").countDocuments(projectQuery);
    if (pj) console.log(`   (i) ${pj} seed projects (JNA/DLF/COR) skipped — pass --include-projects to remove them.`);
  }

  // ── Conversations (+ their messages) ───────────────────────────────────────
  const convQuery = { lastMessagePreview: RX("dev seed") };
  const seededConvs = await db.collection("conversations").find(convQuery).project({ _id: 1 }).toArray();
  const seededConvIds = seededConvs.map((c) => c._id);

  // ── "dev seed" text-marker collections ─────────────────────────────────────
  const markerOps = [
    ["appointments",      { reason: RX("dev seed") }],
    ["eodreports",        { summary: RX("dev seed") }],
    ["headlawyers",       { notes: RX("dev seed") }],
    ["sosalerts",         { description: RX("dev seed") }],
    ["assets",            { notes: RX("dev seed") }],
    ["grievances",        { subject: RX("dev seed") }],
    ["trainingmaterials", { description: RX("dev seed") }],
    ["activities",        { description: RX("dev seed") }],
    ["logisticstickets",  { description: RX("dev seed") }],
    ["districthelplines", { notes: RX("dev seed") }],
    ["careplans",         { summary: RX("dev seed") }],
    ["trainingsessions",  { description: RX("dev seed") }],
  ];

  // ── Cascades tied to seeded cases / projects / conversations ───────────────
  const expenseOr = [{ description: RX("dev seed") }];
  if (seededCaseIds.length) expenseOr.push({ case: { $in: seededCaseIds } });
  if (seededProjectIds.length) expenseOr.push({ project: { $in: seededProjectIds } });

  const cascadeOps = [
    ...(seededCaseIds.length ? [
      ["icps",        { case: { $in: seededCaseIds } }],
      ["casereviews", { case: { $in: seededCaseIds } }],
      ["casereviewmeetings", { case: { $in: seededCaseIds } }],
    ] : []),
    ["expenses",    { $or: expenseOr }],
    ...(seededConvIds.length ? [["messages", { conversation: { $in: seededConvIds } }]] : []),
    ["conversations", convQuery],
    ...(INCLUDE_PROJECTS && seededProjectIds.length ? [["projects", projectQuery]] : []),
  ];

  // Count everything (and delete if --apply).
  const allOps = [
    ["users", userQuery],
    ["cases", caseQuery],
    ...markerOps,
    ...cascadeOps,
  ];

  console.log("\n--- per-collection ---");
  let grandTotal = 0;
  for (const [coll, query] of allOps) {
    const n = await db.collection(coll).countDocuments(query);
    grandTotal += n;
    if (n > 0) {
      if (APPLY) {
        const res = await db.collection(coll).deleteMany(query);
        console.log(`   ${coll}: deleted ${res.deletedCount}`);
      } else {
        console.log(`   ${coll}: ${n} would be deleted`);
      }
    }
  }

  console.log("");
  console.log(APPLY
    ? `Done. Removed seed/dummy data across collections (≈${grandTotal} documents matched).`
    : `Dry run complete — ${grandTotal} documents match the seed markers. Re-run with --apply to delete.`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
