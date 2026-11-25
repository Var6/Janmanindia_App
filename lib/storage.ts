import { S3Client, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Where uploaded files live and how their links are written.
 *
 * Two modes, chosen by FILES_PRIVATE:
 *
 *  - off (the old behaviour): an upload is stored as its public R2 link
 *    (R2_PUBLIC_URL_BASE/<key>). Anyone holding the link can open the file.
 *  - on: an upload is stored as /api/files/<key>. That route checks the
 *    session, then serves the file or hands back a link that expires in five
 *    minutes. The bucket itself no longer needs public access.
 *
 * Moving an existing deployment across: see scripts/migrate-file-urls.mjs.
 */

const ACCOUNT = process.env.R2_ACCOUNT_ID;
const BUCKET = process.env.R2_BUCKET;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET = process.env.R2_SECRET_ACCESS_KEY;
const PUBLIC_BASE = process.env.R2_PUBLIC_URL_BASE?.replace(/\/+$/, "");

export const FILE_ROUTE = "/api/files";
/** Keys the app writes: uploads/<name> and media/<name>. */
export const KEY_PATTERN = /^(uploads|media)\/[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

export function filesPrivate(): boolean {
  return process.env.FILES_PRIVATE === "on";
}

/** R2 credentials are present (the public base is only needed in public mode). */
export function r2Ready(): boolean {
  return Boolean(ACCOUNT && BUCKET && ACCESS_KEY && SECRET && (filesPrivate() || PUBLIC_BASE));
}

export function r2Bucket(): string {
  return BUCKET ?? "";
}

let client: S3Client | null = null;
export function getR2(): S3Client | null {
  if (!(ACCOUNT && BUCKET && ACCESS_KEY && SECRET)) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      // R2_ENDPOINT points the app at another S3-compatible store (MinIO in
      // local development, say). Left unset, it is Cloudflare R2.
      endpoint: process.env.R2_ENDPOINT || `https://${ACCOUNT}.r2.cloudflarestorage.com`,
      forcePathStyle: !!process.env.R2_ENDPOINT,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET },
      // A browser cannot add the SDK's default checksum header to a presigned
      // PUT, and R2 rejects the upload without this.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

/** The link to store on a record for a file just written at `key`. */
export function storedUrlForKey(key: string): string {
  return filesPrivate() ? `${FILE_ROUTE}/${key}` : `${PUBLIC_BASE}/${key}`;
}

/** The bucket key behind a stored link, in either form; null if the link is
 *  not one of ours. */
export function keyFromStoredUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  let key: string | null = null;
  if (url.startsWith(`${FILE_ROUTE}/`)) key = url.slice(FILE_ROUTE.length + 1);
  else if (PUBLIC_BASE && url.startsWith(`${PUBLIC_BASE}/`)) key = url.slice(PUBLIC_BASE.length + 1);
  else {
    const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
    if (app && url.startsWith(`${app}${FILE_ROUTE}/`)) key = url.slice(app.length + FILE_ROUTE.length + 1);
  }
  if (!key) return null;
  key = key.split(/[?#]/)[0];
  return KEY_PATTERN.test(key) ? key : null;
}

/** Is this link one the app itself produced (R2 or the local dev folder)? */
export function isOwnFileUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return keyFromStoredUrl(url) !== null || /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(url);
}

export async function headObject(key: string) {
  const r2 = getR2();
  if (!r2) return null;
  return r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getObject(key: string) {
  const r2 = getR2();
  if (!r2) return null;
  return r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** A link to the object that stops working after `seconds`. */
export async function signedGetUrl(key: string, seconds = 300, disposition?: "inline" | "attachment"): Promise<string | null> {
  const r2 = getR2();
  if (!r2) return null;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key, ResponseContentDisposition: disposition }), { expiresIn: seconds });
}

/**
 * A link a service outside the app (the OCR worker, say) can fetch. Private
 * links become a signed link valid for `seconds`; public ones pass through.
 */
export async function externalUrl(storedUrl: string, seconds = 3600): Promise<string> {
  if (!storedUrl.startsWith(`${FILE_ROUTE}/`)) return storedUrl;
  const key = keyFromStoredUrl(storedUrl);
  const signed = key ? await signedGetUrl(key, seconds) : null;
  return signed ?? storedUrl;
}

export async function deleteStoredFile(storedUrl: string): Promise<boolean> {
  const key = keyFromStoredUrl(storedUrl);
  const r2 = getR2();
  if (!key || !r2) return false;
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  return true;
}
