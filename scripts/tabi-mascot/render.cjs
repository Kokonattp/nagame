// Render the three.js Tabi mascot (scene.html) to transparent PNGs in public/tabi/.
// Run: node scripts/tabi-mascot/render.cjs   (needs Chrome + network for the three.js CDN)
//      add --sprites-only to re-render just the animated strips
const path = require("node:path");
const fs = require("node:fs");
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const scene = "file:///" + path.resolve(__dirname, "scene.html").replaceAll("\\", "/");
const outDir = path.resolve(__dirname, "../../public/tabi");
// vinyl toy look (soft-touch, studio light); pass --toon for the original outlined anime style
const STYLE = process.argv.includes("--toon") ? "" : "&style=vinyl";

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  page.on("pageerror", (e) => console.error("scene error:", e.message));
  const stills = process.argv.includes("--sprites-only") ? [] : [["body", ""], ["face", "-face"]];
  for (const [frame, suffix] of stills) for (const mood of ["idle", "happy", "worried"]) {
    await page.goto(`${scene}?mood=${mood}&frame=${frame}${STYLE}`, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__done === true", { timeout: 30000 });
    const file = path.join(outDir, `tabi-${mood}${suffix}.png`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
    console.log("wrote", path.relative(process.cwd(), file));
  }
  // animated face sprites: 12 frames × 256 px (WebP, alpha kept), played with CSS steps(12)
  await page.setViewport({ width: 256, height: 256 });
  for (const mood of ["idle", "happy", "worried"]) {
    await page.goto(`${scene}?mood=${mood}&frame=face&sprite=12&size=256${STYLE}`, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__done === true", { timeout: 60000 });
    const data = await page.evaluate(() => window.__sprite);
    const file = path.join(outDir, `tabi-${mood}-sprite.webp`);
    await require("sharp")(Buffer.from(data.split(",")[1], "base64")).webp({ quality: 88, alphaQuality: 100 }).toFile(file);
    console.log("wrote", path.relative(process.cwd(), file));
  }
  // full-body dance loop for the home hero: 16 frames × 320 px, saved as WebP (alpha kept)
  await page.setViewport({ width: 320, height: 320 });
  await page.goto(`${scene}?mood=happy&frame=body&dance&sprite=16&size=320${STYLE}`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__done === true", { timeout: 90000 });
  const dance = await page.evaluate(() => window.__sprite);
  const danceFile = path.join(outDir, "tabi-dance-sprite.webp");
  await require("sharp")(Buffer.from(dance.split(",")[1], "base64")).webp({ quality: 88, alphaQuality: 100 }).toFile(danceFile);
  console.log("wrote", path.relative(process.cwd(), danceFile));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
