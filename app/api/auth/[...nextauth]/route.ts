import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, handlers } from "@/auth";

// Auth.js endpoints (sign-in, callback, sign-out). 404 until sign-in is configured (see auth.ts).
const off = () => new NextResponse(null, { status: 404 });

export async function GET(request: NextRequest) {
  return authEnabled ? handlers.GET(request) : off();
}

export async function POST(request: NextRequest) {
  return authEnabled ? handlers.POST(request) : off();
}
