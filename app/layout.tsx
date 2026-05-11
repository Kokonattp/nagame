import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nagame 眺め",
  description: "Live travel signals for Japan cities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
