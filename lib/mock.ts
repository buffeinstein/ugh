import { dedupeById } from "./shuffle";
import type { Pin, PinsResponse } from "./types";

const BOARDS = ["Kitchen ideas", "Travel", "Garden", "Reading nook", "Outfits", "Secret: gift ideas"];

function svg(n: number, w: number, h: number) {
  const hue = (n * 47) % 360;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,70%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},70%,45%)"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<text x="50%" y="50%" fill="white" font-family="sans-serif" font-size="${Math.round(w / 6)}" text-anchor="middle" dominant-baseline="middle">#${n}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(body)}`;
}

/** Sample pool: 6 boards, some pins appear on two boards so dedupe is exercised. */
export function mockPins(): PinsResponse {
  const all: Pin[] = [];
  for (let b = 0; b < BOARDS.length; b++) {
    for (let i = 0; i < 45; i++) {
      const n = b * 40 + i;
      const h = 320 + ((n * 37) % 5) * 60;
      all.push({
        id: `mock-${n}`,
        title: `Sample pin ${n}`,
        image: svg(n, 400, h),
        width: 400,
        height: h,
        url: `https://www.pinterest.com/pin/mock-${n}/`,
        board: BOARDS[b],
      });
    }
  }
  return { source: "mock", boards: BOARDS.length, pins: dedupeById(all) };
}

