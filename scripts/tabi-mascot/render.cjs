// Render the three.js Tabi mascot (scene.html) to transparent PNGs in public/tabi/.
// Run: node scripts/tabi-mascot/render.cjs   (needs Chrome + network for the three.js CDN)
//      add --sprites-only to re-render just the animated strips
const path = require("node:path");
const fs = require("node:fs");
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const scene = "file:///" + path.resolve(__dirname, "scene.html").replaceAll("\\", "/");
const outDir = path.resolve(__dirname, "../../public/tabi");

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  page.on("pageerror", (e) => console.error("scene error:", e.message));
  const stills = process.argv.includes("--sprites-only") ? [] : [["body", ""], ["face", "-face"]];
  for (const [frame, suffix] of stills) for (const mood of ["idle", "happy", "worried"]) {
    await page.goto(`${scene}?mood=${mood}&frame=${frame}`, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__done === true", { timeout: 30000 });
    const file = path.join(outDir, `tabi-${mood}${suffix}.png`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
    console.log("wrote", path.relative(process.cwd(), file));
  }
  // animated face sprites: 12 frames × 256 px, played with CSS steps(12)
  await page.setViewport({ width: 256, height: 256 });
  for (const mood of ["idle", "happy", "worried"]) {
    await page.goto(`${scene}?mood=${mood}&frame=face&sprite=12&size=256`, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__done === true", { timeout: 60000 });
    const data = await page.evaluate(() => window.__sprite);
    const file = path.join(outDir, `tabi-${mood}-sprite.png`);
    fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
    console.log("wrote", path.relative(process.cwd(), file));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
