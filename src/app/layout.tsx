import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.short}`,
  },
  description:
    "Chat with the fictional Northwind Comfort desk in Austin. Troubleshooting, sample quotes, arrival windows, and a dispatch board.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
