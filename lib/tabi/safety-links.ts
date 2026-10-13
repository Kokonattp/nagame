// Who to call and where to look when something happens in Japan — shared by the chat answer and the
// trip's safety card. Only sources checked 2026-10-13; numbers are the national ones, not a person's mobile.

export const EMERGENCY_TEL = [
  { label: "ตำรวจ", number: "110" },
  { label: "รถพยาบาล / ดับเพลิง", number: "119" },
] as const;

/** JNTO Japan Visitor Hotline, 24 h (English, Chinese, Korean). */
export const JNTO_HOTLINE = { label: "สายด่วนนักท่องเที่ยว JNTO (24 ชม.)", number: "050-3816-2787", url: "https://www.japan.travel/en/plan/hotline/" } as const;

/**
 * Thai missions in Japan. Numbers from their own contact pages, read 2026-10-13:
 * site.thaiembassy.jp/th/contact/ and osaka.thaiembassy.org/en/page/enquiries-3.
 * The Osaka consulate lists no 24 h line — the Tokyo hotline and the MFA call centre cover that.
 */
export const THAI_MISSION_TEL = [
  { label: "สายด่วนสถานทูตไทย (ป่วย เสียชีวิต หรือต้องการความช่วยเหลือเร่งด่วน)", number: "090-4435-7812" },
  { label: "สถานทูตไทย โตเกียว (จ.–ศ. 09:00–12:00, 13:30–17:30)", number: "03-5789-2433" },
  { label: "สถานกงสุลใหญ่ โอซากา (จ.–ศ. รับสาย 15:30–17:30)", number: "06-6262-9226" },
  { label: "ศูนย์ช่วยเหลือคนไทย กรมการกงสุล (24 ชม.)", number: "+66-2-572-8442" },
] as const;

export const SAFETY_LINKS = [
  // official app of the Japan Tourism Agency: push alerts for quakes, tsunami, volcanoes, heat — in Thai
  { label: "แอป Safety tips (มีภาษาไทย) แจ้งเตือนแผ่นดินไหว สึนามิ ภูเขาไฟ", url: "https://www.rcsc.co.jp/safety-tips-en" },
  { label: "สถานเอกอัครราชทูตไทย ณ กรุงโตเกียว", url: "https://site.thaiembassy.jp/th/" },
  { label: "สถานกงสุลใหญ่ ณ นครโอซากา", url: "https://osaka.thaiembassy.org/th/" },
  { label: "ประกาศเตือนภัยทั้งหมด 気象庁", url: "https://www.jma.go.jp/bosai/warning/" },
] as const;
