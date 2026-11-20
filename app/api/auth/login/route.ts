import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, oauthConfigured, redirectUri } from "@/lib/auth";
import { SCOPES } from "@/lib/pinterest";

export async function GET(req: NextRequest) {
  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL("/?error=oauth_not_configured", req.url));
  }
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://www.pinterest.com/oauth/");
  url.search = new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("pin_state", state, { ...cookieOptions, maxAge: 600 });
  return res;
}

