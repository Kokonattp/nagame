// หน้าทดสอบก้าว A — เสียบ AppShell กับ placeholder slots เพื่อ verify โครง 4 แท็บ +
// desktop 2-pane + mobile bottom-nav + theme ได้จริง โดยไม่แตะหน้าแรก (/) หรือหน้าเมือง (/city).
// เมื่อโครงนิ่งแล้ว จะย้าย AppShell ไปครอบ /city/[slug] และแทน slot ด้วยของจริงทีละแท็บ.

import { AppShell } from "@/components/app-shell";
import { ChatSlot, MapSlot, BookSlot, TripSlot } from "@/components/preview/shell-slots";
import { ThemeToggle } from "@/components/preview/theme-toggle";

export const metadata = {
  title: "Preview — AppShell (ก้าว A)",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return (
    <>
      <ThemeToggle />
      <AppShell
        title={<span>โตเกียว 東京</span>}
        chat={<ChatSlot />}
        map={<MapSlot />}
        book={<BookSlot />}
        trip={<TripSlot />}
      />
    </>
  );
}
