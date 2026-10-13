import type { Metadata } from "next";
import Link from "next/link";
import { prompt } from "@/components/tabi/fonts";
import "@/components/tabi/tabi.css";
import { MONTHS } from "@/lib/tabi/months";
import { SiteHeader, SiteNav } from "@/components/tabi/site-nav";

export const metadata: Metadata = {
  title: "ไปญี่ปุ่นเดือนไหนดี? ที่เที่ยวตามฤดูทั้ง 12 เดือน · Nagame",
  description: "สรุปเที่ยวญี่ปุ่นทีละเดือน: อากาศ คนเยอะไหม ที่ปิดตามฤดู และที่เที่ยวเด่น แล้วให้ทาบิจัดทริปให้ฟรี",
  alternates: { canonical: "/japan" },
};

export default function JapanMonths() {
  return (
    <div className={`${prompt.variable} tabi`}>
      <main className="tabi-shell space-y-6">
        <SiteHeader />
        <header className="space-y-2">
          <h1 className="text-3xl font-bold lg:text-5xl">ไปญี่ปุ่นเดือนไหนดี?</h1>
          <p className="text-[var(--t-navy)]">เลือกเดือนที่อยากไป ดูว่าช่วงนั้นเป็นยังไง แล้วให้ทาบิจัดทริปให้</p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHS.map((m) => (
            <li key={m.slug}>
              <Link href={`/japan/${m.slug}`} className="tabi-card flex h-full gap-3 p-4">
                <span className="text-3xl" aria-hidden>{m.emoji}</span>
                <span>
                  <span className="tabi-title block text-lg font-bold">{m.th}</span>
                  <span className="tabi-muted block text-sm leading-snug">{m.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteNav />
    </div>
  );
}
