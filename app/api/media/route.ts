import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getSessionFromCookies } from "@/lib/auth";
import { filesPrivate, getR2, r2Bucket, r2Ready, storedUrlForKey } from "@/lib/storage";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg", "video/3gpp",
];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

const r2 = r2Ready() ? getR2() : null;
const R2_BUCKET = r2Bucket();

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "socialworker") {
    return NextResponse.json({ error: "Only social workers can submit media scans" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file     = formData.get("file") as File | null;
    const label    = (formData.get("label")    as string | null)?.trim();
    const district = (formData.get("district") as string | null)?.trim();
    const source   = (formData.get("source")   as string | null)?.trim();

    if (!file)     return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!label)    return NextResponse.json({ error: "label is required" }, { status: 400 });
    if (!district) return NextResponse.json({ error: "district is required" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only images, PDFs, and videos are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 100 MB" }, { status: 400 });
    }

    const ext      = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
    const filename = `media/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    let url: string;

    if (r2 && R2_BUCKET) {
      const bytes = Buffer.from(await file.arrayBuffer());
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
        Body: bytes,
        ContentType: file.type,
        ContentLength: bytes.length,
        CacheControl: filesPrivate() ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      }));
      url = storedUrlForKey(filename);
    } else {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      const localName = filename.replace("media/", "");
      await writeFile(path.join(uploadsDir, localName), Buffer.from(bytes));
      url = `/uploads/${localName}`;
    }

    return NextResponse.json({
      item: { url, label, district, source: source || undefined, addedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
