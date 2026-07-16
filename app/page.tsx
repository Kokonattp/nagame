import { CitySearch } from "@/components/city-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAdvisorChatReply } from "@/lib/services/advisor";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";

export const revalidate = 86400;

// หน้าแรก = แชทกร๊วกล้วน (Phase 1.5, docs/chat-cards-roadmap.md). เจ้าของสั่งเอากริดเมือง
// 41 ใบออก — มันแย่งซีนพระเอก ทำให้ดูเป็นแคตตาล็อกไม่ใช่แอปแชท. เหลือ: แชท (พระเอก) +
// ช่องค้นหา (คนรู้ปลายทางแล้วพิมพ์เข้าเมืองตรงได้ ไม่ต้องผ่านแชท).
// seed = getAdvisorChatReply(null,...) ตอบระดับประเทศจาก season data ไม่ยิง LLM.
export default async function Home() {
  const seed = await getAdvisorChatReply(null, "สวัสดี");

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col gap-6 px-4 pb-10 pt-8 md:px-6 md:pt-12">
        <header className="space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--accent-warm)]">
            Nagame Travel Companion
          </p>
          <h1 className="font-serif text-3xl leading-tight md:text-5xl">
            ถามกร๊วกได้เลย — เพื่อนแมวที่อยู่ญี่ปุ่นตอนนี้
          </h1>
          <p className="max-w-xl text-sm leading-7 text-[var(--ink-muted)] md:text-base">
            ยังไม่รู้จะไปเมืองไหนก็ถามได้ เช่น &quot;เดือนนี้ไปไหนดี&quot; หรือ &quot;ราเมงแถวชินจูกุงบสองพัน&quot; —
            กร๊วกช่วยดูอากาศ ฤดู กล้องสด ตั๋ว ที่พัก-ที่กินให้ในที่เดียว
          </p>
          {/* คนที่รู้ปลายทางแล้ว พิมพ์ชื่อเมืองเข้าตรงได้ ไม่ต้องผ่านแชท */}
          <CitySearch seeds={japanMajorCities} />
        </header>

        {/* แชท = พระเอก เต็มพื้นที่ที่เหลือ */}
        <section className="nb-card flex min-h-0 flex-1 flex-col p-5 md:p-6">
          <ChatPanel
            seedBubbles={seed.bubbles}
            seedCards={seed.cards}
            placeholder="เช่น เดือนนี้ไปไหนดี หรือ ธันวาไปโตเกียวหนาวไหม"
          />
        </section>
      </div>
    </main>
  );
}
