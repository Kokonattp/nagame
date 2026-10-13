import Link from "next/link";
import { CalendarDays, Heart, Home, Map as MapIcon, User } from "lucide-react";
import { FujiMark } from "./fuji-mark";

/**
 * The app's own navigation for pages outside the chat app (/japan month guides), so they look and
 * move like the rest of Nagame: same bar (bottom on phones, top on desktop), same four tabs.
 */
export function SiteNav() {
  return (
    <nav className="tabi-nav" aria-label="เมนูหลัก">
      <div className="tabi-nav-inner">
        <Link href="/" className="tabi-nav-brand" aria-label="Nagame หน้าแรก">
          <FujiMark />
          <span className="tabi-title text-[22px] font-bold leading-none tracking-tight text-[var(--t-navy)]">Nagame</span>
        </Link>
        <Link href="/"><Home size={22} aria-hidden />หน้าแรก</Link>
        <Link href="/"><MapIcon size={22} aria-hidden />วางแผนทริป</Link>
        <Link href="/?tab=trips"><Heart size={22} aria-hidden />ทริปของฉัน</Link>
        <Link href="/?tab=profile"><User size={22} aria-hidden />โปรไฟล์</Link>
        <Link href="/japan" className="tabi-nav-help" aria-current="page"><CalendarDays size={22} aria-hidden />เดือนไหนดี</Link>
      </div>
    </nav>
  );
}

/** Phone header for the guide pages: the same logo + subtitle as the app's top bar. */
export function SiteHeader() {
  return (
    <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Nagame หน้าแรก">
      <FujiMark />
      <span>
        <span className="tabi-title block text-[22px] font-bold leading-none tracking-tight text-[var(--t-navy)]">Nagame</span>
        <span className="tabi-muted block text-xs">วางทริปญี่ปุ่นกับทาบิ</span>
      </span>
    </Link>
  );
}
