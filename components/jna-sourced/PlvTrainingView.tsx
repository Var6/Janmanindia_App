"use client";

import { useState } from "react";
import { QUICK_PLV_MODULES } from "@/lib/jna-sourced/plv-training";
import { useT } from "@/components/i18n/LanguageProvider";

export default function PlvTrainingView() {
  const t = useT();
  const [activeId, setActiveId] = useState(QUICK_PLV_MODULES[0]?.id ?? "");
  const [showHi, setShowHi] = useState(false);
  const [quizPick, setQuizPick] = useState<Record<string, number>>({});

  const active = QUICK_PLV_MODULES.find((m) => m.id === activeId) ?? QUICK_PLV_MODULES[0];
  if (!active) {
    return <p className="text-sm text-(--muted)">{t("No PLV modules available.")}</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-(--muted) font-bold mb-2 px-2">
          {t("Quick PLV modules")} · {QUICK_PLV_MODULES.length}
        </div>
        {QUICK_PLV_MODULES.map((m) => {
          const isActive = m.id === active.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                isActive
                  ? "bg-(--accent)/10 border-(--accent) text-(--text)"
                  : "border-(--border) text-(--muted) hover:border-(--accent) hover:text-(--text)"
              }`}
            >
              <span className="mr-2">{m.icon}</span>
              <span className="font-semibold">{m.title}</span>
              <div className="text-[12px] text-(--muted) mt-0.5">{m.hi}</div>
            </button>
          );
        })}
      </aside>

      <article className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-3xl mb-2">{active.icon}</div>
            <h2 className="text-xl font-bold text-(--text)">{active.title}</h2>
            <p className="text-sm text-(--muted) mt-1">{active.hi}</p>
          </div>
          <button
            onClick={() => setShowHi((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-full border border-(--border) text-(--muted) hover:text-(--accent) hover:border-(--accent)"
          >
            {showHi ? "EN" : "हिं"}
          </button>
        </div>

        <div className="prose prose-sm max-w-none text-(--text) leading-relaxed">
          {showHi ? active.hi_content : active.content}
        </div>

        {active.quiz.length > 0 && (
          <div className="border-t border-(--border) pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-(--text)">{t("Quick check")}</h3>
            {active.quiz.map((q, qi) => {
              const key = `${active.id}:${qi}`;
              const picked = quizPick[key];
              return (
                <div key={qi} className="space-y-2">
                  <p className="text-sm text-(--text)">{showHi ? q.hi_q : q.q}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const isPicked = picked === oi;
                      const isCorrect = oi === q.correct;
                      const showResult = picked !== undefined;
                      const cls = !showResult
                        ? "border-(--border) hover:border-(--accent)"
                        : isCorrect
                          ? "border-green-500/60 bg-green-500/10"
                          : isPicked
                            ? "border-red-500/60 bg-red-500/10"
                            : "border-(--border) opacity-60";
                      return (
                        <button
                          key={oi}
                          onClick={() => setQuizPick((p) => ({ ...p, [key]: oi }))}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
