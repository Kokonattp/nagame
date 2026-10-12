// Practical travel questions ("ซื้อซิมที่ไหน", "ต้องขอวีซ่าไหม"). Jev only picks the topic;
// every answer below is written and checked by people, with an official link where one exists.
// Short on purpose (owner rule: say what helps, link the source for the rest).

import { durationTh, travelTime } from "./rail-times";
import { AIRPORTS, jrPassWorthIt, legLinks } from "./transport";
import type { RouteOption, TripIntent } from "./types";

export type FaqTopic =
  | "visa" | "vjw" | "internet" | "money" | "ic_card" | "airport" | "jr_pass"
  | "luggage" | "manners" | "emergency" | "weather" | "plug";

/** Descriptions Jev chooses between (English: Jev reads English instructions best). */
export const FAQ_TOPICS: Record<FaqTopic, string> = {
  visa: "Visa or entry requirements for Thai passport holders",
  vjw: "Visit Japan Web, immigration or customs forms, arrival QR code",
  internet: "SIM card, eSIM, pocket wifi, mobile internet",
  money: "Cash, credit cards, ATMs, currency exchange, paying",
  ic_card: "Suica, PASMO, ICOCA or other IC transit cards",
  airport: "Getting from the airport to the city or back",
  jr_pass: "Japan Rail Pass or whether a rail pass is worth it",
  luggage: "Luggage, suitcases, sending bags, coin lockers",
  manners: "Etiquette, manners, tipping, rules to follow",
  emergency: "Emergencies, police, ambulance, earthquakes, getting help",
  weather: "Weather, temperature or what clothes to pack",
  plug: "Power plugs, voltage, charging devices",
};

/** Narrow keyword rules for when Jev is unreachable. */
export const FAQ_KEYWORDS: [FaqTopic, RegExp][] = [
  ["visa", /วีซ่า|visa|ตม\.?.*(ต้อง|ยังไง)/i],
  ["vjw", /visit japan web|vjw|กรอก.*(ตม|ศุลกากร)|qr.*ตม/i],
  ["internet", /ซิม|sim|esim|อินเทอร์เน็ต|เน็ต|wifi|ไวไฟ/i],
  ["money", /เงินสด|แลกเงิน|บัตรเครดิต|atm|เอทีเอ็ม|จ่ายเงินยังไง/i],
  ["ic_card", /suica|pasmo|icoca|บัตร ?ic|ซุยกะ/i],
  ["airport", /จากสนามบิน|สนามบิน.*(เข้าเมือง|ไป.*ยังไง)|ไปสนามบินยังไง/i],
  ["jr_pass", /jr ?pass|เจอาร์พาส|เจอาร์ พาส|พาสรถไฟ/i],
  ["luggage", /กระเป๋า|สัมภาระ|ล็อกเกอร์|locker|ส่งของ/i],
  ["manners", /มารยาท|ทิป|ข้อห้าม|ควรระวัง/i],
  ["emergency", /ฉุกเฉิน|ตำรวจ|โรงพยาบาล|แผ่นดินไหว|ป่วย|ของหาย/i],
  ["weather", /อากาศ|หนาวไหม|ร้อนไหม|ใส่ชุด|เสื้อผ้า|แต่งตัว/i],
  ["plug", /ปลั๊ก|ชาร์จ|แรงดันไฟ|volt/i],
];

export type FaqAnswer = { bubbles: string[]; links: { label: string; url: string }[] };

export const SEASON_WEAR: Record<number, string> = {
  1: "หนาวจัด เตรียมเสื้อโค้ทกันหนาว ถุงมือ และรองเท้ากันลื่นถ้าไปที่มีหิมะ",
  2: "หนาวจัด เตรียมเสื้อโค้ทกันหนาว ถุงมือ และรองเท้ากันลื่นถ้าไปที่มีหิมะ",
  3: "ยังเย็น ใส่เสื้อแขนยาวกับแจ็กเก็ตที่ถอดง่าย",
  4: "เย็นสบาย เช้าเย็นหนาวนิด ๆ พกแจ็กเก็ตบาง ๆ",
  5: "อากาศดี กลางวันอุ่น ใส่สบาย ๆ แล้วพกเสื้อคลุมบาง",
  6: "ฝนบ่อย พกร่มพับและรองเท้าที่เปียกได้",
  7: "ร้อนชื้น ใส่เสื้อบาง ระบายอากาศ ดื่มน้ำบ่อย ๆ",
  8: "ร้อนชื้น ใส่เสื้อบาง ระบายอากาศ ดื่มน้ำบ่อย ๆ",
  9: "ยังร้อนและมีพายุบางช่วง พกร่มพับไว้",
  10: "เย็นสบาย พกแจ็กเก็ตบาง ๆ บนภูเขาจะหนาวกว่าในเมือง",
  11: "เริ่มหนาว ใส่เสื้อแขนยาวกับแจ็กเก็ต",
  12: "หนาว เตรียมเสื้อโค้ทกันหนาวและผ้าพันคอ",
};

export function faqAnswer(topic: FaqTopic, ctx: { route?: RouteOption; intent?: TripIntent }): FaqAnswer {
  switch (topic) {
    case "visa":
      return {
        bubbles: ["คนไทยเที่ยวญี่ปุ่นไม่เกิน 15 วันไม่ต้องขอวีซ่านะ ขอแค่พาสปอร์ตที่ยังไม่หมดอายุตลอดทริป", "ถ้าอยู่นานกว่า 15 วัน ต้องขอวีซ่าก่อนเดินทาง เช็กเงื่อนไขล่าสุดที่เว็บกระทรวงต่างประเทศญี่ปุ่น"],
        links: [{ label: "เงื่อนไขยกเว้นวีซ่า (MOFA)", url: "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html" }],
      };
    case "vjw":
      return {
        bubbles: ["กรอก Visit Japan Web ก่อนบินได้เลย ได้ QR ไว้โชว์ตอนผ่าน ตม. และศุลกากร ช่วยให้เร็วขึ้น ไม่เสียเงิน"],
        links: [{ label: "Visit Japan Web", url: "https://services.digital.go.jp/en/visit-japan-web/" }],
      };
    case "internet":
      return {
        bubbles: ["ง่ายสุดคือ eSIM ซื้อออนไลน์ก่อนบิน แล้วเปิดใช้ตอนถึง ถ้ามือถือไม่รองรับ eSIM ใช้ซิมท่องเที่ยวหรือพ็อกเก็ตไวไฟแทน", "ถ้าไปเป็นกลุ่ม พ็อกเก็ตไวไฟตัวเดียวแชร์กันได้ แต่ต้องเดินไปด้วยกันตลอด"],
        links: [],
      };
    case "money":
      return {
        bubbles: ["บัตรเครดิตใช้ได้เกือบทุกที่ในเมือง แต่ร้านเล็ก วัด และตู้ขายตั๋วบางที่ยังรับแต่เงินสด พกเงินเยนไว้บ้าง", "กดเงินสดได้ที่ตู้ ATM ใน 7-Eleven และไปรษณีย์ญี่ปุ่น รับบัตรต่างชาติ"],
        links: [],
      };
    case "ic_card":
      return {
        bubbles: ["บัตร IC อย่าง Suica, PASMO, ICOCA ใช้แตะขึ้นรถไฟ รถบัส และจ่ายในร้านสะดวกซื้อได้เกือบทั้งประเทศ ใบไหนก็ได้", "ใช้ iPhone เพิ่ม Suica ใน Apple Wallet แล้วเติมเงินในแอปได้เลย ไม่ต้องซื้อบัตร ส่วนนักท่องเที่ยวมีบัตร Welcome Suica ขายที่สนามบิน"],
        links: [{ label: "Welcome Suica (JR East)", url: "https://www.jreast.co.jp/multi/en/welcomesuica/welcomesuica.html" }],
      };
    case "airport": {
      const route = ctx.route;
      if (route) {
        const first = route.stops[0];
        const t = travelTime(`airport:${route.gateway.airport}`, first.city);
        const names = (AIRPORTS[route.gateway.airport] ?? []).map((a) => a.th).join(" หรือ ");
        const links = legLinks(`airport:${route.gateway.airport}`, first.city).map((l) => ({ label: `ดูทาง${l.label ? ` จาก${l.label}` : ""} ↗`, url: l.url }));
        return { bubbles: [`ทริปนี้บินลงสนามบิน${names} ไป${first.cityTh}${t ? ` ใช้เวลาประมาณ ${durationTh(t.minutes)}` : ""} กดดูทางจริงใน Google Maps ได้เลย`], links };
      }
      return { bubbles: ["บอกทาบิได้ไหมว่าบินลงสนามบินไหน หรือเลือกเส้นทางก่อน ทาบิจะบอกเวลาและเปิดเส้นทางจริงให้"], links: [] };
    }
    case "jr_pass": {
      if (ctx.route) {
        return jrPassWorthIt(ctx.route)
          ? { bubbles: ["ทริปนี้นั่งรถไฟไกลหลายช่วง JR Pass อาจคุ้ม ลองเทียบราคาก่อนซื้อ"], links: [{ label: "JR Pass ทางการ", url: "https://japanrailpass.net/" }] }
          : { bubbles: ["ทริปนี้ไม่ต้องซื้อ JR Pass ทั้งประเทศ ซื้อตั๋วรายเที่ยวถูกกว่า ส่วนรถไฟในเมืองแตะบัตร IC ได้เลย"], links: [] };
      }
      return {
        bubbles: ["JR Pass ทั้งประเทศ 7 วันราคา 50,000 เยนขึ้นไป คุ้มเมื่อนั่งชินคันเซ็นไกลหลายช่วง เช่น โตเกียว–เกียวโต–ฮิโรชิม่า ถ้าเที่ยวแค่ภูมิภาคเดียว ตั๋วรายเที่ยวหรือพาสภูมิภาคมักถูกกว่า", "เลือกเส้นทางกับทาบิก่อน แล้วทาบิจะบอกว่าทริปนั้นคุ้มไหม"],
        links: [{ label: "JR Pass ทางการ", url: "https://japanrailpass.net/" }],
      };
    }
    case "luggage":
      return {
        bubbles: ["ญี่ปุ่นมีบริการส่งกระเป๋าข้ามเมือง (宅急便) ฝากที่โรงแรมหรือร้านสะดวกซื้อ ส่วนมากถึงวันถัดไป ย้ายเมืองตัวเบาได้", "ฝากกระเป๋าชั่วคราวได้ที่ล็อกเกอร์หยอดเหรียญในสถานี ใบใหญ่มักเต็มเร็ว ไปเช้าหน่อย"],
        links: [],
      };
    case "manners":
      return {
        bubbles: ["ไม่ต้องให้ทิป บนรถไฟพูดเบา ๆ และไม่คุยโทรศัพท์ ถังขยะมีน้อย พกถุงเก็บขยะกลับไปทิ้งที่พัก", "ถ้าเห็นที่วางรองเท้าหรือพื้นยกสูง ให้ถอดรองเท้า ออนเซ็นหลายที่ไม่รับคนมีรอยสัก เช็กก่อนไป"],
        links: [],
      };
    case "emergency":
      return {
        bubbles: ["เบอร์ฉุกเฉิน: ตำรวจ 110 · รถพยาบาลและดับเพลิง 119", "สายด่วนนักท่องเที่ยว JNTO 050-3816-2787 ตลอด 24 ชม. (อังกฤษ จีน เกาหลี) และดูประกาศเตือนภัยล่าสุดที่กรมอุตุฯ ญี่ปุ่น"],
        links: [
          { label: "Japan Visitor Hotline (JNTO)", url: "https://www.japan.travel/en/plan/hotline/" },
          { label: "ประกาศเตือนภัย 気象庁", url: "https://www.jma.go.jp/bosai/warning/" },
        ],
      };
    case "weather": {
      const m = ctx.intent?.month;
      return m
        ? { bubbles: [`ช่วงที่ไป${SEASON_WEAR[m]}`], links: [] }
        : { bubbles: ["บอกเดือนที่จะไปหน่อย ทาบิจะบอกว่าควรเตรียมเสื้อผ้าแบบไหน"], links: [] };
    }
    case "plug":
      return {
        bubbles: ["ญี่ปุ่นใช้ปลั๊กขาแบนสองขา (Type A) ไฟ 100V ปลั๊กขาแบนจากไทยเสียบได้เลย ส่วนขากลมต้องใช้หัวแปลง", "ที่ชาร์จมือถือและโน้ตบุ๊กส่วนใหญ่รองรับ 100–240V ใช้ได้ แต่ไดร์เป่าผมหรือเครื่องหนีบผมจากไทยอาจร้อนไม่พอ"],
        links: [],
      };
  }
}
