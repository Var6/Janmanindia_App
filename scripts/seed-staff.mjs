/**
 * Staff seed — Rishabh's HR account + co-founder director accounts.
 *
 * Idempotent: safe to re-run. Upserts by email.
 * Default password: Dev@1234  (change immediately after first login)
 *
 * Usage:
 *   node scripts/seed-staff.mjs
 *
 * In production (MONGODB_URI pointing at Atlas):
 *   ALLOW_DEV_SEED=yes node scripts/seed-staff.mjs
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL) && !process.env.MONGODB_URI) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "yes") {
  console.error("Set ALLOW_DEV_SEED=yes to run this seed against a production database.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const DEV_PASSWORD = "Dev@1234";

const STAFF = [
  // ── HR ────────────────────────────────────────────────────────────────────
  {
    name: "Rishabh Ranjan",
    email: "citizenjaivik@gmail.com",
    role: "hr",
    phone: "",
    employeeId: "JPF/HR/26/01",
    joinedAt: new Date("2026-01-01"),
  },

  // ── Co-Founders → Director ─────────────────────────────────────────────────
  {
    name: "Shashwat",
    email: "shashwat@janmanindia.org",
    role: "director",
    phone: "",
    employeeId: "JPF/DIR/26/01",
    joinedAt: new Date("2022-01-01"),
  },
  {
    name: "Priyam Agrawal",
    email: "priyam@janmanindia.org",
    role: "director",
    phone: "",
    employeeId: "JPF/DIR/26/02",
    joinedAt: new Date("2022-01-01"),
  },
  {
    name: "Shourya Roy",
    email: "shourya@janmanindia.org",
    role: "director",
    phone: "",
    employeeId: "JPF/DIR/26/03",
    joinedAt: new Date("2022-01-01"),
  },
  {
    name: "Rajeev Rai",
    email: "rajeev@janmanindia.org",
    role: "director",
    phone: "",
    employeeId: "JPF/DIR/26/04",
    joinedAt: new Date("2022-01-01"),
  },
];

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    role: String,
    phone: String,
    linkedinUrl: String,
    isActive: { type: Boolean, default: true },
    employeeId: { type: String, unique: true, sparse: true },
    joinedAt: Date,
  },
  { timestamps: true }
);
const User = mongoose.models.User ?? mongoose.model("User", userSchema);

console.log(`Connecting to ${MONGODB_URI.replace(/:[^:@]+@/, ":***@")} …`);
await mongoose.connect(MONGODB_URI, { bufferCommands: false });
console.log("Connected.\n");

const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

let created = 0, updated = 0;
for (const u of STAFF) {
  const existing = await User.findOne({ email: u.email });
  if (existing) {
    await User.updateOne({ email: u.email }, { $set: { ...u, passwordHash, isActive: true } });
    console.log(`  updated  [${u.role.padEnd(8)}]  ${u.name} <${u.email}>`);
    updated++;
  } else {
    await User.create({ ...u, passwordHash, isActive: true });
    console.log(`  created  [${u.role.padEnd(8)}]  ${u.name} <${u.email}>`);
    created++;
  }
}

console.log(`\nDone: ${created} created, ${updated} updated.`);
console.log(`Default password for all accounts: ${DEV_PASSWORD}`);
console.log("Change passwords immediately after first login.\n");

await mongoose.disconnect();
