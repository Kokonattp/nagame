"use client";

import { Umbrella } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";

export function RainBento({ rainChance }: { rainChance: number | null }) {
  return (
    <ShareableCard title="rain" square>
      <div className="flex h-full flex-col justify-between pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <Umbrella className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500">Rain</p>
          <p className="mt-1 text-4xl font-black tracking-normal">{rainChance ?? "--"}%</p>
          <p className="mt-1 text-sm font-bold text-zinc-700">โอกาสฝน</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {rainChance == null ? "ยังไม่มีข้อมูลฝน" : rainChance >= 60 ? "ควรมีแผนในร่มสำรอง" : "เดินเมืองได้ค่อนข้างคล่อง"}
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
