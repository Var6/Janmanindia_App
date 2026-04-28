"use client";

import { useRef, useState, useCallback } from "react";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

interface Props {
  currentUrl?: string;
  name: string;
  size?: number;       // px — default 96
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

export default function AvatarUpload({ currentUrl, name, size = 96, onUploaded, onRemoved }: Props) {
  const [preview, setPreview]   = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]           = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX     = 5 * 1024 * 1024;

    if (!ALLOWED.includes(file.type)) { setErr("Only JPG, PNG or WebP images allowed."); return; }
    if (file.size > MAX)              { setErr("Image must be under 5 MB."); return; }

    setErr("");
    // Instant local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Upload failed."); setPreview(currentUrl); return; }
      setPreview(data.url);
      onUploaded(data.url);
    } catch {
      setErr("Network error.");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }, [currentUrl, onUploaded]);

  const handleFile = (file: File | null | undefined) => { if (file) upload(file); };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [upload]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleRemove = () => {
    setPreview(undefined);
    onRemoved?.();
  };

  return (
    <div className="flex items-start gap-5">
      {/* Avatar circle — click or drag target */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          width: size, height: size, flexShrink: 0,
          borderRadius: "50%", overflow: "hidden",
          border: `2px ${dragging ? "dashed" : "solid"} ${dragging ? "var(--accent)" : "var(--border)"}`,
          background: "var(--bg-secondary)",
          cursor: uploading ? "default" : "pointer",
          position: "relative",
          transition: "border-color 0.15s",
          boxShadow: dragging ? "0 0 0 4px color-mix(in srgb,var(--accent) 20%,transparent)" : undefined,
        }}
      >
        {preview ? (
          <img src={preview} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.3, fontWeight: 700, color: "var(--accent)",
          }}>
            {initials(name) || "?"}
          </div>
        )}

        {/* Upload overlay on hover / drag */}
        {!uploading && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(0,0,0,0.45)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 4, opacity: 0, transition: "opacity 0.15s",
          }}
          className="avatar-hover-overlay"
          >
            <svg viewBox="0 0 20 20" fill="white" style={{ width: 22, height: 22 }}>
              <path d="M7 3a2 2 0 00-1.732 1H4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.268A2 2 0 0013 3H7zm3 3a4 4 0 110 8 4 4 0 010-8zm0 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
            </svg>
            <span style={{ color: "white", fontSize: 10, fontWeight: 600 }}>Upload</span>
          </div>
        )}

        {/* Spinner overlay while uploading */}
        {uploading && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg style={{ width: 24, height: 24, color: "white" }} className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 justify-center" style={{ paddingTop: 8 }}>
        <input type="file" ref={fileRef} className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />

        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60"
          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)", cursor: "pointer" }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ width: 15, height: 15 }}>
            <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5"/>
            <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1"/>
          </svg>
          {uploading ? "Uploading…" : preview ? "Change photo" : "Upload photo"}
        </button>

        {preview && onRemoved && (
          <button type="button" onClick={handleRemove} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60"
            style={{ borderColor: "var(--border)", color: "var(--error-text, #dc2626)", background: "var(--bg)", cursor: "pointer" }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ width: 15, height: 15 }}>
              <path d="M6 6l8 8M14 6l-8 8"/>
            </svg>
            Remove photo
          </button>
        )}

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          JPG, PNG or WebP · max 5 MB<br/>
          Click or drag &amp; drop onto the circle
        </p>

        {err && (
          <p className="text-xs font-medium" style={{ color: "var(--error-text, #dc2626)" }}>{err}</p>
        )}
      </div>

      {/* Hover effect via global style */}
      <style>{`
        [style*="border-radius: 50%"]:hover .avatar-hover-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
