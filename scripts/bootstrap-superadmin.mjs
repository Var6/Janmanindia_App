/**
 * Production bootstrap — creates the very first superadmin so the live app
 * has someone who can log in. Idempotent: re-running with the same email
 * prints a message and does nothing.
 *
 * Required env vars:
 *   MONGODB_URI            — same connection string the app uses
 *   SUPERADMIN_EMAIL       — login email for the new superadmin
 *   SUPERADMIN_NAME        — display name
 *   SUPERADMIN_PASSWORD    — initial password (≥ 12 chars). Change it
 *                            immediately after first login from /superadmin/profile.
 *
 * Usage:
 *   MONGODB_URI=... \
 *   SUPERADMIN_EMAIL=rishabh@janmanindia.org \
 *   SUPERADMIN_NAME="Rishabh Ranjan" \
 *   SUPERADMIN_PASSWORD='your-strong-password-here' \
 *   node scripts/bootstrap-superadmin.mjs
 *
 * On Vercel: run `vercel env pull .env.production.local`, then
 *   `node --env-file=.env.production.local scripts/bootstrap-superadmin.mjs`
 * with SUPERADMIN_* exported in your shell.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Best-effort: load .env.local for local invocations. Vercel injects env
// directly so this branch is a no-op there.
const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL)) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const required = ["MONGODB_URI", "SUPERADMIN_EMAIL", "SUPERADMIN_NAME", "SUPERADMIN_PASSWORD"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const email = process.env.SUPERADMIN_EMAIL.trim().toLowerCase();
const name = process.env.SUPERADMIN_NAME.trim();
const password = process.env.SUPERADMIN_PASSWORD;
if (password.length < 12) {
  console.error("SUPERADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    role: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    employeeId: { type: String, unique: true, sparse: true },
    joinedAt: Date,
  },
  { timestamps: true }
);
const User = mongoose.models.User ?? mongoose.model("User", userSchema);

console.log(`Connecting to ${process.env.MONGODB_URI.replace(/:[^:@]+@/, ":***@")} …`);
await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
console.log("Connected.");

const existing = await User.findOne({ email });
if (existing) {
  if (existing.role === "superadmin") {
    console.log(`✓ Superadmin already exists: ${email}. Nothing to do.`);
  } else {
    console.error(`✗ User ${email} exists with role "${existing.role}", not "superadmin". Refusing to overwrite.`);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
  process.exit();
}

const passwordHash = await bcrypt.hash(password, 12);
await User.create({
  name,
  email,
  passwordHash,
  role: "superadmin",
  isActive: true,
  joinedAt: new Date(),
});
console.log(`✓ Created superadmin: ${name} <${email}>.`);
console.log(`  Login at /login and immediately change the password from /superadmin/profile.`);

await mongoose.disconnect();
