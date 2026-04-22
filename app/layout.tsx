import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
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
  title: "Janman Legal Aid",
  description: "Shared legal aid platform for Public, Advocates, Paralegals and Admins.",
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
      </body>
    </html>
  );
}
