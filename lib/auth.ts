import { cookies } from "next/headers";

export const TOKEN_COOKIE = "pin_token";

export const oauthConfigured = () =>
  Boolean(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET);

export const redirectUri = () =>
  process.env.PINTEREST_REDIRECT_URI ?? "http://localhost:4821/api/auth/callback";

export async function getToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(TOKEN_COOKIE)?.value || process.env.PINTEREST_ACCESS_TOKEN || undefined;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

