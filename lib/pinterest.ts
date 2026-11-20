import { dedupeById } from "./shuffle";
import type { Pin, PinsResponse } from "./types";

export const API_BASE = process.env.PINTEREST_API_BASE ?? "https://api.pinterest.com/v5";
export const SCOPES = ["boards:read", "pins:read", "boards:read_secret", "pins:read_secret"];

export class PinterestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Page<T> = { items: T[]; bookmark?: string | null };
type RawBoard = { id: string; name: string };
type RawPin = {
  id: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  media?: {
    images?: Record<string, { url: string; width: number; height: number }> | null;
  } | null;
};

async function api<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const url = `${API_BASE}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) || 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 30) * 1000));
      continue;
    }
    if (!res.ok) {
      let detail = "";
      try {
        detail = ((await res.json()) as { message?: string }).message ?? "";
      } catch {}
      throw new PinterestError(
        res.status === 401
          ? "Pinterest rejected the access token (expired or invalid)."
          : `Pinterest API error ${res.status}${detail ? `: ${detail}` : ""}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  }
}

async function paginate<T>(token: string, path: string, params: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  let bookmark: string | undefined;
  do {
    const page = await api<Page<T>>(token, path, {
      page_size: "250",
      ...params,
      ...(bookmark ? { bookmark } : {}),
    });
    all.push(...(page.items ?? []));
    bookmark = page.bookmark || undefined;
  } while (bookmark);
  return all;
}

async function listBoards(token: string): Promise<RawBoard[]> {
  try {
    return await paginate<RawBoard>(token, "/boards", { privacy: "ALL" });
  } catch (e) {
    // Token without secret scopes: fall back to public boards only.
    if (e instanceof PinterestError && (e.status === 403 || e.status === 400)) {
      return paginate<RawBoard>(token, "/boards", {});
    }
    throw e;
  }
}

function toPin(raw: RawPin, board: string): Pin | null {
  const images = raw.media?.images;
  const img = images?.["600x"] ?? images?.["400x300"] ?? images?.["1200x"] ?? Object.values(images ?? {})[0];
  if (!img) return null;
  return {
    id: String(raw.id),
    title: raw.title || raw.alt_text || raw.description || "",
    image: img.url,
    width: img.width,
    height: img.height,
    url: `https://www.pinterest.com/pin/${raw.id}/`,
    board,
  };
}

export async function fetchAllPins(token: string): Promise<PinsResponse> {
  const boards = await listBoards(token);
  const all: Pin[] = [];
  let next = 0;
  const worker = async () => {
    while (next < boards.length) {
      const board = boards[next++];
      const raw = await paginate<RawPin>(token, `/boards/${board.id}/pins`, {});
      for (const r of raw) {
        const pin = toPin(r, board.name);
        if (pin) all.push(pin);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, boards.length) }, worker));
  return { source: "pinterest", boards: boards.length, pins: dedupeById(all) };
}

