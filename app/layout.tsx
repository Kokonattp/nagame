import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "Nagame 眺め — วางทริปญี่ปุ่นกับทาบิ";
const DESCRIPTION = "คุยกับทาบิ แมวผู้ช่วยวางทริปญี่ปุ่น บอกช่วงเวลาและแนวที่ชอบ แล้วได้เส้นทางและร่างทริปรายวัน";

export const metadata: Metadata = {
  metadataBase: new URL("https://nagame.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: "/tabi/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/tabi/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/tabi/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/tabi/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Nagame",
    statusBarStyle: "default",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Nagame",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7fbff",
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
