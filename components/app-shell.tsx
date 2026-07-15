"use client";

// AppShell — เปลือกของ nagame ที่ "ไม่รู้เนื้อหา" (shell-agnostic): รับ 3 พื้นผิวเป็น slot
// แล้วจัดวางเอง — desktop = 2 แพน (แชทซ้ายค้างตลอด + เวที map/trip ขวา),
// mobile = แท็บล่าง 3 ปุ่ม (แชทเป็นค่าเริ่มต้น). tab อยู่ใน ?tab= เพื่อ deep-link ข้ามแท็บได้
// (แชทเป็น router: กร๊วกแนะ → ลิงก์เปิดแผนที่ที่กรองไว้). ตาม [[nagame-v2-direction]].

import { Suspense, useCallback, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Map as MapIcon, Luggage } from "lucide-react";

export type ShellTab = "chat" | "map" | "trip";

const STAGE_TABS: { key: Exclude<ShellTab, "chat">; label: string; jp: string; icon: typeof MapIcon }[] = [
  { key: "map", label: "แผนที่", jp: "地図", icon: MapIcon },
  { key: "trip", label: "ทริป", jp: "旅程", icon: Luggage },
];

const MOBILE_TABS: { key: ShellTab; label: string; icon: typeof MapIcon }[] = [
  { key: "chat", label: "แชท", icon: MessageCircle },
  { key: "map", label: "แผนที่", icon: MapIcon },
  { key: "trip", label: "ทริป", icon: Luggage },
];

export type AppShellProps = {
  chat: ReactNode;
  map: ReactNode;
  trip: ReactNode;
  /** ชื่อเมือง/หัวข้อที่โชว์บนแถบซ้าย (เช่น "โตเกียว 東京") */
  title?: ReactNode;
  /**
   * "rail" (ค่าเริ่มต้น) = desktop 2-pane แชทซ้ายค้าง — ใช้เมื่อมี chat UI จริงในแพนแคบได้
   * "tabs" = desktop เหมือน mobile: พื้นผิวเดียว + แท็บบน, แชทเป็น document-flow เต็มจอ
   *   (ใช้กับหน้าเมืองจริงตอนนี้ที่ chat คือ TravelDashboard เต็มจอ scroll — ตาม Fable:
   *   ห้ามยัด dashboard 1380px เข้าแพน 384px, และห้ามครอบ overflow ไม่งั้น sticky/anchor/
   *   stamp/webcam พัง เพราะ window ต้องเป็น scroll container)
   */
  layout?: "rail" | "tabs";
};

function AppShellInner({ chat, map, trip, title, layout = "rail" }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rawTab = params.get("tab");
  const tab: ShellTab = (["chat", "map", "trip"] as const).includes(rawTab as ShellTab)
    ? (rawTab as ShellTab)
    : "chat";

  // เปลี่ยนแท็บ = อัปเดต ?tab= (scroll:false กันเด้งบนสุด, deep-link ได้)
  const setTab = useCallback(
    (next: ShellTab) => {
      const sp = new URLSearchParams(params.toString());
      if (next === "chat") sp.delete("tab");
      else sp.set("tab", next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // เวทีขวา (desktop) / เนื้อหาแท็บที่ไม่ใช่แชท (mobile)
  const stageTab: Exclude<ShellTab, "chat"> = tab === "chat" ? "map" : tab;
  const stageBody = stageTab === "map" ? map : trip;

  // ── โหมด "tabs": พื้นผิวเดียว + แท็บบน (desktop เหมือน mobile). แชท = document flow
  //    (window เป็น scroll container → sticky/anchor/stamp/webcam ของ dashboard ทำงานเหมือนเดิม)
  if (layout === "tabs") {
    const onChat = tab === "chat";
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {/* แท็บบาร์บน — sticky, top-level surface switcher */}
        <div className="sticky top-0 z-50 flex items-center gap-2 overflow-x-auto border-b-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-2.5">
          {MOBILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-[10px] border-[2px] border-[var(--nb-ink)] px-3.5 py-2 text-[13px] font-bold shadow-[var(--nb-shadow-press)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nb-vermilion)] ${
                  active
                    ? "bg-[var(--nb-vermilion)] text-white"
                    : "bg-[var(--surface)] text-[var(--foreground)] hover:-translate-y-px"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
              </button>
            );
          })}
          {title ? <span className="ml-auto shrink-0 pr-1 text-sm font-bold">{title}</span> : null}
        </div>

        {/* แชท = document flow (ไม่ครอบ overflow). map/book/trip = contained pane สูงเต็มจอ */}
        {onChat ? (
          <div>{chat}</div>
        ) : (
          <div className="h-[calc(100vh-57px)] overflow-auto">{stageBody}</div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ===== DESKTOP: 2-pane (≥1024px) ===== */}
      <div className="mx-auto hidden h-screen max-w-[1440px] lg:grid lg:grid-cols-[384px_1fr]">
        {/* ซ้าย: แชทกร๊วกค้างตลอด */}
        <aside className="flex min-h-0 flex-col border-r-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)]">
          {chat}
        </aside>
        {/* ขวา: เวที map/book/trip สลับด้วย stage tabs */}
        <section className="flex min-h-0 flex-col bg-[var(--background)]">
          <div className="flex items-center gap-2 border-b-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)] px-4 py-3">
            {title ? (
              <span className="mr-2 text-sm font-bold text-[var(--foreground)]">{title}</span>
            ) : null}
            {STAGE_TABS.map((t) => {
              const Icon = t.icon;
              const active = stageTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-[10px] border-[2px] border-[var(--nb-ink)] px-3.5 py-2 text-[13px] font-bold shadow-[var(--nb-shadow-press)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nb-vermilion)] ${
                    active
                      ? "bg-[var(--nb-vermilion)] text-white"
                      : "bg-[var(--surface)] text-[var(--foreground)] hover:-translate-y-px"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {t.label}
                  <span className="text-[10px] opacity-60">{t.jp}</span>
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{stageBody}</div>
        </section>
      </div>

      {/* ===== MOBILE: single surface + bottom tab bar ===== */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <div className="min-h-0 flex-1 overflow-auto pb-24">
          {tab === "chat" ? chat : tab === "map" ? map : trip}
        </div>
        <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto max-w-[430px] px-4">
          <div className="grid grid-cols-3 items-center rounded-[2rem] border-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)] px-2 py-1.5 shadow-[var(--nb-shadow)]">
            {MOBILE_TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={active}
                  className={`flex h-14 flex-col items-center justify-center rounded-2xl transition ${
                    active ? "text-[var(--nb-vermilion)]" : "text-[var(--ink-muted)]"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="mt-1 text-[11px] font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  // useSearchParams ต้องอยู่ใต้ Suspense ใน Next 15 (กัน bail-out ทั้งหน้าเป็น CSR)
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <AppShellInner {...props} />
    </Suspense>
  );
}
