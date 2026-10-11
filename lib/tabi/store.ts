"use client";

// Local-first trip storage (IndexedDB), separate from the older plan-card store.
// Persists only what spec §8 allows: intent, chosen route, saved stops, itinerary,
// checklist, last few turns. Rejected options and raw results are never stored.

import type { Highlight, ItineraryDay, RouteOption, TripIntent } from "./types";

export type SavedTrip = {
  id: string;
  title: string;
  status: "exploring" | "draft" | "planned";
  createdAt: string;
  updatedAt: string;
  intent: TripIntent;
  route?: RouteOption;
  savedStops: Highlight[];
  itinerary?: ItineraryDay[];
  checklist: { id: string; text: string; done: boolean }[];
  recentTurns: { role: "user" | "tabi"; text: string }[];
  /** account the trip belongs to (opaque hash from /api/tabi/me); absent = made while signed out */
  owner?: string;
};

const DB = "nagame-tabi";
const STORE = "trips";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function listTrips(): Promise<SavedTrip[]> {
  const db = await open();
  if (!db) return [];
  return new Promise((resolve) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as SavedTrip[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    req.onerror = () => resolve([]);
  });
}

/**
 * Saves a trip and returns the stored copy (with its new `updatedAt`), or null when storage is
 * unavailable. `keepTimestamp` is for copies downloaded from the account: their time must stay
 * the server's, or sync would treat an untouched download as a newer local edit.
 */
export async function saveTrip(trip: SavedTrip, opts: { keepTimestamp?: boolean } = {}): Promise<SavedTrip | null> {
  const db = await open();
  if (!db) return null;
  const stored = { ...trip, recentTurns: trip.recentTurns.slice(-6), updatedAt: opts.keepTimestamp ? trip.updatedAt : new Date().toISOString() };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(stored);
    tx.oncomplete = () => resolve(stored);
    tx.onerror = () => resolve(null);
  });
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await open();
  if (!db) return;
  db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
}

export function newTrip(intent: TripIntent): SavedTrip {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "ทริปญี่ปุ่น",
    status: "exploring",
    createdAt: now,
    updatedAt: now,
    intent,
    savedStops: [],
    checklist: [
      { id: "passport", text: "พาสปอร์ตยังไม่หมดอายุตลอดทริป", done: false },
      { id: "flight", text: "จองตั๋วเครื่องบิน", done: false },
      { id: "stay", text: "จองที่พักทุกคืน", done: false },
      { id: "vjw", text: "กรอก Visit Japan Web (ช่วยให้ผ่าน ตม. เร็วขึ้น)", done: false },
    ],
    recentTurns: [],
  };
}
