import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSessionFromCookies } from "@/lib/auth";

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
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// ── R2 (Cloudflare) — used in production. S3-compatible, zero egress. ────────
const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID;
const R2_BUCKET        = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE   = process.env.R2_PUBLIC_URL_BASE?.replace(/\/+$/, ""); // strip trailing /

const r2Configured = Boolean(R2_ACCOUNT_ID && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET && R2_PUBLIC_BASE);

const r2 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET! },
    })
  : null;

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
      return NextResponse.json({ error: "File must be under 25 MB" }, { status: 400 });
    }

    // Filename: <unguessable>-<original-ext>. Sanitise the extension only;
    // we never expose the original filename to the public URL.
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    // Production: Cloudflare R2 via S3 SDK.
    if (r2 && R2_BUCKET && R2_PUBLIC_BASE) {
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
        CacheControl: "public, max-age=31536000, immutable",
      }));
      return NextResponse.json({ url: `${R2_PUBLIC_BASE}/${key}` });
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
