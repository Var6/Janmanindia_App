import type { Metadata } from "next";
import { Manrope, Fraunces, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import "./globals.css";
import ThemeProvider from "@/components/ui/ThemeProvider";
import SessionProvider from "@/components/ui/SessionProvider";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import SecurityGuard from "@/components/security/SecurityGuard";
import ToastProvider from "@/components/ui/ToastProvider";
import { isLang, DEFAULT_LANG } from "@/lib/i18n";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  // `default` is used on pages that don't set their own title; `template`
  // wraps any page-specific title so the tab always reads
  // "<page> — Janman Legal Aid".
  title: {
    default: "Janman Legal Aid",
    template: "%s — Janman Legal Aid",
  },
  description: "Janman Legal Aid is a free legal aid platform connecting community members in Bihar with social workers, paralegals, and advocates. Operated by Janman People's Foundation.",
  applicationName: "Janman Legal Aid",
  authors: [{ name: "Janman People's Foundation" }],
  // Icons are auto-discovered by Next.js from app/icon.png and
  // app/apple-icon.png — no metadata.icons block needed (and overriding it
  // with a static URL drops the cache-busting query hash).
  openGraph: {
    title: "Janman Legal Aid",
    description: "Free legal aid for Bihar communities — case intake, hearings, and coordination across advocates, social workers, and admins.",
    siteName: "Janman Legal Aid",
    images: [{ url: "/logo.png", width: 725, height: 735, alt: "Janman Legal Aid" }],
    locale: "en_IN",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the language cookie on the server so the entire tree — server AND
  // client components — renders in the chosen language from the very first
  // paint. Without this the provider booted to English and only switched to
  // Hindi after mount, which is the "flashes English / need to refresh" bug.
  const cookieLang = (await cookies()).get("lang")?.value;
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;
  return (
    <html lang={lang}
      className={`${sans.variable} ${serif.variable} ${mono.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-(--bg) text-(--text) transition-colors duration-300 app-bg">
        <ThemeProvider>
          <LanguageProvider initialLang={lang}>
            <SessionProvider>
              <ToastProvider>
                <SecurityGuard />
                {children}
              </ToastProvider>
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
