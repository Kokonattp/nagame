import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { TABI_EVENTS, type TabiEvent } from "@/lib/tabi/track";

// POST /api/tabi/event — anonymous funnel events into Supabase `tabi_events` (supabase/schema.sql).
// No Supabase env → accepted and dropped (dual-mode, like /api/outbound). Only whitelisted
// event names and prop keys are stored; values are short primitives. IP is used for the
// in-memory rate limit only and is never stored.

const PROP_KEYS = new Set(["month", "days", "stops", "route", "source", "method", "step", "first", "refine", "ref"]);
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const buckets = new Map<string, number[]>();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(ip)) return new NextResponse(null, { status: 204 });

  let body: { event?: unknown; props?: unknown; sid?: unknown; path?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof body.event !== "string" || !TABI_EVENTS.includes(body.event as TabiEvent)) return new NextResponse(null, { status: 400 });
  const sid = typeof body.sid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.sid) ? body.sid : null;
  if (!sid) return new NextResponse(null, { status: 400 });

  const props: Record<string, string | number | boolean> = {};
  if (body.props && typeof body.props === "object") {
    for (const [k, v] of Object.entries(body.props as Record<string, unknown>)) {
      if (!PROP_KEYS.has(k)) continue;
      if (typeof v === "number" && Number.isFinite(v)) props[k] = v;
      else if (typeof v === "boolean") props[k] = v;
      else if (typeof v === "string") props[k] = v.slice(0, 80);
    }
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 40) : null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("tabi_events").insert({ session_id: sid, event: body.event, props, path });
      if (error) console.error("[api/tabi/event] insert failed", error.message);
    } catch (err) {
      console.error("[api/tabi/event] insert threw", err);
    }
  }
  return new NextResponse(null, { status: 204 });
}

function allow(ip: string) {
  if (buckets.size > 5000) buckets.clear();
  const now = Date.now();
  const b = (buckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (b.length >= RATE_MAX) { buckets.set(ip, b); return false; }
  b.push(now);
  buckets.set(ip, b);
  return true;
}
