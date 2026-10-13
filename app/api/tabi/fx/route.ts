import { NextResponse } from "next/server";

// /api/tabi/fx → today's JPY→THB reference rate (European Central Bank, via frankfurter.dev — free, no key),
// so the trip budget can show baht. Cached 12 h. A failed lookup returns { rate: null } and the
// budget stays in yen, never a guessed rate.

export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=JPY&symbols=THB", { signal: AbortSignal.timeout(4000), next: { revalidate: 43_200 } });
    const d = (await res.json()) as { date?: string; rates?: { THB?: number } };
    const rate = d.rates?.THB;
    if (!res.ok || !rate || rate <= 0) throw new Error("no rate");
    return NextResponse.json({ rate, date: d.date }, { headers: { "Cache-Control": "public, max-age=43200" } });
  } catch {
    return NextResponse.json({ rate: null });
  }
}
