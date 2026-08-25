"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CloudSun,
  Compass,
  Download,
  HardDrive,
  Luggage,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PlaneTakeoff,
  Plus,
  ShieldAlert,
  Sparkles,
  Star,
  TentTree,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import type { Card, ChatReply } from "@/lib/chat/types";
import {
  downloadPlan,
  loadPlan,
  mergePlanCards,
  parsePlanFile,
  requestPersistentStorage,
  savePlan,
  type PlanCardStatus,
  type SavedPlanItem,
} from "@/lib/pretrip/storage";
import { KruakAvatar } from "@/components/kruak-avatar";

type IntentId = "discover" | "prepare" | "check";
type CardFilter = "all" | "important" | "done";
type StorageState = "loading" | "ready" | "saving" | "error";

type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  bubbles: string[];
  cards?: Card[];
};

const INTENTS: Array<{
  id: IntentId;
  title: string;
  detail: string;
  prompt: string;
  icon: typeof Compass;
}> = [
  {
    id: "discover",
    title: "ยังไม่รู้จะไปไหน",
    detail: "บอกเดือน งบ และสไตล์ เดี๋ยวกร๊วกช่วยเทียบเมืองให้",
    prompt: "ช่วยเลือกเมืองญี่ปุ่นให้หน่อย เดือนพฤศจิกายน มีเวลา 5 วัน งบประมาณ 35,000 บาท ชอบเที่ยวช้า ๆ",
    icon: Compass,
  },
  {
    id: "prepare",
    title: "รู้เมืองแล้ว ช่วยเตรียมทริป",
    detail: "เริ่มจากเมืองที่มี แล้วค่อย ๆ เติมสิ่งที่ต้องตัดสินใจ",
    prompt: "ช่วยเตรียมทริปโตเกียว 5 วันในเดือนพฤศจิกายน งบ 35,000 บาทให้หน่อย",
    icon: Luggage,
  },
  {
    id: "check",
    title: "มีแผนแล้ว ช่วยเช็กให้หน่อย",
    detail: "ส่งสิ่งที่คิดไว้มา กร๊วกจะช่วยหาช่องว่างให้",
    prompt: "ช่วยเช็กแผนไปโตเกียว 5 วันให้หน่อย มีที่พักแล้ว แต่อยากรู้ว่ายังขาดอะไร",
    icon: ShieldAlert,
  },
];

export function PretripHome({ seedBubbles, seedCards }: { seedBubbles: string[]; seedCards: Card[] }) {
  const [intent, setIntent] = useState<IntentId | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    seedBubbles.length || seedCards.length
      ? [{ id: "seed", role: "assistant", bubbles: seedBubbles, cards: seedCards }]
      : [],
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedPlan, setSavedPlan] = useState<SavedPlanItem[]>([]);
  const [planFilter, setPlanFilter] = useState<CardFilter>("all");
  const [manageCardId, setManageCardId] = useState<string | null>(null);
  const [storageState, setStorageState] = useState<StorageState>("loading");
  const [storageMessage, setStorageMessage] = useState("กำลังเปิดแผนบนเครื่องนี้…");
  const [planHydrated, setPlanHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const persistenceAskedRef = useRef(false);

  useEffect(() => {
    let active = true;

    void loadPlan()
      .then(({ cards, source }) => {
        if (!active) return;
        setSavedPlan(cards);
        setPlanHydrated(true);
        setStorageState("ready");
        setStorageMessage(source === "migrated" ? "ย้ายแผนเดิมเข้าไปในฐานข้อมูลบนเครื่องแล้ว" : "แผนพร้อมใช้บนเครื่องนี้");
      })
      .catch(() => {
        if (!active) return;
        setPlanHydrated(true);
        setStorageState("error");
        setStorageMessage("เปิดฐานข้อมูลในเครื่องไม่ได้ตอนนี้ — ส่งออกไฟล์ไว้ก่อนได้");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  useEffect(() => {
    if (!planHydrated) return;

    let active = true;
    setStorageState("saving");
    void savePlan(savedPlan)
      .then(async () => {
        if (!active) return;
        if (savedPlan.length && !persistenceAskedRef.current) {
          persistenceAskedRef.current = true;
          const persisted = await requestPersistentStorage();
          if (persisted === false) {
            setStorageMessage("บันทึกบนเครื่องแล้ว · แนะนำส่งออกไฟล์ไว้กันหาย");
          } else {
            setStorageMessage("บันทึกบนเครื่องนี้แล้ว");
          }
        } else {
          setStorageMessage(savedPlan.length ? "บันทึกบนเครื่องนี้แล้ว" : "ฐานข้อมูลพร้อมใช้บนเครื่องนี้");
        }
        setStorageState("ready");
      })
      .catch(() => {
        if (!active) return;
        setStorageState("error");
        setStorageMessage("บันทึกอัตโนมัติไม่สำเร็จ — ส่งออกไฟล์ไว้ก่อนได้");
      });

    return () => {
      active = false;
    };
  }, [planHydrated, savedPlan]);

  const suggestedCity = useMemo(() => {
    for (const message of messages) {
      for (const card of message.cards ?? []) {
        if (card.kind === "weather") return card.cityName;
      }
    }
    const savedWeather = savedPlan.find((item) => item.kind === "weather");
    if (savedWeather) return savedWeather.title;
    return "ญี่ปุ่น";
  }, [messages, savedPlan]);

  const visiblePlan = useMemo(
    () => savedPlan.filter((item) => planFilter === "all" || (planFilter === "important" ? item.status === "important" : item.status === "done")),
    [planFilter, savedPlan],
  );

  async function submit(prompt: string) {
    const value = prompt.trim();
    if (!value || pending) return;

    setDraft("");
    setError("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", bubbles: [value] }]);
    setPending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const data = (await response.json()) as { reply?: ChatReply; error?: string };
      if (!response.ok || !data.reply) {
        setError(data.error ?? "กร๊วกยังตอบไม่ได้ตอนนี้");
        return;
      }
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", bubbles: data.reply!.bubbles, cards: data.reply!.cards },
      ]);
    } catch {
      setError("การเชื่อมต่อสะดุด ลองส่งคำถามเดิมอีกครั้งได้เลย");
    } finally {
      setPending(false);
    }
  }

  function saveCard(card: Card) {
    const item = makePlanItem(card);
    if (!item || savedPlan.some((saved) => saved.id === item.id)) return;
    setSavedPlan((current) => [...current, item]);
  }

  function updateCardStatus(id: string, status: PlanCardStatus) {
    setSavedPlan((current) => current.map((item) => (item.id === id ? { ...item, status, updatedAt: Date.now() } : item)));
    setManageCardId(null);
  }

  function removeCard(id: string) {
    setSavedPlan((current) => current.filter((item) => item.id !== id));
    setManageCardId(null);
  }

  async function importFile(file: File) {
    try {
      const incoming = await parsePlanFile(file);
      setSavedPlan((current) => mergePlanCards(current, incoming));
      setStorageMessage(`นำเข้า ${incoming.length} การ์ดแล้ว · ตรวจรายการได้ในแผนของฉัน`);
      setStorageState("ready");
    } catch (importError) {
      setStorageState("error");
      setStorageMessage(importError instanceof Error ? importError.message : "อ่านไฟล์แผนไม่สำเร็จ");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  const hasConversation = messages.length > 1 || intent !== null;
  const steps = [
    { label: "เลือกช่วงและเมือง", done: intent !== null },
    { label: "เช็กอากาศกับงบ", done: savedPlan.some((item) => item.kind === "weather" || item.kind === "flight") },
    { label: "เก็บสิ่งที่อยากไป", done: savedPlan.some((item) => ["stay", "eat", "place"].includes(item.kind)) },
  ];

  return (
    <main className="pretrip-app">
      <div className="pretrip-frame">
        <header className="station-header">
          <Link className="brand-lockup" href="/" aria-label="Nagame หน้าหลัก">
            <span className="brand-mark">N</span>
            <span>
              <strong>Nagame</strong>
              <small>眺め · ญี่ปุ่นแบบที่เหมาะกับคุณ</small>
            </span>
          </Link>
          <div className="station-status" aria-label="สถานะระบบ"><span className="status-dot" /><span>กร๊วกพร้อมช่วยวางแผน</span></div>
        </header>

        <div className="route-strip" aria-hidden="true"><span>กรุงเทพฯ</span><i /><span className="route-active">ญี่ปุ่น</span><i /><span>ทริปของเรา</span></div>

        <div className="pretrip-grid">
          <section className="conversation-column" aria-label="คุยกับกร๊วก">
            <div className="welcome-block">
              <div className="welcome-copy"><p className="display-kicker">ก่อนออกเดินทาง</p><h1>ญี่ปุ่นทริปนี้<br /><em>เริ่มคิดด้วยกัน</em></h1><p className="welcome-lede">กร๊วกช่วยตั้งแต่เลือกเมือง เช็กจังหวะ ไปจนถึงเตรียมของที่ต้องใช้จริง</p></div>
              <div className="kruak-station-art"><KruakAvatar art="idle" className="kruak-hero-avatar" /><span className="speech-tag">ถามได้เลย<br />ไม่ต้องรู้ศัพท์เที่ยวก็ได้</span></div>
            </div>

            {!hasConversation ? <div className="departure-choices"><div className="section-label"><span>เริ่มที่ชานชาลาไหนดี</span><span>เลือกหนึ่งอย่าง</span></div><div className="intent-list">{INTENTS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className="intent-row" onClick={() => { setIntent(item.id); void submit(item.prompt); }}><span className="intent-icon"><Icon aria-hidden /></span><span className="intent-text"><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight aria-hidden /></button>; })}</div></div> : null}

            <div className={`conversation-panel ${!hasConversation ? "conversation-panel--quiet" : ""}`}>
              <div className="conversation-heading"><div><MessageCircle aria-hidden /><span>บทสนทนา</span></div>{suggestedCity !== "ญี่ปุ่น" ? <span className="city-chip"><MapPin aria-hidden />{suggestedCity}</span> : null}</div>
              <div className="message-list" aria-live="polite">
                {messages.map((message) => <div className={`message-block message-block--${message.role}`} key={message.id}>{message.role === "assistant" ? <div className="message-avatar"><KruakAvatar art="idle" /></div> : null}<div className="message-content"><span className="message-label">{message.role === "assistant" ? "กร๊วก" : "คุณ"}</span>{message.bubbles.map((bubble, index) => <p className="message-bubble" key={`${message.id}-${index}`}>{bubble}</p>)}{message.cards?.length ? <div className="evidence-stack">{message.cards.map((card) => <EvidenceRow card={card} key={card.id} onSave={saveCard} saved={savedPlan.some((item) => item.id === card.id)} storageReady={planHydrated} />)}</div> : null}</div></div>)}
                {pending ? <div className="checking-state"><span className="loading-bars" /><span>กร๊วกกำลังเช็กเส้นทางให้…</span></div> : null}
                <div ref={endRef} />
              </div>
              {hasConversation ? <PromptForm draft={draft} setDraft={setDraft} pending={pending} error={error} onSubmit={submit} /> : <div className="quiet-prompt"><Sparkles aria-hidden /><span>เลือกจุดเริ่มต้นด้านบน แล้วค่อยเล่ารายละเอียดให้กร๊วกฟัง</span></div>}
            </div>
          </section>

          <aside className="plan-column" aria-label="แผนของฉัน">
            <div className="plan-rail">
              <div className="plan-topline"><span>แผนของฉัน</span><span className="plan-index">{savedPlan.length.toString().padStart(2, "0")}</span></div>
              <div className="plan-title-row"><div><p className="display-kicker">เดินทางกับกร๊วก</p><h2>{suggestedCity === "ญี่ปุ่น" ? "ยังไม่มีจุดหมาย" : suggestedCity}</h2></div><Luggage aria-hidden /></div>
              <p className="plan-note">การ์ดที่คุณเลือกไว้จะอยู่ตรงนี้ ปรับสถานะได้ตามจังหวะของคุณ</p>
              <div className="plan-tools" aria-label="จัดการไฟล์แผน"><button type="button" onClick={() => downloadPlan(savedPlan)}><Download aria-hidden />ส่งออก</button><button type="button" onClick={() => importRef.current?.click()}><Upload aria-hidden />นำเข้า</button><input ref={importRef} type="file" accept=".nagame,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /></div>
              <div className="readiness-list">{steps.map((step) => <div className={`readiness-step ${step.done ? "is-done" : ""}`} key={step.label}><span>{step.done ? <Check aria-hidden /> : <span className="step-line" />}</span><span>{step.label}</span></div>)}</div>
              <div className="saved-section"><div className="section-label"><span>การ์ดในแผน</span><span>{savedPlan.length ? "จัดการได้เอง" : "ยังว่างอยู่"}</span></div><div className="plan-filter" role="tablist" aria-label="กรองการ์ดในแผน">{([ ["all", "ทั้งหมด"], ["important", "สำคัญ"], ["done", "เสร็จแล้ว"] ] as Array<[CardFilter, string]>).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={planFilter === value} className={planFilter === value ? "is-active" : ""} onClick={() => setPlanFilter(value)}>{label}<span>{value === "all" ? savedPlan.length : savedPlan.filter((item) => item.status === value).length}</span></button>)}</div>{visiblePlan.length ? <div className="saved-list">{visiblePlan.map((item) => <SavedCard item={item} key={item.id} expanded={manageCardId === item.id} onToggle={() => setManageCardId((current) => current === item.id ? null : item.id)} onStatus={updateCardStatus} onRemove={removeCard} />)}</div> : <div className="empty-plan"><Plus aria-hidden /><p>{savedPlan.length ? emptyFilterLabel(planFilter) : "ยังไม่มีอะไรต้องจำตอนนี้"}<br /><span>{savedPlan.length ? "ลองเปลี่ยนตัวกรองดูได้" : "กร๊วกจะช่วยเติมทีละเรื่อง"}</span></p></div>}</div>
              <div className="plan-next"><span className="plan-next-label">ถัดไปที่ควรทำ</span><strong>{savedPlan.length ? "คุยต่อ แล้วเลือกสิ่งที่ใช่" : "บอกกร๊วกก่อนว่าอยากไปแบบไหน"}</strong><ArrowUpRight aria-hidden /></div>
            </div>
            <div className={`storage-note storage-note--${storageState}`} role="status"><HardDrive aria-hidden /><span>{storageMessage}</span></div>
            <p className="privacy-note"><CalendarDays aria-hidden /> แผนอยู่ในฐานข้อมูลของเบราว์เซอร์นี้ · ส่งออกไฟล์ไว้ย้ายเครื่องได้</p>
          </aside>
        </div>
        <footer className="pretrip-footer"><span>ข้อมูลที่กร๊วกหยิบมาใช้จะบอกที่มาและความสดเสมอ</span><span>เที่ยวแบบไม่ต้องเปิดสิบแท็บ</span></footer>
      </div>
    </main>
  );
}

function PromptForm({ draft, setDraft, pending, error, onSubmit }: { draft: string; setDraft: (value: string) => void; pending: boolean; error: string; onSubmit: (value: string) => void }) {
  return <form className="prompt-form" onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="เช่น ช่วยจัดทริปโตเกียว 5 วัน งบ 3 หมื่น" rows={2} maxLength={300} aria-label="คำถามถึงกร๊วก" /><div className="prompt-actions"><span className={error ? "prompt-error" : "prompt-hint"}>{error || "เล่าแบบภาษาคนได้เลย"}</span><button type="submit" disabled={pending || !draft.trim()}>{pending ? "กำลังเช็ก…" : "ส่งให้กร๊วก"}<ArrowUpRight aria-hidden /></button></div></form>;
}

function EvidenceRow({ card, onSave, saved, storageReady }: { card: Card; onSave: (card: Card) => void; saved: boolean; storageReady: boolean }) {
  const imageUrl = getCardImage(card);
  const link = card.kind === "stay" ? card.bookUrl : card.kind === "eat" ? card.mapUrl : card.kind === "flight" ? card.searchUrl : card.kind === "webcam" ? card.liveUrl : card.kind === "place" ? card.mapUrl : null;
  const title = card.kind === "weather" ? card.cityName : card.kind === "flight" ? card.route : card.title;
  const detail = getCardDetail(card);
  const value = card.kind === "stay" ? (typeof card.pricePerNightThb === "number" ? `฿${card.pricePerNightThb.toLocaleString("th-TH")}/คืน` : "เช็คราคา") : card.kind === "flight" ? (typeof card.priceThb === "number" ? `฿${card.priceThb.toLocaleString("th-TH")}~` : "เช็คราคาไม่ได้") : card.kind === "weather" ? card.tempRange ?? "ดูช่วงอากาศ" : kindLabel(card.kind);
  return (
    <article className="evidence-row">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={title} />
      ) : (
        <span className={`evidence-symbol evidence-symbol--${card.kind}`}>
          {card.kind === "weather" ? <CloudSun aria-hidden /> : card.kind === "flight" ? <PlaneTakeoff aria-hidden /> : card.kind === "stay" ? <TentTree aria-hidden /> : card.kind === "eat" ? <Utensils aria-hidden /> : <MapPin aria-hidden />}
        </span>
      )}
      <div className="evidence-main"><span className="evidence-kind">{kindLabel(card.kind)}</span><strong>{title}</strong><small>{detail}</small></div>
      <div className="evidence-end"><strong>{value}</strong><div>{link ? <a href={link} target="_blank" rel="noreferrer">เปิดดู <ArrowUpRight aria-hidden /></a> : null}<button type="button" className={saved ? "is-saved" : ""} disabled={!storageReady} onClick={() => onSave(card)} aria-label={saved ? "บันทึกแล้ว" : storageReady ? `บันทึก ${title} ลงแผน` : "กำลังเปิดแผน"}>{saved ? <Check aria-hidden /> : <Plus aria-hidden />}</button></div></div>
    </article>
  );
}

function SavedCard({ item, expanded, onToggle, onStatus, onRemove }: { item: SavedPlanItem; expanded: boolean; onToggle: () => void; onStatus: (id: string, status: PlanCardStatus) => void; onRemove: (id: string) => void }) {
  return <article className={`saved-card saved-card--${item.status} ${expanded ? "is-expanded" : ""}`}><div className="saved-card-header"><span className="saved-kind">{kindLabel(item.kind)}</span><span className={`saved-status saved-status--${item.status}`}>{statusLabel(item.status)}</span><button type="button" className="saved-more" aria-label={`จัดการ ${item.title}`} aria-expanded={expanded} onClick={onToggle}><MoreHorizontal aria-hidden /><span>จัดการ</span></button></div><div className="saved-card-body"><strong>{item.title}</strong><small>{item.detail}</small></div>{expanded ? <div className="saved-card-actions"><button type="button" className={item.status === "important" ? "is-active" : ""} onClick={() => onStatus(item.id, item.status === "important" ? "saved" : "important")}><Star aria-hidden />{item.status === "important" ? "เลิกทำสำคัญ" : "ทำสำคัญ"}</button><button type="button" className={item.status === "done" ? "is-active" : ""} onClick={() => onStatus(item.id, item.status === "done" ? "saved" : "done")}><Check aria-hidden />{item.status === "done" ? "เปิดกลับไว้" : "ทำเสร็จแล้ว"}</button><button type="button" className="is-danger" onClick={() => onRemove(item.id)}><Trash2 aria-hidden />นำออก</button></div> : null}</article>;
}

function getCardImage(card: Card) {
  switch (card.kind) {
    case "stay":
    case "eat":
    case "place":
      return card.imageUrl ?? null;
    case "webcam":
      return card.previewImage;
    default:
      return null;
  }
}

function makePlanItem(card: Card): SavedPlanItem | null {
  const title = card.kind === "weather" ? card.cityName : card.kind === "flight" ? card.route : card.title;
  if (!title) return null;
  const now = Date.now();
  return { id: card.id, title, kind: card.kind, detail: getCardDetail(card), status: "saved", createdAt: now, updatedAt: now };
}

function getCardDetail(card: Card) {
  switch (card.kind) {
    case "weather":
      return card.headline;
    case "flight":
      return `${card.airline ?? "ตั๋วเครื่องบิน"} · ${card.period ?? "ช่วงที่ถาม"}`;
    case "webcam":
      return card.source ?? "กล้องสดจากแหล่งข้อมูลภายนอก";
    case "stay":
    case "eat":
    case "place":
      return card.area ?? card.note ?? "ข้อมูลจากกร๊วก";
  }
}

function kindLabel(kind: Card["kind"]) {
  return { stay: "พัก", eat: "กิน", flight: "บิน", webcam: "ดูสด", weather: "อากาศ", place: "แวะ" }[kind];
}

function statusLabel(status: PlanCardStatus) {
  return { saved: "เก็บไว้", important: "สำคัญ", done: "เสร็จแล้ว" }[status];
}

function emptyFilterLabel(filter: CardFilter) {
  return { all: "ยังไม่มีอะไรต้องจำตอนนี้", important: "ยังไม่มีการ์ดที่ตั้งเป็นสำคัญ", done: "ยังไม่มีการ์ดที่ทำเสร็จแล้ว" }[filter];
}
