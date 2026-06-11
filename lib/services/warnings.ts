import { cached } from "@/lib/utils/cache";

export type WarningLevel = "advisory" | "warning" | "emergency";

export type WarningItem = {
  code: string;
  label: string;
  level: WarningLevel;
};

export type WarningSignal = {
  available: boolean;
  source: string;
  items: WarningItem[];
  headline: string | null;
  office: string | null;
  reportedAt: string | null;
  updatedAt: string;
  message?: string;
};

type JmaWarningFeed = {
  reportDatetime?: string;
  publishingOffice?: string;
  headlineText?: string;
  areaTypes?: {
    areas?: {
      code?: string;
      warnings?: { code?: string; status?: string }[];
    }[];
  }[];
};

// รหัสประกาศของ JMA → ภาษาไทย (เรียงตามความรุนแรง: emergency > warning > advisory)
const WARNING_LABELS: Record<string, { label: string; level: WarningLevel }> = {
  "33": { label: "ฝนตกหนักขั้นวิกฤต", level: "emergency" },
  "32": { label: "พายุหิมะขั้นวิกฤต", level: "emergency" },
  "35": { label: "พายุลมแรงขั้นวิกฤต", level: "emergency" },
  "36": { label: "หิมะตกหนักขั้นวิกฤต", level: "emergency" },
  "37": { label: "คลื่นสูงขั้นวิกฤต", level: "emergency" },
  "38": { label: "น้ำทะเลหนุนขั้นวิกฤต", level: "emergency" },
  "02": { label: "พายุหิมะ", level: "warning" },
  "03": { label: "ฝนตกหนัก", level: "warning" },
  "04": { label: "น้ำท่วม", level: "warning" },
  "05": { label: "พายุลมแรง", level: "warning" },
  "06": { label: "หิมะตกหนัก", level: "warning" },
  "07": { label: "คลื่นสูง", level: "warning" },
  "08": { label: "น้ำทะเลหนุน", level: "warning" },
  "10": { label: "ฝนตกหนัก", level: "advisory" },
  "12": { label: "หิมะตกหนัก", level: "advisory" },
  "13": { label: "ลมแรงและหิมะ", level: "advisory" },
  "14": { label: "ฟ้าคะนอง ฟ้าผ่า", level: "advisory" },
  "15": { label: "ลมแรง", level: "advisory" },
  "16": { label: "คลื่นสูง", level: "advisory" },
  "17": { label: "หิมะละลาย", level: "advisory" },
  "18": { label: "น้ำท่วม", level: "advisory" },
  "19": { label: "น้ำทะเลหนุน", level: "advisory" },
  "20": { label: "หมอกหนา", level: "advisory" },
  "21": { label: "อากาศแห้ง ไฟลุกง่าย", level: "advisory" },
  "22": { label: "หิมะถล่ม", level: "advisory" },
  "23": { label: "อากาศหนาวจัด", level: "advisory" },
  "24": { label: "น้ำค้างแข็ง", level: "advisory" },
  "25": { label: "น้ำแข็งเกาะ", level: "advisory" },
  "26": { label: "หิมะเกาะสะสม", level: "advisory" },
};

// สำนักงานอุตุฯ ของ JMA ต่อจังหวัด (Hokkaido/Kagoshima/Okinawa แยกหลายสำนักงาน — override รายเมืองด้านล่าง)
const PREFECTURE_OFFICES: Record<string, string> = {
  Aomori: "020000",
  Iwate: "030000",
  Miyagi: "040000",
  Akita: "050000",
  Yamagata: "060000",
  Fukushima: "070000",
  Ibaraki: "080000",
  Tochigi: "090000",
  Gunma: "100000",
  Saitama: "110000",
  Chiba: "120000",
  Tokyo: "130000",
  Kanagawa: "140000",
  Niigata: "150000",
  Toyama: "160000",
  Ishikawa: "170000",
  Fukui: "180000",
  Yamanashi: "190000",
  Nagano: "200000",
  Gifu: "210000",
  Shizuoka: "220000",
  Aichi: "230000",
  Mie: "240000",
  Shiga: "250000",
  Kyoto: "260000",
  Osaka: "270000",
  Hyogo: "280000",
  Nara: "290000",
  Wakayama: "300000",
  Tottori: "310000",
  Shimane: "320000",
  Okayama: "330000",
  Hiroshima: "340000",
  Yamaguchi: "350000",
  Tokushima: "360000",
  Kagawa: "370000",
  Ehime: "380000",
  Kochi: "390000",
  Fukuoka: "400000",
  Saga: "410000",
  Nagasaki: "420000",
  Kumamoto: "430000",
  Oita: "440000",
  Miyazaki: "450000",
  Kagoshima: "460100",
  Okinawa: "471000",
};

// เมืองที่จังหวัดเดียวกันแต่อยู่คนละเขตสำนักงานอุตุฯ
const SLUG_OFFICES: Record<string, string> = {
  sapporo: "016000",
  otaru: "016000",
  hakodate: "017000",
  asahikawa: "012000",
  ishigaki: "474000",
};

export async function getWarnings(input: {
  slug?: string;
  prefecture?: string;
}): Promise<WarningSignal> {
  const office =
    (input.slug ? SLUG_OFFICES[input.slug] : undefined) ??
    (input.prefecture ? PREFECTURE_OFFICES[input.prefecture] : undefined);

  if (!office) {
    return {
      available: false,
      source: "JMA",
      items: [],
      headline: null,
      office: null,
      reportedAt: null,
      updatedAt: new Date().toISOString(),
      message: "ยังไม่รองรับประกาศเตือนภัยของพื้นที่นี้",
    };
  }

  return cached(`warnings:${office}`, 60 * 10, async () => {
    const feed = await fetchWarningFeed(office);

    if (!feed) {
      return {
        available: false,
        source: "JMA",
        items: [],
        headline: null,
        office: null,
        reportedAt: null,
        updatedAt: new Date().toISOString(),
        message: "ยังเชื่อมต่อประกาศเตือนภัยจาก JMA ไม่ได้ในตอนนี้",
      };
    }

    // ใช้ areaTypes[0] (ระดับภูมิภาคย่อย) — ละเอียดพอสำหรับนักท่องเที่ยว และไม่ต้อง map รหัสรายเทศบาล
    const regionAreas = feed.areaTypes?.[0]?.areas ?? [];
    const seen = new Set<string>();
    const items: WarningItem[] = [];

    for (const area of regionAreas) {
      for (const warning of area.warnings ?? []) {
        const code = warning.code;
        if (!code || seen.has(code)) continue;
        if (warning.status === "解除") continue; // ประกาศที่ยกเลิกแล้ว
        const known = WARNING_LABELS[code];
        if (!known) continue;
        seen.add(code);
        items.push({ code, ...known });
      }
    }

    const levelOrder: Record<WarningLevel, number> = { emergency: 0, warning: 1, advisory: 2 };
    items.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    return {
      available: true,
      source: "JMA (กรมอุตุนิยมวิทยาญี่ปุ่น)",
      items,
      headline: feed.headlineText?.trim() || null,
      office: feed.publishingOffice ?? null,
      reportedAt: feed.reportDatetime ?? null,
      updatedAt: new Date().toISOString(),
    };
  });
}

async function fetchWarningFeed(office: string): Promise<JmaWarningFeed | null> {
  try {
    const response = await fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${office}.json`, {
      headers: { "User-Agent": "Nagame/1.0 travel companion" },
      next: { revalidate: 600 },
    });

    if (!response.ok) return null;
    return (await response.json()) as JmaWarningFeed;
  } catch {
    return null;
  }
}
