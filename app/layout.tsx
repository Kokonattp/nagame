import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nagame Travel Companion",
  description: "Responsive travel web app for Japan cities with live weather, nearby cities, events, webcam, and AI trip planning.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Nagame Travel Companion",
    description: "เช็คอากาศ ฝุ่น กล้องสด อีเวนต์ และวางแผนเที่ยวญี่ปุ่นด้วย AI ครบในหน้าเดียว",
    siteName: "Nagame",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nagame Travel Companion",
    description: "เช็คอากาศ ฝุ่น กล้องสด อีเวนต์ และวางแผนเที่ยวญี่ปุ่นด้วย AI ครบในหน้าเดียว",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
