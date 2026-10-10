import type { Metadata } from "next";
import { TabiApp } from "@/components/tabi/tabi-app";

// Home = Tabi V1-lite (docs/spec-nagame-v1-lite.md). Rollback: render
// <PretripHome seedBubbles={[]} seedCards={[]} /> from "@/components/pretrip/pretrip-home" again.
export const metadata: Metadata = {
  title: "Nagame 眺め — วางทริปญี่ปุ่นกับทาบิ",
  description: "คุยกับทาบิ บอกช่วงเวลาและแนวที่ชอบ แล้วได้เส้นทางและร่างทริปญี่ปุ่นรายวัน",
};

export default function Home() {
  return <TabiApp />;
}
