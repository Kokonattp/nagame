// Trip card image for LINE/Facebook (1080×1350, the portrait size both show in full).
// Drawn on a canvas in the browser: no server, no extra library. Photos that refuse CORS are
// skipped (a tainted canvas could not be exported), so the card always renders.

import type { SavedTrip } from "@/lib/tabi/store";

const W = 1080;
const H = 1350;
const DAY_COLORS = ["#22b07d", "#ff9e45", "#2d7ff9", "#ff5c9d", "#a66cff"];
const MONTH_SHORT = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    setTimeout(() => resolve(null), 6000);
  });
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** PNG File of the trip, or null if the browser cannot draw it. */
export async function renderShareImage(trip: SavedTrip): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx || !trip.route || !trip.itinerary) return null;
  await document.fonts?.ready;
  // the page's Prompt heading font (next/font gives it a generated family name)
  const titleEl = document.querySelector(".tabi .tabi-title");
  const font = titleEl ? getComputedStyle(titleEl).fontFamily : "sans-serif";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#dcebff");
  bg.addColorStop(1, "#ffe9f2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#0c1f4a";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("Nagame 眺め", 72, 100);

  // hero photo with the title on it
  const heroY = 140;
  const heroH = 440;
  const hero = trip.route.highlights[0] ? await loadImage(`/api/tabi/image?title=${encodeURIComponent(trip.route.highlights[0].wikiTitle)}`, true) : null;
  ctx.save();
  roundRect(ctx, 72, heroY, W - 144, heroH, 40);
  ctx.clip();
  if (hero) {
    const scale = Math.max((W - 144) / hero.width, heroH / hero.height);
    const w = hero.width * scale;
    const h = hero.height * scale;
    ctx.drawImage(hero, 72 + (W - 144 - w) / 2, heroY + (heroH - h) / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, heroY, W, heroY + heroH);
    g.addColorStop(0, "#2d7ff9");
    g.addColorStop(1, "#ff8fbd");
    ctx.fillStyle = g;
    ctx.fillRect(72, heroY, W - 144, heroH);
  }
  const shade = ctx.createLinearGradient(0, heroY + heroH * 0.35, 0, heroY + heroH);
  shade.addColorStop(0, "rgba(12,31,74,0)");
  shade.addColorStop(1, "rgba(12,31,74,0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(72, heroY, W - 144, heroH);
  ctx.restore();

  const stopsTh = trip.route.stops.map((s) => s.cityTh).join(" → ");
  const days = trip.itinerary.length;
  const start = trip.intent.startDate;
  const when = start
    ? (() => {
        const a = new Date(`${start}T00:00:00Z`);
        const b = new Date(a);
        b.setUTCDate(b.getUTCDate() + days - 1);
        return `${a.getUTCDate()} ${MONTH_SHORT[a.getUTCMonth() + 1]} – ${b.getUTCDate()} ${MONTH_SHORT[b.getUTCMonth() + 1]}`;
      })()
    : trip.intent.month ? `ช่วง ${MONTH_SHORT[trip.intent.month]}` : "";
  ctx.fillStyle = "#fff";
  ctx.font = `700 64px ${font}`;
  ctx.fillText(fit(ctx, stopsTh, W - 220), 110, heroY + heroH - 90);
  ctx.font = `500 36px ${font}`;
  ctx.fillText(`${days} วัน ${days - 1} คืน${when ? ` · ${when}` : ""}`, 110, heroY + heroH - 40);

  // day list
  const rowH = 86;
  const listTop = heroY + heroH + 70;
  const maxRows = Math.floor((H - 210 - listTop) / rowH);
  const shown = trip.itinerary.length > maxRows ? trip.itinerary.slice(0, maxRows - 1) : trip.itinerary;
  shown.forEach((d, i) => {
    const y = listTop + i * rowH;
    ctx.fillStyle = DAY_COLORS[i % DAY_COLORS.length];
    ctx.beginPath();
    ctx.arc(92, y - 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c1f4a";
    ctx.font = `700 34px ${font}`;
    ctx.fillText(`Day ${d.day}`, 124, y);
    const sights = d.items.filter((it) => it.kind === "see").map((it) => it.text).join(" · ");
    ctx.font = `600 34px ${font}`;
    ctx.fillText(fit(ctx, d.title, 560), 270, y);
    ctx.fillStyle = "#5b6b8c";
    ctx.font = `400 26px ${font}`;
    if (sights) ctx.fillText(fit(ctx, sights, 600), 270, y + 34);
  });
  if (shown.length < trip.itinerary.length) {
    ctx.fillStyle = "#5b6b8c";
    ctx.font = `600 30px ${font}`;
    ctx.fillText(`+ อีก ${trip.itinerary.length - shown.length} วัน`, 124, listTop + shown.length * rowH);
  }

  // footer: Tabi + where to get one
  const tabi = await loadImage("/tabi/tabi-happy.png", false);
  if (tabi) ctx.drawImage(tabi, W - 300, H - 330, 280, 280);
  ctx.fillStyle = "#c2185b";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("วางทริปญี่ปุ่นกับทาบิ", 72, H - 110);
  ctx.fillStyle = "#0c1f4a";
  ctx.font = `500 32px ${font}`;
  ctx.fillText("nagame.vercel.app", 72, H - 62);

  const blob = await new Promise<Blob | null>((r) => {
    try { canvas.toBlob(r, "image/png"); } catch { r(null); }
  });
  return blob ? new File([blob], "tabi-trip.png", { type: "image/png" }) : null;
}
