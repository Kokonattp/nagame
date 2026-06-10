// โหลด Noto Serif JP แบบ subset เฉพาะตัวอักษรที่ใช้ในภาพ (ไฟล์เล็กระดับ KB)
// ใช้ User-Agent โบราณเพื่อให้ Google Fonts ส่ง TTF ซึ่ง satori รองรับ (ไม่รองรับ woff2)
export async function loadNotoSerifJP(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssResponse = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&text=${encodeURIComponent(text)}`,
      {
        headers: { "User-Agent": "Mozilla/4.0" },
        next: { revalidate: 86400 },
      },
    );
    if (!cssResponse.ok) return null;

    const css = await cssResponse.text();
    const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
    if (!fontUrl) return null;

    const fontResponse = await fetch(fontUrl, { next: { revalidate: 86400 } });
    if (!fontResponse.ok) return null;
    return await fontResponse.arrayBuffer();
  } catch {
    return null;
  }
}
