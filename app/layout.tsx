import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nagame.vercel.app"),
  title: "Nagame 眺め — เพื่อนช่วยเตรียมทริปญี่ปุ่น",
  description: "คุยกับกร๊วกเพื่อเลือกเมือง เตรียมทริป และเช็กข้อมูลญี่ปุ่นที่เกี่ยวข้องในที่เดียว",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Nagame",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Nagame 眺め — เพื่อนช่วยเตรียมทริปญี่ปุ่น",
    description: "คุยกับกร๊วกเพื่อเลือกเมือง เตรียมทริป และเช็กข้อมูลญี่ปุ่นที่เกี่ยวข้องในที่เดียว",
    siteName: "Nagame",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nagame 眺め — เพื่อนช่วยเตรียมทริปญี่ปุ่น",
    description: "คุยกับกร๊วกเพื่อเลือกเมือง เตรียมทริป และเช็กข้อมูลญี่ปุ่นที่เกี่ยวข้องในที่เดียว",
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
