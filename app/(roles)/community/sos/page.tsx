"use client";

import { useState } from "react";
import CrisisPanel from "@/components/shared/CrisisPanel";
import CommunityContactPanel from "@/components/shared/CommunityContactPanel";
import { detectsDistress } from "@/lib/crisis";

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
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Emergency SOS</h1>
        <p className="text-sm text-(--muted) mt-1">
          Use this only for ongoing crimes or active injustice. Your alert will immediately notify the assigned social worker.
        </p>
      </div>

      {distress ? <CrisisPanel urgent nationalOnly /> : <CommunityContactPanel />}

      {step === "sent" ? (
        <div className="p-8 rounded-2xl bg-green-50 border border-green-200 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <p className="text-green-700 font-semibold text-lg">SOS Alert Sent</p>
          <p className="text-sm text-green-600">
            Your social worker has been notified and will respond shortly. Stay safe.
          </p>
          <button
            onClick={() => { setStep("idle"); setDistress(false); }}
            className="mt-2 text-sm text-green-700 underline"
          >
            Send another alert
          </button>
        </div>
      ) : step === "form" ? (
        <form onSubmit={handleSubmit} className="bg-(--surface) rounded-2xl border border-red-200 p-6 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 font-medium">
              This alert will be sent immediately to your social worker.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              Your Location <span className="text-red-500">*</span>
            </label>
            <input
              name="location"
              required
              placeholder="District, City or specific address"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-(--muted)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              What is happening? <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={4}
              onChange={(e) => setDistress(detectsDistress(e.currentTarget.value))}
              placeholder="Describe the emergency: who, what, where, when…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none placeholder:text-(--muted)"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="flex-1 py-2.5 rounded-xl border border-(--border) text-(--text) text-sm font-semibold hover:bg-(--bg) transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send SOS Now"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setStep("form")}
            className="w-full py-10 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white text-xl font-black tracking-wide shadow-lg shadow-red-200"
          >
            TAP TO SEND SOS
          </button>
          <p className="text-center text-xs text-(--muted)">
            Only use in a genuine emergency. False alerts may result in account suspension.
          </p>

          <div className="mt-6 p-5 rounded-2xl bg-(--surface) border border-(--border)">
            <h2 className="font-semibold text-(--text) mb-3 text-sm">What happens after you send SOS?</h2>
            <ol className="space-y-2 text-sm text-(--muted)">
              <li className="flex gap-2"><span className="font-bold text-(--accent) shrink-0">1.</span> Your social worker receives an instant notification.</li>
              <li className="flex gap-2"><span className="font-bold text-(--accent) shrink-0">2.</span> If they confirm, the alert is escalated to higher officials.</li>
              <li className="flex gap-2"><span className="font-bold text-(--accent) shrink-0">3.</span> The litigation team is informed and a case may be opened.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
