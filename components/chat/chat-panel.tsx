"use client";

// ChatPanel — พื้นผิวแชทกร๊วกแบบ shell-agnostic (Phase 0 U5). แยกออกจาก travel-dashboard
// (เดิมแชทฝังใน dashboard 864 บรรทัด) เพื่อให้ใช้ได้ทั้งหน้าเมือง (citySlug มี) และหน้าแรก
// (citySlug=null → ถามระดับประเทศ). อ่าน ChatReply ใหม่ (bubbles + cards) — LLM พูดไทย,
// การ์ดโค้ดประกอบจากข้อมูลจริง. ตาม docs/chat-cards-roadmap.md.

import { Bot, Compass } from "lucide-react";
import { useRef, useState } from "react";
import type { Card, ChatReply } from "@/lib/chat/types";
import { CardList } from "@/components/chat/cards";

type ChatTurn = {
  role: "assistant" | "user";
  bubbles: string[];
  cards?: Card[];
};

export type ChatPanelProps = {
  /** เมืองที่กำลังคุย — null = หน้าแรก (ถามระดับประเทศ ไม่บังคับเลือกเมือง) */
  citySlug?: string | null;
  /** ข้อความเปิดของกร๊วก (คำทักทาย server-computed) — เป็น turn แรก */
  seedBubbles?: string[];
  seedCards?: Card[];
  /** คำถามลัดใต้กล่องแชท */
  quickPrompts?: string[];
  placeholder?: string;
};

const DEFAULT_QUICK = ["เดือนนี้ไปไหนดี", "งบ 3 หมื่นพอไหม", "ที่ไหนหิมะตกบ้าง"];

export function ChatPanel({
  citySlug = null,
  seedBubbles,
  seedCards,
  quickPrompts = DEFAULT_QUICK,
  placeholder = "ถามกร๊วกได้เลย เช่น เดือนธันวาไปโตเกียว 5 วัน งบ 3 หมื่นพอไหม",
}: ChatPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>(() =>
    seedBubbles?.length || seedCards?.length
      ? [{ role: "assistant", bubbles: seedBubbles ?? [], cards: seedCards }]
      : [],
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function submit(prompt: string) {
    const value = prompt.trim();
    if (!value || pending) return;

    setInput("");
    setError("");
    setTurns((prev) => [...prev, { role: "user", bubbles: [value] }]);
    setPending(true);

    void (async () => {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(citySlug ? { citySlug, prompt: value } : { prompt: value }),
        });
        const data = (await res.json()) as { reply?: ChatReply; error?: string };
        if (!res.ok || !data.reply) {
          setError(data.error ?? "ตอบกลับไม่สำเร็จ ลองใหม่อีกครั้ง");
          return;
        }
        setTurns((prev) => [
          ...prev,
          { role: "assistant", bubbles: data.reply!.bubbles, cards: data.reply!.cards },
        ]);
        // เลื่อนลงล่างสุดหลัง render
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
      } catch {
        setError("การเชื่อมต่อยังไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {turns.map((turn, i) => (
          <div key={i} className="space-y-2.5">
            {turn.role === "assistant"
              ? turn.bubbles.map((b, bi) => (
                  <div
                    key={bi}
                    className="rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--nb-vermilion-soft)] p-3.5 shadow-[3px_3px_0_0_var(--nb-ink)]"
                  >
                    {bi === 0 ? (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        <Bot className="h-3.5 w-3.5" aria-hidden />
                        กร๊วก
                      </div>
                    ) : null}
                    <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{b}</p>
                  </div>
                ))
              : turn.bubbles.map((b, bi) => (
                  <div
                    key={bi}
                    className="ml-6 rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--nb-indigo-soft)] p-3.5"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      <Compass className="h-3.5 w-3.5" aria-hidden />
                      คุณ
                    </div>
                    <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{b}</p>
                  </div>
                ))}
            {turn.cards?.length ? <CardList cards={turn.cards} /> : null}
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--nb-vermilion)]" />
            กร๊วกกำลังเช็คให้…
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => submit(p)}
              disabled={pending}
              className="rounded-[10px] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-bold shadow-[var(--nb-shadow-press)] transition hover:-translate-y-px disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="space-y-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            maxLength={300}
            rows={2}
            className="w-full rounded-[var(--nb-radius-sm)] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--ink-muted)] focus:shadow-[3px_3px_0_0_var(--nb-ink)]"
          />
          <div className="flex items-center justify-between gap-3">
            {error ? (
              <p className="text-sm font-medium text-[var(--nb-vermilion)]">{error}</p>
            ) : (
              <span className="text-xs text-[var(--ink-muted)]">กร๊วกตอบจากข้อมูลจริง</span>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] border-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-vermilion)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--nb-shadow-sm)] transition hover:-translate-y-px disabled:opacity-50"
            >
              {pending ? "กำลังคิด…" : "ถามกร๊วก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
