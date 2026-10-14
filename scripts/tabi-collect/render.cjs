// Render Tabi's collectibles (scene.html) to WebP in public/tabi/collect/.
// Run: node scripts/tabi-collect/render.cjs [id-or-city …]   (needs Chrome + network for the three.js CDN)
const path = require("node:path");
const fs = require("node:fs");
const puppeteer = require("puppeteer-core");
const sharp = require("sharp");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const scene = "file:///" + path.resolve(__dirname, "scene.html").replaceAll("\\", "/");
const outDir = path.resolve(__dirname, "../../public/tabi/collect");
const designs = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/collect/designs.json"), "utf8"));
const only = process.argv.slice(2);
// lettering fonts (SIL Open Font License, Google Fonts repo) — fetched once, not committed
const FONTS = { "YujiSyuku-Regular.ttf": "yujisyuku", "ShipporiMincho-ExtraBold.ttf": "shipporimincho" };
async function fonts() {
  const dir = path.resolve(__dirname, "fonts");
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, family] of Object.entries(FONTS)) {
    if (fs.existsSync(path.join(dir, file))) continue;
    const res = await fetch(`https://github.com/google/fonts/raw/main/ofl/${family}/${file}`);
    if (!res.ok) throw new Error(`font ${file}: HTTP ${res.status}`);
    fs.writeFileSync(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
  }
}

const jobs = [
  ...designs.omamori.map((d) => ({ kind: "omamori", name: `omamori-${d.id}`, key: d.id, d, w: 400, h: 560 })),
  ...designs.manholes.map((d) => ({ kind: "manhole", name: `manhole-${d.city.toLowerCase()}`, key: d.city, d, w: 560, h: 560 })),
].filter((j) => !only.length || only.includes(j.key));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  await fonts();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files"] });
  for (const j of jobs) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error(j.name, "scene error:", e.message));
    await page.setViewport({ width: j.w, height: j.h });
    await page.evaluateOnNewDocument((d) => { window.__design = d; }, j.d);
    await page.goto(`${scene}?kind=${j.kind}&w=${j.w}&h=${j.h}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForFunction("window.__done === true", { timeout: 180000 });
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    const file = path.join(outDir, `${j.name}.webp`);
    await sharp(png).webp({ quality: 86, alphaQuality: 100 }).toFile(file);
    console.log("wrote", path.relative(process.cwd(), file));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
