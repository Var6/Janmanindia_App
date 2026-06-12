// Browser-side file upload with progress reporting.
//
// fetch() can't report upload progress, so we use XMLHttpRequest. Two paths:
//   • R2 configured → ask /api/upload/presign for a signed URL, then PUT the
//     file straight to storage (no size ceiling, true progress).
//   • Otherwise (local dev) → POST FormData to /api/upload, still via XHR so
//     the progress bar works there too.

export interface UploadProgress {
  /** 0–100, or null while indeterminate (before the first progress event). */
  percent: number | null;
  loadedBytes: number;
  totalBytes: number;
}

class UploadError extends Error {}

function xhrSend(
  method: "PUT" | "POST",
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string>,
  onProgress?: (p: UploadProgress) => void,
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      onProgress({
        percent: e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : null,
        loadedBytes: e.loaded,
        totalBytes: e.lengthComputable ? e.total : 0,
      });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
      else reject(new UploadError(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new UploadError("Network error during upload. If this is a large file, check your connection and try again."));
    xhr.ontimeout = () => reject(new UploadError("Upload timed out."));
    xhr.send(body);
  });
}

/**
 * Upload a file and return its stored URL, reporting progress as it goes.
 * Throws an Error (with a user-readable message) on failure.
 */
export async function uploadFileWithProgress(
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  // 1. Ask the server how to upload this file.
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });
  const presign = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new UploadError(presign.error ?? "Could not start the upload.");
  }

  // 2a. Direct-to-R2 presigned PUT.
  if (presign.mode === "r2" && presign.uploadUrl && presign.publicUrl) {
    await xhrSend(
      "PUT",
      presign.uploadUrl,
      file,
      { "Content-Type": presign.contentType || file.type || "application/octet-stream" },
      onProgress,
    );
    return presign.publicUrl as string;
  }

  // 2b. Fallback: stream through the Next.js server (dev / no R2).
  const fd = new FormData();
  fd.append("file", file);
  const xhr = await xhrSend("POST", "/api/upload", fd, {}, onProgress);
  let data: { url?: string; error?: string } = {};
  try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
  if (!data.url) throw new UploadError(data.error ?? "Upload failed.");
  return data.url;
}
