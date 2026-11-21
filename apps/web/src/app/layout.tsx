import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"], display: "swap" });
const brand = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-brand", weight: ["800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Nikl: what's happening in Bhubaneswar", template: "%s · Nikl" },
  description: "Runs, gigs, workshops, treks, markets and the clubs behind them. Discover, book with UPI and go with friends.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${body.variable} ${display.variable} ${brand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
