import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSessionFromCookies } from "@/lib/auth";
import { filesPrivate, getR2, r2Bucket, r2Ready, storedUrlForKey } from "@/lib/storage";

// Images for avatars / case photos, PDFs + Office docs for case files / IDs / CVs,
// audio for voice messages and voice case descriptions (community members who
// cannot read or write).
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a",
];
// Generous backstop. Large case documents now go straight to storage via the
// presigned-URL route (/api/upload/presign), which has no practical size cap;
// this server-buffered path is the dev/no-R2 fallback and smaller uploads
// (avatars, voice notes, receipts).
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// R2 (Cloudflare) is used in production. S3-compatible, zero egress. The
// client and the link format (public or private) come from lib/storage.
const r2 = r2Ready() ? getR2() : null;
const R2_BUCKET = r2Bucket();

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    // Strip codec params (e.g. "audio/webm;codecs=opus" → "audio/webm") before checking
    const baseType = file.type.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.includes(baseType)) {
      return NextResponse.json({ error: "Only images, PDFs, Word/Excel, or audio files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large to upload" }, { status: 400 });
    }

    // Filename: <unguessable>-<original-ext>. Sanitise the extension only;
    // we never expose the original filename to the public URL.
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    // Production: Cloudflare R2 via S3 SDK.
    if (r2 && R2_BUCKET) {
      const key = `uploads/${filename}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: baseType,
        ContentLength: bytes.length,
        // Cache for a year — uploaded objects are content-addressed by their
        // unguessable filename, so they're effectively immutable.
        CacheControl: filesPrivate() ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      }));
      return NextResponse.json({ url: storedUrlForKey(key) });
    }

    // Local dev fallback: write to /public/uploads/ so Next's static handler
    // serves it. Will not survive serverless deploys — dev-only path.
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
