import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, TOKEN_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "Token is empty." }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, token, cookieOptions);
  return res;
}

