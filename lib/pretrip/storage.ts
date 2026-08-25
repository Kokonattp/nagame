import type { Card } from "@/lib/chat/types";

export type PlanCardStatus = "saved" | "important" | "done";

export type SavedPlanItem = {
  id: string;
  title: string;
  kind: Card["kind"];
  detail: string;
  status: PlanCardStatus;
  createdAt: number;
  updatedAt: number;
};

type StoredPlan = {
  id: "default";
  version: 1;
  cards: SavedPlanItem[];
  updatedAt: number;
};

const DB_NAME = "nagame-pretrip-v2";
const STORE_NAME = "plans";
const DB_VERSION = 1;
const PLAN_ID = "default" as const;
const LEGACY_STORAGE_KEY = "nagame.pretrip-plan.v1";

const CARD_KINDS: Card["kind"][] = ["stay", "eat", "flight", "webcam", "weather", "place"];
const CARD_STATUSES: PlanCardStatus[] = ["saved", "important", "done"];

export type PlanLoadSource = "indexeddb" | "migrated" | "empty";

export async function loadPlan(): Promise<{ cards: SavedPlanItem[]; source: PlanLoadSource }> {
  const database = await openDatabase();
  const record = await readRecord(database);
  database.close();

  if (record) {
    return { cards: normalizeCards(record.cards), source: "indexeddb" };
  }

  const legacyCards = readLegacyCards();
  if (legacyCards.length) {
    await savePlan(legacyCards);
    return { cards: legacyCards, source: "migrated" };
  }

  return { cards: [], source: "empty" };
}

export async function savePlan(cards: SavedPlanItem[]) {
  const database = await openDatabase();
  const record: StoredPlan = {
    id: PLAN_ID,
    version: 1,
    cards: normalizeCards(cards),
    updatedAt: Date.now(),
  };

  await writeRecord(database, record);
  database.close();
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return null;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function mergePlanCards(current: SavedPlanItem[], incoming: SavedPlanItem[]) {
  const merged = new Map(current.map((card) => [card.id, card]));

  for (const card of normalizeCards(incoming)) {
    const existing = merged.get(card.id);
    if (!existing || card.updatedAt >= existing.updatedAt) {
      merged.set(card.id, card);
    }
  }

  return [...merged.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function downloadPlan(cards: SavedPlanItem[]) {
  if (typeof document === "undefined") return;

  const payload = {
    format: "nagame-trip",
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: normalizeCards(cards),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nagame-trip-${new Date().toISOString().slice(0, 10)}.nagame`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function parsePlanFile(file: File) {
  const raw: unknown = JSON.parse(await file.text());
  const cards = Array.isArray(raw) ? raw : isRecord(raw) ? raw.cards : null;
  if (!Array.isArray(cards)) throw new Error("รูปแบบไฟล์แผนไม่ถูกต้อง");

  const normalized = normalizeCards(cards);
  if (!normalized.length) throw new Error("ไฟล์นี้ยังไม่มีการ์ดทริป");
  return normalized;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("เบราว์เซอร์นี้ยังไม่รองรับ IndexedDB"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("เปิดฐานข้อมูลในเครื่องไม่สำเร็จ"));
  });
}

function readRecord(database: IDBDatabase) {
  return new Promise<StoredPlan | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PLAN_ID);
    request.onsuccess = () => resolve((request.result as StoredPlan | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("อ่านแผนในเครื่องไม่สำเร็จ"));
  });
}

function writeRecord(database: IDBDatabase, record: StoredPlan) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("บันทึกแผนในเครื่องไม่สำเร็จ"));
    transaction.onabort = () => reject(transaction.error ?? new Error("บันทึกแผนถูกยกเลิก"));
  });
}

function readLegacyCards() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return normalizeCards(parsed);
  } catch {
    return [];
  }
}

function normalizeCards(value: unknown): SavedPlanItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = asText(item.id, 120);
    const title = asText(item.title, 180);
    const detail = asText(item.detail, 400);
    const kind = CARD_KINDS.includes(item.kind as Card["kind"]) ? (item.kind as Card["kind"]) : null;
    if (!id || !title || !detail || !kind) return [];

    const now = Date.now();
    const status = CARD_STATUSES.includes(item.status as PlanCardStatus) ? (item.status as PlanCardStatus) : "saved";
    const createdAt = asTimestamp(item.createdAt) ?? now;
    const updatedAt = asTimestamp(item.updatedAt) ?? createdAt;

    return [{ id, title, kind, detail, status, createdAt, updatedAt }];
  });
}

function asText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function asTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
