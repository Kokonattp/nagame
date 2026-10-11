"use client";

// Keeps the browser's trips and the signed-in account in step (only when sign-in and the
// database are both switched on — see /api/tabi/me). Local-first: the browser copy is written
// first, the server copy follows; on conflicts the newer `updatedAt` wins.
//
// Each trip carries `owner` (an opaque account hash). A shared browser therefore never uploads
// one person's trips into another person's account: only trips owned by this account, or made
// while signed out on this browser, are uploaded. "Delete everything" leaves a server-side
// reset time, so other devices drop their older copies instead of uploading them again.

import { deleteTrip, listTrips, saveTrip, type SavedTrip } from "./store";

export type Me = {
  enabled: boolean;
  providers: string[];
  user: { name: string | null; image: string | null; via: string } | null;
  /** opaque hash of the signed-in account (never the raw LINE/Google id) */
  account: string | null;
  sync: boolean;
};

export async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch("/api/tabi/me", { cache: "no-store" });
    if (res.ok) return (await res.json()) as Me;
  } catch { /* offline: treat as signed out */ }
  return { enabled: false, providers: [], user: null, account: null, sync: false };
}

/** Trips this account may see on this browser: its own, plus ones made while signed out. */
export const visibleTo = (account: string | null) => (t: SavedTrip) => !t.owner || t.owner === account;

/** After sign-in: download the account's trips, keep the newer copy of each, upload what only this browser has. */
export async function pullAndMerge(account: string): Promise<SavedTrip[]> {
  const local = await listTrips();
  let remote: SavedTrip[] = [];
  let resetAt = "";
  try {
    const res = await fetch("/api/tabi/trips", { cache: "no-store" });
    if (!res.ok) return local.filter(visibleTo(account));
    const body = (await res.json()) as { trips?: SavedTrip[]; resetAt?: string | null };
    remote = body.trips ?? [];
    resetAt = body.resetAt ?? "";
  } catch {
    return local.filter(visibleTo(account));
  }
  const byId = new Map(remote.map((t) => [t.id, t]));
  for (const t of remote) {
    const mine = local.find((l) => l.id === t.id);
    if (!mine || mine.updatedAt < t.updatedAt) await saveTrip({ ...t, owner: account }, { keepTimestamp: true });
  }
  for (const t of local) {
    if (t.owner && t.owner !== account) continue; // someone else's trip on a shared browser
    if (byId.has(t.id)) {
      if (byId.get(t.id)!.updatedAt < t.updatedAt) await pushTrip({ ...t, owner: account });
      continue;
    }
    // the account was wiped after this copy was last edited → it was deleted on purpose
    if (t.owner === account && resetAt && t.updatedAt <= resetAt) { await deleteTrip(t.id); continue; }
    const adopted = (await saveTrip({ ...t, owner: account }, { keepTimestamp: true })) ?? t;
    await pushTrip(adopted);
  }
  return (await listTrips()).filter(visibleTo(account));
}

/** Upload one trip. Small bodies use keepalive (survives closing the tab); browsers cap keepalive at 64 KB. */
export async function pushTrip(trip: SavedTrip): Promise<void> {
  const body = JSON.stringify({ trip });
  try {
    await fetch("/api/tabi/trips", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive: new Blob([body]).size < 60_000 }); // bytes: Thai text is 3 bytes per character
  } catch { /* offline: the next sign-in merge uploads it */ }
}

/** Signing out removes this account's trips from the browser (they are safe in the account). */
export async function forgetAccountTrips(account: string): Promise<void> {
  for (const t of await listTrips()) if (t.owner === account) await deleteTrip(t.id);
}

/** Profile → delete everything. Returns whether the account copy was deleted too. */
export async function deleteEverything(account: string | null, serverToo: boolean): Promise<{ ok: boolean; server: boolean }> {
  if (serverToo) {
    try {
      const res = await fetch("/api/tabi/trips", { method: "DELETE" });
      if (!res.ok) return { ok: false, server: false };
    } catch {
      return { ok: false, server: false };
    }
  }
  for (const t of await listTrips()) if (visibleTo(account)(t)) await deleteTrip(t.id);
  return { ok: true, server: serverToo };
}
