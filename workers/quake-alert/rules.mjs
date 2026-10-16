// Who gets which Thai push for one P2PQuake record — pure functions, no network (tested in rules.test.mjs).
// Rules and wording: docs/quake-alerts.md. P2PQuake relays 気象庁 bulletins as-is: 556 = EEW (警報),
// 551 = 地震情報, 552 = 津波予報. Nothing here predicts shaking; it only re-says what JMA issued.

/** English prefecture (as stored by the app) → JMA name stems + Thai name. EEW uses 府県予報区 like
 *  "北海道道東" / "伊豆諸島", quake info uses "東京都" — both start with these stems. */
export const PREFS = {
  Hokkaido: { ja: ["北海道"], th: "ฮอกไกโด" },
  Aomori: { ja: ["青森"], th: "อาโอโมริ" },
  Iwate: { ja: ["岩手"], th: "อิวาเตะ" },
  Miyagi: { ja: ["宮城"], th: "มิยางิ" },
  Akita: { ja: ["秋田"], th: "อาคิตะ" },
  Yamagata: { ja: ["山形"], th: "ยามากาตะ" },
  Fukushima: { ja: ["福島"], th: "ฟุกุชิมะ" },
  Ibaraki: { ja: ["茨城"], th: "อิบารากิ" },
  Tochigi: { ja: ["栃木"], th: "โทจิงิ" },
  Gunma: { ja: ["群馬"], th: "กุนมะ" },
  Saitama: { ja: ["埼玉"], th: "ไซตามะ" },
  Chiba: { ja: ["千葉"], th: "ชิบะ" },
  Tokyo: { ja: ["東京", "伊豆諸島", "小笠原"], th: "โตเกียว" },
  Kanagawa: { ja: ["神奈川"], th: "คานางาวะ" },
  Niigata: { ja: ["新潟"], th: "นีงาตะ" },
  Toyama: { ja: ["富山"], th: "โทยามะ" },
  Ishikawa: { ja: ["石川"], th: "อิชิกาวะ" },
  Fukui: { ja: ["福井"], th: "ฟุกุอิ" },
  Yamanashi: { ja: ["山梨"], th: "ยามานาชิ" },
  Nagano: { ja: ["長野"], th: "นากาโนะ" },
  Gifu: { ja: ["岐阜"], th: "กิฟุ" },
  Shizuoka: { ja: ["静岡"], th: "ชิซึโอกะ" },
  Aichi: { ja: ["愛知"], th: "ไอจิ" },
  Mie: { ja: ["三重"], th: "มิเอะ" },
  Shiga: { ja: ["滋賀"], th: "ชิงะ" },
  Kyoto: { ja: ["京都"], th: "เกียวโต" },
  Osaka: { ja: ["大阪"], th: "โอซาก้า" },
  Hyogo: { ja: ["兵庫"], th: "เฮียวโงะ" },
  Nara: { ja: ["奈良"], th: "นารา" },
  Wakayama: { ja: ["和歌山"], th: "วากายามะ" },
  Tottori: { ja: ["鳥取"], th: "ทตโตริ" },
  Shimane: { ja: ["島根"], th: "ชิมาเนะ" },
  Okayama: { ja: ["岡山"], th: "โอคายามะ" },
  Hiroshima: { ja: ["広島"], th: "ฮิโรชิมะ" },
  Yamaguchi: { ja: ["山口"], th: "ยามางุจิ" },
  Tokushima: { ja: ["徳島"], th: "โทกุชิมะ" },
  Kagawa: { ja: ["香川"], th: "คางาวะ" },
  Ehime: { ja: ["愛媛"], th: "เอฮิเมะ" },
  Kochi: { ja: ["高知"], th: "โคจิ" },
  Fukuoka: { ja: ["福岡"], th: "ฟุกุโอกะ" },
  Saga: { ja: ["佐賀"], th: "ซากะ" },
  Nagasaki: { ja: ["長崎"], th: "นางาซากิ" },
  Kumamoto: { ja: ["熊本"], th: "คุมาโมโตะ" },
  Oita: { ja: ["大分"], th: "โออิตะ" },
  Miyazaki: { ja: ["宮崎"], th: "มิยาซากิ" },
  Kagoshima: { ja: ["鹿児島", "奄美"], th: "คาโกชิมะ" },
  Okinawa: { ja: ["沖縄", "大東島", "宮古島", "八重山"], th: "โอกินาวา" },
};

/** JMA area/prefecture name → English prefecture, or null (e.g. tsunami zones like "東京湾内湾"). */
export function prefOf(jaName = "") {
  for (const [en, p] of Object.entries(PREFS)) if (p.ja.some((s) => jaName.startsWith(s))) return en;
  return null;
}

// ── epicentre names (JMA 震央地名) in Thai: prefecture + direction, or a known sea/island area ──
const DIR_TH = [
  ["北西部", "ตะวันตกเฉียงเหนือ"], ["北東部", "ตะวันออกเฉียงเหนือ"], ["南西部", "ตะวันตกเฉียงใต้"], ["南東部", "ตะวันออกเฉียงใต้"],
  ["北部", "ตอนเหนือ"], ["南部", "ตอนใต้"], ["東部", "ตะวันออก"], ["西部", "ตะวันตก"], ["中部", "ตอนกลาง"],
];
const OFFSHORE_TH = [["東方沖", " ด้านตะวันออก"], ["南東沖", " ด้านตะวันออกเฉียงใต้"], ["南西沖", " ด้านตะวันตกเฉียงใต้"], ["北西沖", " ด้านตะวันตกเฉียงเหนือ"], ["沖", ""]];
const SEA_TH = {
  三陸沖: "นอกชายฝั่งซันริกุ", 釧路沖: "นอกชายฝั่งคุชิโระ", 十勝沖: "นอกชายฝั่งโทคาจิ", 浦河沖: "นอกชายฝั่งอุรากาวะ",
  根室半島南東沖: "นอกคาบสมุทรเนมุโระ", 日向灘: "ทะเลฮิวกะนาดะ", 遠州灘: "ทะเลเอ็นชูนาดะ", 熊野灘: "ทะเลคุมาโนะนาดะ",
  相模湾: "อ่าวซางามิ", 駿河湾: "อ่าวซุรุกะ", 東京湾: "อ่าวโตเกียว", 伊予灘: "ทะเลอิโยนาดะ", 豊後水道: "ช่องแคบบุงโงะ",
  紀伊水道: "ช่องแคบคิอิ", 安芸灘: "ทะเลอากินาดะ", 若狭湾: "อ่าววากาสะ", 能登半島沖: "นอกคาบสมุทรโนโตะ",
  伊豆大島近海: "ใกล้เกาะอิซุโอชิมะ", "新島・神津島近海": "ใกล้เกาะนีจิมะ", 八丈島東方沖: "นอกเกาะฮาจิโจ",
  鳥島近海: "ใกล้เกาะโทริชิมะ", 奄美大島近海: "ใกล้เกาะอามามิ", 沖縄本島近海: "ใกล้เกาะโอกินาวา", 宮古島近海: "ใกล้เกาะมิยาโกะ",
  石垣島近海: "ใกล้เกาะอิชิงากิ", 与那国島近海: "ใกล้เกาะโยนากุนิ", 台湾付近: "ใกล้ไต้หวัน", 千島列島: "หมู่เกาะคูริล",
  カムチャツカ半島付近: "ใกล้คาบสมุทรคัมชัตคา", サハリン近海: "ใกล้เกาะซาคาลิน", 朝鮮半島南部: "คาบสมุทรเกาหลีตอนใต้",
};

/** "千葉県北西部" → "ชิบะ ตะวันตกเฉียงเหนือ (千葉県北西部)"; unknown names stay Japanese (still findable on JMA). */
export function epicentreTh(ja = "") {
  const name = ja.trim();
  if (!name) return "";
  if (SEA_TH[name]) return `${SEA_TH[name]} (${name})`;
  const en = prefOf(name);
  if (!en) return name;
  const stem = PREFS[en].ja.find((j) => name.startsWith(j));
  const rest = name.slice(stem.length).replace(/^[都道府県]/, "");
  const th = PREFS[en].th;
  const off = OFFSHORE_TH.find(([j]) => rest.endsWith(j));
  if (off) return `นอกชายฝั่ง${th}${off[1]} (${name})`;
  const dir = DIR_TH.find(([j]) => rest === j);
  return `${th}${dir ? ` ${dir[1]}` : ""} (${name})`;
}

const SHINDO_TH = { 10: "1", 20: "2", 30: "3", 40: "4", 45: "5 ล่าง", 50: "5 บน", 55: "6 ล่าง", 60: "6 บน", 70: "7" };
export const QUAKE_MIN_SCALE = 45; // 5 ล่าง: trains stop, things fall — below that, no push
const SOURCE = "ที่มา: 気象庁";
const EEW_MAX_AGE_MS = 3 * 60_000; // an EEW older than this is useless (shaking has passed) — skip, don't confuse
const INFO_MAX_AGE_MS = 30 * 60_000;
const TSUNAMI_RANK = { Watch: 1, Warning: 2, MajorWarning: 3 };

/** P2PQuake times are JST without a zone: "2026/10/16 12:40:41.752". */
export function jst(s) {
  return s ? new Date(`${s.replace(/\//g, "-").replace(" ", "T")}+09:00`).getTime() : NaN;
}
const hhmm = (s = "") => s.slice(11, 16);
const jstDay = (ms) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** On a trip right now (Japan date), with a day's slack either side for late flights. */
export function isActive(sub, now) {
  const today = jstDay(now);
  return addDays(sub.starts_on, -1) <= today && today <= addDays(sub.ends_on, 1);
}

/** "ฮอกไกโด, อาโอโมริ … และอีก 9 จังหวัด" — the user's own prefectures first. */
function prefList(prefs, mine) {
  const rest = prefs.filter((p) => !mine.includes(p));
  const shown = rest.slice(0, 6).map((p) => PREFS[p].th).join(", ");
  return rest.length > 6 ? `${shown} และอีก ${rest.length - 6} จังหวัด` : shown;
}

/** Memory of what each phone was already told (so serial 2, 3 … of the same EEW stay quiet). */
export function newMemory() {
  return { eew: new Map(), quake: new Map(), tsunami: new Map(), weather: new Map() };
}
function sentTo(map, key, endpoint) {
  let set = map.get(key);
  if (!set) map.set(key, (set = new Set()));
  if (set.has(endpoint)) return true;
  set.add(endpoint);
  return false;
}

/**
 * @param rec  one P2PQuake JSON record
 * @param subs rows of push_subscriptions ({ endpoint, prefectures: string[], starts_on, ends_on, ... })
 * @param mem  newMemory(), mutated
 * @param now  epoch ms (record time when replaying)
 * @returns {{ sub, payload }[]}
 */
/** Subscriptions on a trip now, one per phone (a phone may follow two trips: merged, so no double alerts). */
export function activePhones(subs, now) {
  const byPhone = new Map();
  for (const s of subs) {
    if (!isActive(s, now)) continue;
    const had = byPhone.get(s.endpoint);
    byPhone.set(s.endpoint, had
      ? { ...had, prefectures: [...new Set([...had.prefectures, ...s.prefectures])], jma: [...(had.jma ?? []), ...(s.jma ?? [])] }
      : s);
  }
  return [...byPhone.values()];
}

export function plan(rec, subs, mem, now = Date.now()) {
  const active = activePhones(subs, now);
  if (rec.code === 556) return planEew(rec, active, mem, now);
  if (rec.code === 551) return planQuake(rec, active, mem, now);
  if (rec.code === 552) return planTsunami(rec, active, mem, now);
  return [];
}

function planEew(rec, subs, mem, now) {
  const id = rec.issue?.eventId;
  if (!id || rec.test) return [];
  if (rec.cancelled) {
    const told = mem.eew.get(id);
    if (!told) return [];
    const at = hhmm(rec.issue.time);
    mem.eew.delete(id);
    return subs.filter((s) => told.has(s.endpoint)).map((sub) => ({
      sub,
      payload: {
        kind: "eew-cancel", tag: `eew-${id}`, urgent: false, ttl: 600, url: "/",
        title: "✅ ยกเลิกเตือนแผ่นดินไหวแล้ว",
        body: `気象庁ยกเลิกประกาศเตือนเมื่อ ${at} · ถ้ายังรู้สึกสั่น ให้ป้องกันตัวไว้ก่อน`,
      },
    }));
  }
  if (now - jst(rec.issue.time) > EEW_MAX_AGE_MS) return [];
  const warned = [...new Set((rec.areas ?? []).map((a) => prefOf(a.pref) ?? prefOf(a.name)).filter(Boolean))];
  const out = [];
  for (const sub of subs) {
    const mine = warned.filter((p) => sub.prefectures.includes(p));
    if (!mine.length || sentTo(mem.eew, id, sub.endpoint)) continue;
    const others = prefList(warned, mine);
    out.push({
      sub,
      payload: {
        kind: "eew", tag: `eew-${id}`, urgent: true, ttl: 60, url: "/",
        title: "⚠️ เตือนแผ่นดินไหว เตรียมรับแรงสั่น",
        body: `📍 ${mine.map((p) => PREFS[p].th).join(", ")} อยู่ในพื้นที่เตือน${others ? ` · ${others}` : ""}\nหมอบลง ป้องกันศีรษะ อยู่ห่างกระจกและของที่ล้มได้\n${SOURCE}`,
      },
    });
  }
  return out;
}

function planQuake(rec, subs, mem, now) {
  const q = rec.earthquake;
  if (!q || rec.issue?.type === "Foreign" || now - jst(rec.time) > INFO_MAX_AGE_MS) return [];
  const maxByPref = new Map();
  for (const p of rec.points ?? []) {
    const en = prefOf(p.pref);
    if (en && (p.scale ?? 0) > (maxByPref.get(en) ?? 0)) maxByPref.set(en, p.scale);
  }
  const out = [];
  for (const sub of subs) {
    const hits = sub.prefectures.filter((p) => (maxByPref.get(p) ?? 0) >= QUAKE_MIN_SCALE);
    if (!hits.length || sentTo(mem.quake, q.time, sub.endpoint)) continue;
    const top = hits.reduce((a, b) => (maxByPref.get(b) > maxByPref.get(a) ? b : a));
    const scale = SHINDO_TH[maxByPref.get(top)] ?? "?";
    const h = q.hypocenter ?? {};
    const where = [h.magnitude > 0 ? `M${h.magnitude}` : "", epicentreTh(h.name)].filter(Boolean).join(" ");
    const tsunami = q.domesticTsunami === "None" ? "ไม่มีความเสี่ยงสึนามิ" : q.domesticTsunami === "Checking" ? "กำลังตรวจสอบสึนามิ ห่างชายฝั่งไว้ก่อน" : "ดูประกาศสึนามิ ห่างชายฝั่งไว้ก่อน";
    out.push({
      sub,
      payload: {
        kind: "quake", tag: `quake-${q.time}`, urgent: false, ttl: 3600, url: "/",
        title: `แผ่นดินไหวระดับ ${scale} ที่${PREFS[top].th}`,
        body: `📍 ${hits.map((p) => `${PREFS[p].th} ระดับ ${SHINDO_TH[maxByPref.get(p)]}`).join(", ")}${where ? ` · ศูนย์กลาง ${where}` : ""}\n${tsunami} · รถไฟอาจหยุดชั่วคราว เช็กก่อนออกเดินทาง\n${SOURCE}`,
      },
    });
  }
  return out;
}

function planTsunami(rec, subs, mem, now) {
  if (now - jst(rec.time ?? rec.issue?.time) > INFO_MAX_AGE_MS) return [];
  if (rec.cancelled) {
    const out = subs.filter((s) => mem.tsunami.has(s.endpoint)).map((sub) => ({
      sub,
      payload: {
        kind: "tsunami-cancel", tag: "tsunami", urgent: false, ttl: 3600, url: "/",
        title: "✅ ยกเลิกเตือนสึนามิแล้ว",
        body: "気象庁ยกเลิกประกาศสึนามิแล้ว ยังควรห่างชายฝั่งจนกว่าเจ้าหน้าที่จะแจ้ง",
      },
    }));
    mem.tsunami.clear();
    return out;
  }
  const areas = (rec.areas ?? []).filter((a) => TSUNAMI_RANK[a.grade]);
  if (!areas.length) return [];
  const top = Math.max(...areas.map((a) => TSUNAMI_RANK[a.grade]));
  const out = [];
  for (const sub of subs) {
    // warnings go to everyone on a trip (zone names don't map cleanly to prefectures); watches only nearby
    const mineWatch = areas.filter((a) => sub.prefectures.includes(prefOf(a.name)));
    const rank = top >= 2 ? top : mineWatch.length ? 1 : 0;
    if (!rank || (mem.tsunami.get(sub.endpoint) ?? 0) >= rank) continue;
    mem.tsunami.set(sub.endpoint, rank);
    const zones = (rank >= 2 ? areas.filter((a) => TSUNAMI_RANK[a.grade] >= 2) : mineWatch).map((a) => a.name);
    out.push({
      sub,
      payload: {
        kind: "tsunami", tag: "tsunami", urgent: rank >= 2, ttl: 6 * 3600, url: "/",
        title: rank === 3 ? "🌊 เตือนสึนามิใหญ่" : rank === 2 ? "🌊 เตือนสึนามิ" : "🌊 ระวังคลื่นสึนามิ",
        body: `${rank >= 2 ? "ออกห่างชายฝั่งและปากแม่น้ำทันที ขึ้นที่สูงหรืออาคารสูง" : "อย่าลงทะเลหรือเข้าใกล้ชายฝั่งจนกว่าจะยกเลิก"}\nเขต: ${zones.slice(0, 4).join(", ")}${zones.length > 4 ? ` และอีก ${zones.length - 4} เขต` : ""}\n${SOURCE}`,
      },
    });
  }
  return out;
}

// ── weather 警報 (JMA bosai warnings, polled) ──
const HAZARD_TH = { rain: "ฝนตกหนัก", landslide: "ดินถล่ม", wind: "ลมแรง", snowstorm: "พายุหิมะ", snow: "หิมะตกหนัก", surge: "น้ำทะเลหนุนสูง", waves: "คลื่นสูง" };
const HAZARD_DO = {
  rain: "เลี่ยงริมแม่น้ำ ที่ต่ำ และทางลอดใต้ดิน", landslide: "เลี่ยงเชิงเขาและหน้าผา อยู่ในอาคารแข็งแรง",
  wind: "อยู่ในอาคาร ระวังของปลิว รถไฟอาจหยุดวิ่ง", snowstorm: "งดขับรถ เผื่อเวลารถไฟล่าช้าหรือหยุดวิ่ง",
  snow: "งดขับรถ เผื่อเวลารถไฟล่าช้า", surge: "ออกห่างชายฝั่งและท่าเรือ", waves: "ออกห่างชายฝั่งและท่าเรือ",
};
const LEVEL_JA = { 30: "警報", 40: "危険警報", 50: "特別警報" };

/**
 * @param byOffice Map(office → Map(areaCode → Map(hazard → level))) for the offices that loaded this round
 * @returns sends for hazards that are new, or stronger than what this phone was last told, per town
 */
export function planWeather(byOffice, subs, mem, now = Date.now()) {
  const out = [];
  for (const sub of activePhones(subs, now)) {
    const told = mem.weather.get(sub.endpoint) ?? new Map(); // "town|hazard" → level
    const seenTowns = new Set();
    for (const w of sub.jma ?? []) {
      const office = byOffice.get(w.office);
      if (!office || seenTowns.has(w.th)) continue; // office failed to load → keep what we knew
      seenTowns.add(w.th);
      const now_ = new Map();
      for (const a of w.areas ?? []) for (const [h, lv] of office.get(a) ?? []) if ((now_.get(h) ?? 0) < lv) now_.set(h, lv);
      for (const key of [...told.keys()]) if (key.startsWith(`${w.th}|`) && !now_.has(key.slice(w.th.length + 1))) told.delete(key);
      const rising = [...now_].filter(([h, lv]) => (told.get(`${w.th}|${h}`) ?? 0) < lv);
      for (const [h, lv] of now_) told.set(`${w.th}|${h}`, lv);
      if (!rising.length) continue;
      const top = Math.max(...rising.map(([, lv]) => lv));
      const names = rising.map(([h]) => HAZARD_TH[h]).join(", ");
      out.push({
        sub,
        payload: {
          kind: "weather", tag: `weather-${w.th}`, urgent: top >= 40, ttl: 6 * 3600, url: "/",
          title: top === 50 ? `🚨 เตือนภัยขั้นสูงสุด: ${names} ที่${w.th}` : top === 40 ? `⚠️ อันตราย: ${names} ที่${w.th}` : `⛈️ เตือน${names}ที่${w.th}`,
          body: `${[...new Set(rising.map(([h]) => HAZARD_DO[h]))].join(" · ")}
${LEVEL_JA[top]} · ${SOURCE}`,
        },
      });
    }
    mem.weather.set(sub.endpoint, told);
  }
  return out;
}
