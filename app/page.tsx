import { PretripHome } from "@/components/pretrip/pretrip-home";

export const revalidate = 86400;

// หน้าแรกใหม่ = โต๊ะเตรียมทริป. แชทยังคุยกับ endpoint เดิม แต่ composition ใหม่ทั้งหมด.
export default function Home() {
  return <PretripHome seedBubbles={[]} seedCards={[]} />;
}
