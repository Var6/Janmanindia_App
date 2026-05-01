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

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
await mongoose.connect(MONGODB_URI);

const User = mongoose.model("User", new mongoose.Schema({
  name: String, email: String, passwordHash: String,
  role: String, phone: String, isActive: Boolean,
  employeeId: String, joinedAt: Date,
}, { strict: false }));

const hash = await bcrypt.hash("Dev@1234", 12);
const result = await User.findOneAndUpdate(
  { email: "kumar@janmanindia.org" },
  { $set: {
    name: "Prakash Kumar", email: "kumar@janmanindia.org",
    passwordHash: hash, role: "administrator",
    phone: "", isActive: true,
    employeeId: "JPF/ADM/26/01", joinedAt: new Date("2026-01-01"),
  }},
  { upsert: true, new: true }
);

console.log(`${result.isNew ?? "Updated"} administrator: kumar@janmanindia.org / Dev@1234`);
await mongoose.disconnect();
