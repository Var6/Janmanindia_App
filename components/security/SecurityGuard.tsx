"use client";

import { useEffect, useState } from "react";

/**
 * App-wide content-protection guard.
 *
 * What this RELIABLY does (web platform allows it):
 *   • Blocks copy / cut / paste everywhere — including inside <input>/<textarea>.
 *   • Blocks the right-click context menu and drag-out of text/images.
 *   • Blocks the keyboard clipboard shortcuts (Ctrl/⌘ + C / X / V / A) and the
 *     common "view source / save / print" shortcuts that leak content.
 *
 * What this can only DETER, not prevent (no web API can stop these):
 *   • OS screenshots — PrintScreen, macOS ⌘+Shift+3/4/5, Snipping Tool, phone
 *     screenshots, or a second camera pointed at the screen.
 *   We deter by (a) catching the PrintScreen key, wiping the clipboard and
 *   flashing a warning, and (b) blurring the page whenever it loses focus or is
 *   hidden, so a backgrounded/print capture grabs a blurred frame. A determined
 *   user can still bypass all of this. Real screenshot blocking requires a
 *   native app (Android FLAG_SECURE / iOS), which this web app is not.
 */
export default function SecurityGuard() {
  const [obscured, setObscured] = useState(false);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout> | undefined;

    const flashWarning = () => {
      setWarn(true);
      if (warnTimer) clearTimeout(warnTimer);
      warnTimer = setTimeout(() => setWarn(false), 1500);
    };

    // ── Clipboard: copy / cut / paste anywhere on the page ──────────────────
    const blockClipboard = (e: Event) => {
      e.preventDefault();
      // Best-effort: leave nothing useful on the clipboard.
      try {
        (e as ClipboardEvent).clipboardData?.setData("text/plain", "");
      } catch {
        /* some browsers disallow writing here — ignore */
      }
      flashWarning();
    };

    // ── Right-click menu + drag-out (image/text exfiltration) ───────────────
    const blockEvent = (e: Event) => e.preventDefault();

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // PrintScreen — can't truly block, so deter: wipe clipboard + warn.
      if (key === "printscreen") {
        try {
          navigator.clipboard?.writeText("").catch(() => {});
        } catch {
          /* ignore */
        }
        flashWarning();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      // Clipboard + select-all + save/print/view-source leaks.
      if (["c", "x", "v", "a", "s", "p", "u"].includes(key)) {
        e.preventDefault();
        flashWarning();
      }
    };

    // ── Screenshot deterrence: blur when the page is not in the foreground ──
    const onVisibility = () => setObscured(document.visibilityState === "hidden");
    const onBlur = () => setObscured(true);
    const onFocus = () => setObscured(false);

    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("paste", blockClipboard, true);
    document.addEventListener("contextmenu", blockEvent, true);
    document.addEventListener("dragstart", blockEvent, true);
    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      if (warnTimer) clearTimeout(warnTimer);
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("paste", blockClipboard, true);
      document.removeEventListener("contextmenu", blockEvent, true);
      document.removeEventListener("dragstart", blockEvent, true);
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <>
      {/* Blur overlay shown whenever the tab is hidden / loses focus. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          pointerEvents: "none",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          background: "rgba(20,12,8,0.55)",
          opacity: obscured ? 1 : 0,
          transition: "opacity 120ms ease",
          visibility: obscured ? "visible" : "hidden",
        }}
      />
      {/* Brief "blocked" toast for clipboard / screenshot attempts. */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "2rem",
          transform: "translateX(-50%)",
          zIndex: 2147483647,
          pointerEvents: "none",
          padding: "0.5rem 1rem",
          borderRadius: "0.75rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#fff",
          background: "rgba(20,12,8,0.92)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          opacity: warn ? 1 : 0,
          transition: "opacity 150ms ease",
          visibility: warn ? "visible" : "hidden",
        }}
      >
        Copying & screenshots are disabled on this page.
      </div>
    </>
  );
}
