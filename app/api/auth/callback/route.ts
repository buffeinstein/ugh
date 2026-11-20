import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, redirectUri, TOKEN_COOKIE } from "@/lib/auth";
import { API_BASE } from "@/lib/pinterest";

export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/?error=${code}`, req.url));
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  if (params.get("error") || !code) return fail("oauth_denied");
  if (!params.get("state") || params.get("state") !== req.cookies.get("pin_state")?.value) {
    return fail("oauth_state");
  }

  const basic = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`,
  ).toString("base64");
  const tokenRes = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  }).catch(() => null);
  if (!tokenRes?.ok) return fail("oauth_exchange");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return fail("oauth_exchange");

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(TOKEN_COOKIE, access_token, cookieOptions);
  res.cookies.delete("pin_state");
  return res;
}

