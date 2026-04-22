"use client";

import { useState } from "react";
import CrisisPanel from "@/components/shared/CrisisPanel";
import CommunityContactPanel from "@/components/shared/CommunityContactPanel";
import { detectsDistress } from "@/lib/crisis";
import Field, { Input, Textarea } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";

export default function SosPage() {
  const [step, setStep] = useState<"idle" | "form" | "sent">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [distress, setDistress] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: fd.get("location"),
          description: fd.get("description"),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send SOS. Please try again.");
      } else {
        setStep("sent");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-2xl glass px-6 py-6">
        <Spotlight color="#dc2626" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#dc2626" }}>Emergency</p>
          <h1 className="text-2xl font-bold text-(--text)">Send an SOS</h1>
          <p className="text-sm text-(--muted) mt-1.5 leading-relaxed">
            Use this only when something is happening right now — danger, ongoing crime, abuse, or police misconduct. Your social worker is paged immediately.
          </p>
        </div>
      </header>

      {distress ? <CrisisPanel urgent nationalOnly /> : <CommunityContactPanel />}

      {step === "sent" ? (
        <div className="p-8 rounded-2xl glass text-center space-y-3"
          style={{ borderColor: "color-mix(in srgb, var(--success, #16a34a) 35%, transparent)" }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl"
            style={{ background: "color-mix(in srgb, var(--success, #16a34a) 18%, transparent)" }}>✓</div>
          <p className="font-bold text-lg" style={{ color: "var(--success-text, #15803d)" }}>SOS Alert Sent</p>
          <p className="text-sm text-(--muted)">Your social worker has been notified. Stay where you are if it's safe — help is on the way.</p>
          <button onClick={() => { setStep("idle"); setDistress(false); }}
            className="text-sm font-semibold underline" style={{ color: "var(--success-text, #15803d)" }}>
            Send another alert
          </button>
        </div>
      ) : step === "form" ? (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5"
          style={{ borderColor: "color-mix(in srgb, #dc2626 30%, transparent)" }}>
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "color-mix(in srgb, #dc2626 10%, transparent)", border: "1px solid color-mix(in srgb, #dc2626 25%, transparent)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
              style={{ background: "#dc2626" }}>!</div>
            <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
              This alert is sent immediately. Don't use it for non-urgent things.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {error}
            </div>
          )}

          <Field
            label="Where are you right now?"
            required
            hint="Be specific so help can find you. Include landmark or building name if possible."
            example="Khajanchi Hat market, Purnia — outside Sharma Provision Store">
            <Input name="location" required placeholder="District, town, and a landmark" />
          </Field>

          <Field
            label="What is happening?"
            required
            hint="Tell us what's wrong, who's involved, and what you need. Keep it short — every second matters."
            example="Two men are threatening my brother outside our shop. They have weapons. We need police help.">
            <Textarea name="description" required rows={4}
              onChange={(e) => setDistress(detectsDistress(e.currentTarget.value))}
              placeholder="What is happening? Who is there?" />
          </Field>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("idle")}
              className="flex-1 py-2.5 rounded-xl border border-(--border) text-(--text) text-sm font-semibold hover:bg-(--bg) transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60"
              style={{ background: "#dc2626", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)" }}>
              {loading ? "Sending…" : "Send SOS Now"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setStep("form")}
            className="relative w-full py-12 rounded-2xl text-white text-2xl font-black tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
            style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", boxShadow: "0 12px 32px rgba(220, 38, 38, 0.35)" }}>
            <span className="relative">🚨 TAP TO SEND SOS</span>
          </button>
          <p className="text-center text-xs text-(--muted)">
            Only use in a real emergency. False alerts may suspend your account.
          </p>

          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-(--text) mb-3 text-sm">What happens after you send SOS?</h2>
            <ol className="space-y-2.5 text-sm text-(--muted)">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>1</span>
                <span>Your social worker gets an instant notification on their phone.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>2</span>
                <span>They confirm and escalate to higher officials if needed.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>3</span>
                <span>The litigation team is informed and may open a case.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
