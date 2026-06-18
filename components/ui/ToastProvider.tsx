"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Show a ribbon toast (top-right, auto-dismisses after 2 seconds). */
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const ACCENT: Record<ToastKind, string> = {
  success: "#16a34a",
  error: "#dc2626",
  info: "#6366f1",
};
const ICON: Record<ToastKind, string> = { success: "✓", error: "✕", info: "ℹ" };

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    // Auto-disappear after 2 seconds, as requested.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
          maxWidth: "min(360px, calc(100vw - 32px))",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-ribbon"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${ACCENT[t.kind]}`,
              boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: ACCENT[t.kind],
                color: "#fff",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ICON[t.kind]}
            </span>
            <span style={{ minWidth: 0 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        .toast-ribbon { animation: toast-in 0.18s ease-out; }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) translateX(8px); }
          to   { opacity: 1; transform: translateY(0) translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
