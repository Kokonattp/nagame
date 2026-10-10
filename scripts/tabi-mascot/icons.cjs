// Favicons / app icons from Tabi's face render (public/tabi/tabi-idle-face.png):
// Tabi on a sakura circle. Writes public/tabi/icon-{32,192,512}.png,
// public/tabi/apple-touch-icon.png (opaque, 180) and app/favicon.ico (16+32, PNG-in-ICO).
// Run after render.cjs: node scripts/tabi-mascot/icons.cjs
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const face = fs.readFileSync(path.resolve(__dirname, "../../public/tabi/tabi-idle-face.png")).toString("base64");
const outDir = path.resolve(__dirname, "../../public/tabi");

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setContent("<canvas></canvas>");
  const draw = (size, opaque) => page.evaluate(async (src, size, opaque) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.querySelector("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.clearRect(0, 0, size, size);
    if (opaque) { g.fillStyle = "#f7fbff"; g.fillRect(0, 0, size, size); }
    g.fillStyle = "#ffe0ec"; // sakura circle
    g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip();
    const s = size * 1.18; // crop in a little so the face fills small favicons
    g.imageSmoothingQuality = "high";
    g.drawImage(img, (size - s) / 2, (size - s) / 2 + size * 0.06, s, s);
    g.restore();
    return c.toDataURL("image/png").split(",")[1];
  }, `data:image/png;base64,${face}`, size, opaque);

  const png = {};
  for (const [name, size, opaque] of [["icon-16", 16, false], ["icon-32", 32, false], ["icon-192", 192, false], ["icon-512", 512, false], ["apple-touch-icon", 180, true]]) {
    png[name] = Buffer.from(await draw(size, opaque), "base64");
    if (name !== "icon-16") fs.writeFileSync(path.join(outDir, `${name}.png`), png[name]);
  }
  await browser.close();

  // ICO container holding the 16 and 32 px PNGs (supported by every current browser)
  const images = [[16, png["icon-16"]], [32, png["icon-32"]]];
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(([size, data], i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size, e); header.writeUInt8(size, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  fs.writeFileSync(path.resolve(__dirname, "../../app/favicon.ico"), Buffer.concat([header, ...images.map(([, d]) => d)]));
  console.log("wrote public/tabi/icon-{32,192,512}.png, apple-touch-icon.png, app/favicon.ico");
})().catch((e) => { console.error(e); process.exit(1); });
