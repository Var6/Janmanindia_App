/**
 * Create the Google Play review login — a VERIFIED community member with one
 * case attached, so the reviewer can sign in and see a working case tracker.
 *
 *   node scripts/create-review-account.mjs
 *
 * Credentials (must match what's entered in Play Console → Sign in details):
 *   community@dev.janmanindia.in / Dev@1234
 *
 * Idempotent: re-running updates the account/password and keeps exactly one
 * review case. NOTE: scripts/cleanup-seed.mjs explicitly exempts this account.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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
const EMAIL = "community@dev.janmanindia.in";
const PASSWORD = "Dev@1234";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("Connected to", db.databaseName);

  const passwordHash = bcrypt.hashSync(PASSWORD, 12);
  const now = new Date();

  // ── User — verified community member the Play reviewer signs in as ──────
  const userUpdate = {
    $set: {
      name: "Google Review — Community Member",
      passwordHash,
      role: "community",
      phone: "+91 99999 00001",
      isActive: true,
      "communityProfile.verificationStatus": "verified",
      "communityProfile.verifiedAt": now,
      "communityProfile.district": "Patna",
      "communityProfile.village": "Review Ward",
      "communityProfile.preferredLanguage": "English",
      updatedAt: now,
    },
    $setOnInsert: { email: EMAIL, createdAt: now },
  };
  const userRes = await db.collection("users").findOneAndUpdate(
    { email: EMAIL },
    userUpdate,
    { upsert: true, returnDocument: "after" }
  );
  const user = userRes ?? (await db.collection("users").findOne({ email: EMAIL }));
  console.log(`User ${EMAIL}: _id=${user._id} (verified, active)`);

  // ── One case attached to this member ─────────────────────────────────────
  const existingCase = await db.collection("cases").findOne({ community: user._id });
  if (existingCase) {
    console.log(`Case already attached: ${existingCase.caseNumber} — leaving as is.`);
  } else {
    // Next free JMI number for this year (mirrors POST /api/cases).
    const year = new Date().getFullYear();
    const prefix = `JMI-${year}-`;
    const latest = await db.collection("cases")
      .find({ caseNumber: { $regex: `^${prefix}` } })
      .sort({ caseNumber: -1 }).limit(1).toArray();
    let seq = 1;
    if (latest[0]?.caseNumber) {
      const parsed = parseInt(latest[0].caseNumber.slice(prefix.length), 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    const caseNumber = `${prefix}${String(seq).padStart(5, "0")}`;

    const hearing = new Date();
    hearing.setDate(hearing.getDate() + 21);

    const doc = {
      caseTitle: "Wage dues recovery — daily-wage worker vs contractor",
      caseNumber,
      status: "Open",
      path: "criminal",
      flow: "criminal",
      caseType: "CR.COMP",
      courtType: "district",
      state: "Bihar",
      district: "Patna",
      courtName: "CJM Court, Patna",
      community: user._id,
      createdBy: user._id,
      isExistingCase: true,
      currentStep: "Complaint filed; awaiting first hearing",
      nextHearingDate: hearing,
      pointOfContact: { name: "Google Review — Community Member", phone: "+91 99999 00001" },
      enquiry: {
        filerName: "Google Review — Community Member",
        filerPhone: "+91 99999 00001",
        relationshipWithVictim: "self",
        victimName: "Google Review — Community Member",
        victimAddress: "Review Ward, Patna, Bihar",
        issues: ["Compensation Cases"],
        factsOfTheCase:
          "Three months of daily wages (Rs 21,600) withheld by a construction contractor after site work ended. Verbal demands refused; complaint filed with labour office and criminal complaint lodged.",
        policeStation: "Kotwali PS, Patna",
        placeOfOccurrence: "Construction site, Bailey Road, Patna",
        incidentDateTime: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
      criminalPath: {
        firFiled: false,
        chargesheetFiled: false,
        chargesheetAlertSent: false,
        chargesFramed: false,
        chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
      stageMarks: {},
      documents: [],
      caseDiary: [{
        date: now,
        findings: "Case registered on the Janman platform. Complaint copy collected; first hearing expected in ~3 weeks.",
        writtenBy: user._id,
      }],
      courtAppearances: [],
      escalations: [],
      auditLog: [{
        action: "metadata_updated",
        summary: "Case registered",
        by: user._id,
        byRole: "community",
        at: now,
      }],
      caseComments: [],
      litigationMembers: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("cases").insertOne(doc);
    console.log(`Case created: ${caseNumber} → attached to ${EMAIL}`);
  }

  console.log("\nDone. Review login: " + EMAIL + " / " + PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
