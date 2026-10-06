"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ui/ToastProvider";

/** success() / error() shortcuts over the app's toast ribbon. */
export function useNotify() {
  const { toast } = useToast();
  return useMemo(() => ({
    success: (m: string) => toast(m, "success"),
    error: (m: string) => toast(m, "error"),
    info: (m: string) => toast(m, "info"),
  }), [toast]);
}
