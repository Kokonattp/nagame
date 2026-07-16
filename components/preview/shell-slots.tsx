"use client";

// Placeholder slots สำหรับก้าว A — โชว์ว่า AppShell วางเนื้อหาถูกที่ ยังไม่ใช่ของจริง
// (แผนที่ washi / aggregate card จะมาแทนทีละแท็บในก้าวถัดไป)

import dynamic from "next/dynamic";
import { KruakAvatar } from "@/components/kruak-avatar";

// Leaflet ต้อง ssr:false → โหลดฝั่ง client
const WashiMap = dynamic(() => import("@/components/map/washi-map").then((m) => m.WashiMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--ink-muted)]">
      กำลังโหลดแผนที่…
    </div>
  ),
});

function Placeholder({ emoji, title, note }: { emoji: string; title: string; note: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="font-serif text-2xl text-[var(--foreground)]">{title}</h2>
      <p className="max-w-[40ch] text-sm leading-6 text-[var(--ink-muted)]">{note}</p>
      <span className="mt-2 rounded-full border-[2px] border-[var(--nb-ink)] bg-[var(--nb-gold)] px-3 py-1 text-[11px] font-bold text-[var(--nb-ink)] shadow-[var(--nb-shadow-press)]">
        ก้าวถัดไป
      </span>
    </div>
  );
}

export function ChatSlot() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b-[2px] border-[var(--nb-ink)] px-4 py-3">
        <KruakAvatar art="sunny" className="!h-11 !w-11" />
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight">กร๊วก</div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--nb-matcha)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nb-matcha)]" />
            อยู่โตเกียวตอนนี้
          </div>
        </div>
        <span className="ml-auto rounded-full border-[2px] border-[var(--nb-ink)] bg-[var(--nb-gold)] px-2.5 py-1 text-[11px] font-bold text-[var(--nb-ink)]">
          ☀️ 24°
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="self-center">
          <KruakAvatar art="sunny" className="!h-28 !w-28 !border-0 !bg-transparent !shadow-none" />
        </div>
        <div className="max-w-[88%] self-start rounded-[4px_15px_15px_15px] border-[2px] border-[var(--nb-ink)] bg-[var(--background)] px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-[var(--nb-shadow-press)]">
          <span className="font-bold text-[var(--nb-vermilion)]">สวัสดีครับ!</span> วันนี้ฟ้าเปิด
          เหมาะเดินย่านเก่าอย่างยานากะสุดๆ อยากให้ผมจัดครึ่งวันชิลๆ ไหมครับ? 🐾
        </div>
        <div className="max-w-[88%] self-end rounded-[15px_4px_15px_15px] border-[2px] border-[var(--nb-ink)] bg-[var(--nb-indigo)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-[var(--nb-shadow-press)]">
          เอาสิ ขอที่พักงบไม่เกินคืนละ 2 พันด้วยนะ
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {["🍜 ร้านอร่อยแถวนี้", "✈️ ตั๋วบินโตเกียว", "☔ พรุ่งนี้ฝนไหม"].map((c) => (
            <button
              key={c}
              type="button"
              className="rounded-[10px] border-[2px] border-[var(--nb-ink)] bg-[var(--background)] px-3 py-2 text-[12px] font-bold shadow-[var(--nb-shadow-press)] transition hover:-translate-y-px"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t-[2px] border-[var(--nb-ink)] px-3 py-2.5">
        <div className="flex-1 rounded-full border-[2px] border-[var(--nb-ink)] bg-[var(--background)] px-3.5 py-2 text-[13px] text-[var(--ink-muted)]">
          พิมพ์คุยกับกร๊วก…
        </div>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border-[2px] border-[var(--nb-ink)] bg-[var(--nb-vermilion)] text-white shadow-[var(--nb-shadow-press)]"
          aria-label="ส่ง"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export function MapSlot() {
  // ก้าว B — แผนที่ washi จริง (Leaflet) พร้อมหมุดตัวอย่างแถวอาซากุสะ + กร๊วก
  return (
    <WashiMap
      center={[35.7118, 139.7966]}
      zoom={15}
      kruak={{ lat: 35.7108, lon: 139.7955, mood: "sunny", say: "แถวนี้เดินเที่ยวได้เลยครับ 🐾" }}
      pois={[
        { id: "s1", kind: "stay", lat: 35.7128, lon: 139.7986, label: "฿1,180", selected: true },
        { id: "s2", kind: "stay", lat: 35.7095, lon: 139.7935, label: "฿1,650" },
        { id: "s3", kind: "stay", lat: 35.7142, lon: 139.7942, label: "฿2,050" },
        { id: "e1", kind: "eat", lat: 35.7112, lon: 139.7998, label: "🍜 ราเมง" },
        { id: "e2", kind: "eat", lat: 35.7088, lon: 139.7972, label: "🍶 อิซากายะ" },
      ]}
    />
  );
}

export function TripSlot() {
  return (
    <Placeholder
      emoji="🧳"
      title="ทริปของฉัน"
      note="สิ่งที่คุยในแชทมากองที่นี่ — ตั๋วบิน ที่พักที่จองแล้ว ย่านที่จะไป"
    />
  );
}
