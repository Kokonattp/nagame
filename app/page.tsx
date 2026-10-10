import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { TabiApp } from "@/components/tabi/tabi-app";

// Home = Tabi V1-lite (docs/spec-nagame-v1-lite.md). Rollback: render
// <PretripHome seedBubbles={[]} seedCards={[]} /> from "@/components/pretrip/pretrip-home" again.
export const metadata: Metadata = {
  title: "Nagame 眺め — วางทริปญี่ปุ่นกับทาบิ",
  description: "คุยกับทาบิ บอกช่วงเวลาและแนวที่ชอบ แล้วได้เส้นทางและร่างทริปญี่ปุ่นรายวัน",
};

// Heading font for Tabi (self-hosted by Next, exposed as --font-prompt for tabi.css).
const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["500", "600", "700"], variable: "--font-prompt", display: "swap" });

export default function Home() {
  return (
    <div className={prompt.variable}>
      <TabiApp />
    </div>
  );
}
