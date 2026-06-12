import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionFromCookies } from "@/lib/auth";

/**
 * Presigned-upload endpoint.
 *
 * Large files (court orders, scanned case bundles, videos) can't go through
 * the Next.js server — serverless platforms cap the request body at a few MB
 * and buffering the whole file in memory is wasteful. Instead the browser
 * asks here for a short-lived signed URL and PUTs the file *directly* to R2.
 * That removes the size ceiling and lets the client track upload progress.
 *
 * When R2 isn't configured (local dev) we return `{ mode: "server" }` so the
 * client falls back to the in-server `/api/upload` route.
 */

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a",
  "video/mp4", "video/webm", "video/quicktime",
];
// Generous backstop only — R2 itself caps a single PUT at 5 GB. This exists to
// reject obviously-bad sizes, not to limit ordinary documents.
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID;
const R2_BUCKET        = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE   = process.env.R2_PUBLIC_URL_BASE?.replace(/\/+$/, "");

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

  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const contentType = (body.contentType ?? "").split(";")[0].trim().toLowerCase();
  const size = Number(body.size ?? 0);

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Only images, PDFs, Word/Excel, audio or video files are allowed" },
      { status: 400 }
    );
  }
  if (size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large to upload" }, { status: 400 });
  }

  // No R2 in this environment → tell the client to use the server route.
  if (!r2 || !R2_BUCKET || !R2_PUBLIC_BASE) {
    return NextResponse.json({ mode: "server" });
  }

  // Unguessable key; never exposes the original filename.
  const ext = (body.filename?.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const key = `uploads/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

  // Sign only Bucket/Key/ContentType — the browser must send the same
  // Content-Type header on its PUT, and nothing else needs signing.
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 600 } // 10 minutes — long enough for a slow connection on a big file
  );

  return NextResponse.json({
    mode: "r2",
    uploadUrl,
    publicUrl: `${R2_PUBLIC_BASE}/${key}`,
    contentType,
  });
}
