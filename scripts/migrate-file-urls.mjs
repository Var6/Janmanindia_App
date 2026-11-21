/**
 * One-off: rewrite stored file links from the public R2 address to the
 * app's private route, so the bucket's public access can be switched off.
 *
 *   https://<public-r2-host>/uploads/abc.pdf   →   /api/files/uploads/abc.pdf
 *
 * It walks every collection and every string in every document, so it does
 * not need to know which fields hold links. Only strings that START with the
 * public base and continue with uploads/ or media/ are changed.
 *
 * Order of work on a live deployment:
 *   1. Deploy the app with this change (the /api/files route exists; links
 *      are still public).
 *   2. Dry run (the default; nothing is written):
 *        node --env-file=.env.production.local scripts/migrate-file-urls.mjs
 *   3. Take a database backup, then apply:
 *        node --env-file=.env.production.local scripts/migrate-file-urls.mjs --apply
 *   4. Set FILES_PRIVATE=on in the app's environment and redeploy, so new
 *      uploads are stored as private links too.
 *   5. Check a few photos, ID documents and case files open in the app, then
 *      switch off public access on the R2 bucket (r2.dev and any public
 *      custom domain) in Cloudflare.
 *
 * To undo before step 5: run with --revert --apply.
 *
 * Required env: MONGODB_URI, R2_PUBLIC_URL_BASE.
 */

import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const ROUTE = "/api/files";

const uri = process.env.MONGODB_URI;
const base = process.env.R2_PUBLIC_URL_BASE?.replace(/\/+$/, "");
if (!uri || !base) {
  console.error("MONGODB_URI and R2_PUBLIC_URL_BASE must be set.");
  process.exit(1);
}

const FROM = REVERT ? `${ROUTE}/` : `${base}/`;
const TO = REVERT ? `${base}/` : `${ROUTE}/`;
const TAIL = /^(uploads|media)\/[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

function swap(s) {
  if (!s.startsWith(FROM)) return s;
  const tail = s.slice(FROM.length);
  return TAIL.test(tail) ? TO + tail : s;
}

/** Returns [newValue, numberOfLinksChanged]. Leaves ObjectIds, dates,
 *  buffers and other non-plain values untouched. */
function walk(v) {
  if (typeof v === "string") {
    const n = swap(v);
    return [n, n === v ? 0 : 1];
  }
  if (Array.isArray(v)) {
    let count = 0;
    const out = v.map((x) => { const [n, c] = walk(x); count += c; return n; });
    return [count ? out : v, count];
  }
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    let count = 0;
    const out = {};
    for (const [k, x] of Object.entries(v)) { const [n, c] = walk(x); count += c; out[k] = n; }
    return [count ? out : v, count];
  }
  return [v, 0];
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const collections = (await db.listCollections().toArray()).filter((c) => c.type !== "view" && !c.name.startsWith("system."));

console.log(`${APPLY ? "APPLYING" : "DRY RUN"}: ${FROM}…  →  ${TO}…`);
let totalDocs = 0, totalLinks = 0;
for (const { name } of collections) {
  const col = db.collection(name);
  let docs = 0, links = 0, sample = null;
  const ops = [];
  for await (const doc of col.find({})) {
    const set = {};
    let changed = 0;
    for (const [k, v] of Object.entries(doc)) {
      if (k === "_id") continue;
      const [n, c] = walk(v);
      if (c) { set[k] = n; changed += c; }
    }
    if (!changed) continue;
    docs++; links += changed;
    if (!sample) sample = `${String(doc._id)} (${Object.keys(set).join(", ")})`;
    if (APPLY) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
      if (ops.length >= 500) await col.bulkWrite(ops.splice(0), { ordered: false });
    }
  }
  if (APPLY && ops.length) await col.bulkWrite(ops, { ordered: false });
  if (docs) console.log(`  ${name}: ${links} link(s) in ${docs} document(s); e.g. ${sample}`);
  totalDocs += docs; totalLinks += links;
}
console.log(`${APPLY ? "Changed" : "Would change"} ${totalLinks} link(s) in ${totalDocs} document(s) across ${collections.length} collection(s).`);
if (!APPLY && totalLinks) console.log("Nothing was written. Run again with --apply after taking a backup.");
await mongoose.disconnect();
