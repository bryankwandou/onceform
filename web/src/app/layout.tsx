import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://onceform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Onceform — answer any form once, prove it without exposing it",
    template: "%s · Onceform",
  },
  description:
    "Onceform fills questionnaires from a vault that never leaves your device, proves the attributes behind your answers without revealing them, and writes a consent receipt you can withdraw at any time.",
  keywords: [
    "consent receipts",
    "form autofill",
    "verifiable credentials",
    "survey fraud",
    "Solana",
    "privacy",
  ],
  authors: [{ name: "Onceform" }],
  openGraph: {
    type: "website",
    url: SITE,
    title: "Onceform — answer any form once, prove it without exposing it",
    description:
      "A vault on your device, an attestation layer sites can verify, and a consent receipt you control. Running on Solana devnet.",
    siteName: "Onceform",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onceform",
    description:
      "Answer any form once. Prove what matters without handing over the rest.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08080b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
