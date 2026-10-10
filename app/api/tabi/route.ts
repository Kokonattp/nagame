import { NextRequest, NextResponse } from "next/server";
import { restoreRoute, restoreStops } from "@/lib/tabi/planner";
import { respond } from "@/lib/tabi/respond";
import { PREFERENCES, type Preference, type TabiContext } from "@/lib/tabi/types";

// Same cost guards as /api/assistant: short prompts, per-IP budget.
// Replies depend on the client's trip context, so nothing is cached.
const MAX_MESSAGE_CHARS = 300;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 12;
const rateBuckets = new Map<string, number[]>();

export const dynamic = "force-dynamic";

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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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
  if (c.intent && typeof c.intent === "object") {
    const i = c.intent as Record<string, unknown>;
    ctx.intent = {
      month: Number.isInteger(i.month) && (i.month as number) >= 1 && (i.month as number) <= 12 ? (i.month as number) : undefined,
      durationDays: Number.isInteger(i.durationDays) && (i.durationDays as number) >= 1 && (i.durationDays as number) <= 21 ? (i.durationDays as number) : undefined,
      startDate: validDate(i.startDate),
      preferences: Array.isArray(i.preferences)
        ? [...new Set(i.preferences.filter((p): p is Preference => PREFERENCES.includes(p as Preference)))]
        : [],
      focus: Array.isArray(i.focus) ? i.focus.filter((f): f is string => typeof f === "string").slice(0, 5).map((f) => f.slice(0, 40)) : [],
    };
  }
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

/** "YYYY-MM-DD" that is a real calendar date within the next ~2 years, else undefined. */
function validDate(v: unknown): string | undefined {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return undefined;
  const days = (d.getTime() - Date.now()) / 86_400_000;
  return days > -2 && days < 800 ? v : undefined;
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
