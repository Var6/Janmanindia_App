/**
 * Creates (or resets) the Google Play review login — a verified community
 * member so the Play Store review team can sign in to the mobile app.
 *
 *   node scripts/create-play-review-user.mjs
 *
 * Idempotent upsert of a single user; touches nothing else.
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

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI missing from .env.local");
  process.exit(1);
}

const EMAIL = "googlereview@janmanindia.org";
const PASSWORD = "JanmanReview@2026";

const User =
  mongoose.models.User ??
  mongoose.model("User", new mongoose.Schema({}, { strict: false, timestamps: true }));

async function run() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^@]*@/, "//***@")} …`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 15000 });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await User.updateOne(
    { email: EMAIL },
    {
      $set: {
        name: "Google Play Review",
        email: EMAIL,
        role: "community",
        passwordHash,
        isActive: true,
        phone: "9100000099",
        "communityProfile.verificationStatus": "verified",
        "communityProfile.verifiedAt": new Date(),
        "communityProfile.district": "Patna",
        "communityProfile.govtIdType": "Other",
        "communityProfile.preferredLanguage": "en",
      },
    },
    { upsert: true }
  );

  console.log("Play review login ready:");
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
