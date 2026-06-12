import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verse Profiteer — Star Citizen Trade Route Planner",
  description:
    "Live market data mirror, profit-per-minute route ranking with a calibrated travel-time model, and a P&L ledger for cargo runs.",
  metadataBase: new URL("https://verse-profiteer.vercel.app"),
  openGraph: {
    title: "Verse Profiteer",
    description:
      "Trade route planner for Star Citizen. Routes ranked by realizable profit per minute, not spreadsheet margin.",
    url: "https://verse-profiteer.vercel.app",
    siteName: "Verse Profiteer",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
