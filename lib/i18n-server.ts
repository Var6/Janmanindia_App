import { cookies } from "next/headers";
import { translate, isLang, DEFAULT_LANG, type Lang } from "@/lib/i18n";

/**
 * Server-side counterpart to the client `useT()` hook. Reads the `lang` cookie
 * (set by the LanguageProvider) so server components / pages can translate
 * static strings too:
 *
 *   const t = await getServerT();
 *   <h1>{t("My Cases")}</h1>
 */
export async function getServerLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const v = store.get("lang")?.value;
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export async function getServerT(): Promise<(source: string) => string> {
  const lang = await getServerLang();
  return (source: string) => translate(lang, source);
}
