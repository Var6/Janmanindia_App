"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LANG, isLang, translate, type Lang } from "@/lib/i18n";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate an English source string into the active language. */
  t: (source: string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "lang";

function readStoredLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  // Prefer the cookie (also readable server-side later), fall back to localStorage.
  const fromCookie = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)?.[1];
  if (isLang(fromCookie)) return fromCookie;
  const fromStore = localStorage.getItem(STORAGE_KEY);
  if (isLang(fromStore)) return fromStore;
  return DEFAULT_LANG;
}

export default function LanguageProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  /** Language read from the `lang` cookie on the server, so SSR + the first
   *  client render agree and there's no English→Hindi flash on load. */
  initialLang?: Lang;
}) {
  // Seed from the server-provided cookie language so SSR and the first client
  // render match exactly. Fall back to the stored choice only when the server
  // didn't pass one (keeps the component usable in isolation).
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG);

  useEffect(() => {
    if (initialLang) return; // server already gave us the right language
    const stored = readStoredLang();
    if (stored !== lang) setLangState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the language on <html> so CSS (Devanagari font) + accessibility
  // pick it up across the whole app.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      // 1-year cookie so server components can read the choice in future.
      document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* storage may be unavailable */ }
  }, []);

  const t = useCallback((source: string) => translate(lang, source), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  // Safe fallback so a component used outside the provider still renders in English.
  if (!ctx) return { lang: DEFAULT_LANG, setLang: () => {}, t: (s) => s };
  return ctx;
}

/** Returns the translate function `t(source)`. */
export function useT(): (source: string) => string {
  return useLanguage().t;
}

/** Returns `{ lang, setLang }` for the language switcher. */
export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { lang, setLang } = useLanguage();
  return { lang, setLang };
}
