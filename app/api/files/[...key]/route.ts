import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { KEY_PATTERN, getObject, getR2, headObject, signedGetUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ key: string[] }> };

/** Files this size or smaller are sent through the app; larger ones are
 *  handed a short-lived link straight to storage. */
const PROXY_MAX_BYTES = 4 * 1024 * 1024;
const INLINE = /^(image\/(jpeg|png|webp|gif)|application\/pdf|audio\/|video\/)/;

/**
 * GET /api/files/uploads/<name> — an uploaded file, for signed-in users only.
 *
 * Small files (photos, receipts, voice notes) are streamed back from here so
 * they work in <img>, in PDFs built in the browser and anywhere else that
 * needs the same origin. Large files, and any request for a byte range
 * (audio and video seeking), get a link to storage that expires in five
 * minutes. Without R2 (local development) the file is in public/uploads.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "pending") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = (await ctx.params).key.join("/");
  if (!KEY_PATTERN.test(key)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!getR2()) {
    return NextResponse.redirect(new URL(`/uploads/${key.split("/").pop()}`, req.url), 302);
  }

  try {
    const head = await headObject(key);
    if (!head) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const type = head.ContentType ?? "application/octet-stream";
    const disposition = INLINE.test(type) ? "inline" : "attachment";
    const size = head.ContentLength ?? Number.POSITIVE_INFINITY;

    if (size <= PROXY_MAX_BYTES && !req.headers.get("range")) {
      const obj = await getObject(key);
      if (obj?.Body) {
        return new Response(obj.Body.transformToWebStream(), {
          headers: {
            "Content-Type": type,
            "Content-Length": String(size),
            "Content-Disposition": disposition,
            "Cache-Control": "private, max-age=600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    const url = await signedGetUrl(key, 300, disposition);
    if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (e as Error).name === "NotFound") return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("GET /api/files", e);
    return NextResponse.json({ error: "Could not open the file" }, { status: 500 });
  }
}
