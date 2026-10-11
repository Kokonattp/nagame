import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth, authEnabled, authProviders, currentUserId } from "@/auth";
import { isSupabaseConfigured } from "@/lib/db/supabase";

// Who is signed in (name + picture only), which sign-in buttons to show, and whether trips sync.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!authEnabled) return NextResponse.json({ enabled: false, providers: [], user: null, account: null, sync: false });
  const id = await currentUserId();
  const session = id ? await auth() : null;
  return NextResponse.json({
    enabled: true,
    providers: authProviders,
    user: id ? { name: session?.user?.name ?? null, image: session?.user?.image ?? null, via: id.split(":")[0] } : null,
    // tags this account's trips in the browser; a hash, so the raw LINE/Google id never reaches the page
    account: id ? createHash("sha256").update(`${process.env.AUTH_SECRET}:${id}`).digest("hex").slice(0, 24) : null,
    sync: Boolean(id) && isSupabaseConfigured(),
  });
}
