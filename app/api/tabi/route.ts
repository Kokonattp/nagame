import { NextRequest, NextResponse } from "next/server";
import { restoreRoute, restoreStops } from "@/lib/tabi/planner";
import { respond } from "@/lib/tabi/respond";
import { sanitizeIntent } from "@/lib/tabi/sanitize";
import type { TabiContext } from "@/lib/tabi/types";

// Same cost guards as /api/assistant: short prompts, per-IP budget.
// Replies depend on the client's trip context, so nothing is cached.
const MAX_MESSAGE_CHARS = 300;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 12;
const rateBuckets = new Map<string, number[]>();

export const dynamic = "force-dynamic";
// a "🔎 เช็กสด: …" look-up waits for the live-search worker (≤ 50 s)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { message?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ส่งข้อมูลมาไม่ถูกรูปแบบ" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "พิมพ์สิ่งที่อยากเที่ยวก่อนนะ" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `ข้อความยาวเกินไป (ไม่เกิน ${MAX_MESSAGE_CHARS} ตัวอักษร)` }, { status: 400 });
  }

  // Vercel sets x-real-ip / x-forwarded-for itself (client-sent values are overwritten)
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!takeBudget(ip)) {
    return NextResponse.json({ error: "คุยถี่ไปนิด รอสักครู่แล้วลองใหม่นะ" }, { status: 429 });
  }

  try {
    const reply = await respond(message, sanitizeContext(body.context));
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[api/tabi] respond failed", err);
    return NextResponse.json({ error: "ทาบิสะดุดนิดหน่อย ลองส่งใหม่อีกครั้งนะ ถ้ายังไม่ได้ ลองเริ่มทริปใหม่จากหน้าแรก" }, { status: 500 });
  }
}

// The client owns trip state, but nothing it sends is trusted: routes and stops are
// rebuilt from server data (place store + base cities); unknown ids are dropped and
// nights are clamped, so a crafted context can neither crash nor stall the planner.
function sanitizeContext(raw: unknown): TabiContext {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  const ctx: TabiContext = {};
  if (c.intent && typeof c.intent === "object") ctx.intent = sanitizeIntent(c.intent);
  if (Array.isArray(c.shownRoutes)) {
    ctx.shownRoutes = c.shownRoutes
      .filter((r): r is { id: string; title: string } => !!r && typeof r === "object" && typeof (r as { id: unknown }).id === "string" && typeof (r as { title: unknown }).title === "string")
      .slice(0, 3)
      .map((r) => ({ id: r.id.slice(0, 120), title: r.title.slice(0, 120) }));
  }
  const route = restoreRoute(c.selectedRoute, ctx.intent);
  if (route) ctx.selectedRoute = route;
  ctx.savedStops = restoreStops(c.savedStopIds, ctx.intent);
  return ctx;
}

function takeBudget(ip: string) {
  if (rateBuckets.size > 5000) rateBuckets.clear();
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX_CALLS) {
    rateBuckets.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return true;
}
