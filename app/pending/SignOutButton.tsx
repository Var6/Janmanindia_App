"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

export default function SignOutButton({ className }: { className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={signOut} disabled={busy}
        className="text-sm font-medium text-(--muted) hover:text-(--text) transition-colors disabled:opacity-60">
        {busy ? t("Signing out…") : t("Sign out")}
      </button>
    </div>
  );
}
