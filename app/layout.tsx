import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ThemeProvider from "@/components/ui/ThemeProvider";
import SessionProvider from "@/components/ui/SessionProvider";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"
      className={`${sans.variable} ${mono.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-(--bg) text-(--text) transition-colors duration-300 app-bg">
        <ThemeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
