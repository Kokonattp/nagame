import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { PREFECTURES } from "@/lib/tabi/cities";

// Thai quake/tsunami push alerts (docs/quake-alerts.md): a browser registers where its trip goes and
// when; workers/quake-alert reads the table and sends. Off until Supabase and VAPID keys are set.
//   GET    → { enabled, publicKey }
//   POST   { endpoint, keys: { p256dh, auth }, tripId, prefectures, jma, startsOn, endsOn } → upsert
//   DELETE { endpoint, tripId } → stop alerts for that trip on this browser
export const dynamic = "force-dynamic";

const publicKey = () => process.env.VAPID_PUBLIC_KEY ?? "";
const PREFS = new Set(PREFECTURES);
// the worker posts to whatever is stored here, so only real browser push services are accepted
const PUSH_HOST = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[A-Za-z0-9_-]{16,200}={0,2}$/;

/** Towns for weather 警報: [{ office: "260000", areas: ["2610000"], th: "เกียวโต" }] — anything malformed is dropped. */
function jmaOf(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 12).flatMap((w) => {
    const { office, areas, th } = (w ?? {}) as Record<string, unknown>;
    if (typeof office !== "string" || !/^\d{6}$/.test(office) || typeof th !== "string" || !th || th.length > 40 || !Array.isArray(areas)) return [];
    const codes = areas.filter((a): a is string => typeof a === "string" && /^\d{7}$/.test(a)).slice(0, 5);
    return codes.length ? [{ office, areas: codes, th }] : [];
  });
}

function pushEndpoint(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 1000) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && PUSH_HOST.test(u.hostname) ? v : null;
  } catch {
    return null;
  }
}
const tripIdOf = (v: unknown) => (typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : null);

const db = () => (publicKey() ? getSupabase() : null);

export async function GET() {
  return NextResponse.json({ enabled: Boolean(db()), publicKey: db() ? publicKey() : null });
}

export async function POST(request: NextRequest) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const keys = (body?.keys ?? {}) as Record<string, unknown>;
  const endpoint = pushEndpoint(body?.endpoint);
  const tripId = tripIdOf(body?.tripId);
  const prefectures = Array.isArray(body?.prefectures) ? [...new Set(body.prefectures.filter((p): p is string => typeof p === "string" && PREFS.has(p)))] : [];
  const startsOn = typeof body?.startsOn === "string" && ISO.test(body.startsOn) ? body.startsOn : null;
  const endsOn = typeof body?.endsOn === "string" && ISO.test(body.endsOn) ? body.endsOn : null;
  const spanDays = startsOn && endsOn ? (Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000 : -1;
  if (
    !endpoint || !tripId || !prefectures.length || prefectures.length > 20 || !startsOn || !endsOn ||
    spanDays < 0 || spanDays > 60 || typeof keys.p256dh !== "string" || !KEY.test(keys.p256dh) ||
    typeof keys.auth !== "string" || !KEY.test(keys.auth)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint, trip_id: tripId, p256dh: keys.p256dh, auth: keys.auth, prefectures, jma: jmaOf(body?.jma),
    starts_on: startsOn, ends_on: endsOn, updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "store" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const endpoint = pushEndpoint(body?.endpoint);
  const tripId = tripIdOf(body?.tripId);
  if (!endpoint || !tripId) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("trip_id", tripId);
  if (error) return NextResponse.json({ error: "store" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
