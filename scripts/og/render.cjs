// Render scripts/og/og.html → app/opengraph-image.png (Next serves it as the home share image).
// Run: node scripts/og/render.cjs   (needs Chrome + network for the Prompt web font)
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const page = "file:///" + path.resolve(__dirname, "og.html").replaceAll("\\", "/");
const out = path.resolve(__dirname, "../../app/opengraph-image.png");

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1200, height: 630 });
  await tab.goto(page, { waitUntil: "networkidle0" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log("wrote", path.relative(process.cwd(), out));
})().catch((e) => { console.error(e); process.exit(1); });
