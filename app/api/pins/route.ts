import { NextRequest, NextResponse } from "next/server";
import { getToken, oauthConfigured } from "@/lib/auth";
import { mockPins } from "@/lib/mock";
import { fetchAllPins, PinterestError } from "@/lib/pinterest";

export async function GET(req: NextRequest) {
  const token = await getToken();
  const wantsMock = req.nextUrl.searchParams.get("mock") === "1";

  if (wantsMock || (!token && !oauthConfigured())) {
    return NextResponse.json(mockPins());
  }
  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  try {
    return NextResponse.json(await fetchAllPins(token));
  } catch (e) {
    if (e instanceof PinterestError) {
      return NextResponse.json({ error: e.message }, { status: e.status === 401 ? 401 : 502 });
    }
    return NextResponse.json({ error: "Could not reach Pinterest." }, { status: 502 });
  }
}

