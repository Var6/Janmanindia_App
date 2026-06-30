/**
 * Tiny notification chime synthesised with the Web Audio API — no asset file to
 * ship or cache. Used when a new chat message (or notification) arrives so staff
 * don't miss it. Best-effort: browsers block audio until the user has interacted
 * with the page, and any failure is swallowed silently.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** A short two-note "ding" (~0.4s). */
export function playChime(): void {
  try {
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);          // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.42);
  } catch {
    /* autoplay blocked or Web Audio unavailable — ignore */
  }
}
