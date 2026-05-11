"use client";

import { Umbrella } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";

export function RainBento({ rainChance }: { rainChance: number | null }) {
  return (
    <ShareableCard title="rain" square className="p-3">
      <div className="flex h-full flex-col justify-between pr-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <Umbrella className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-500">Rain</p>
          <p className="mt-1 text-3xl font-black tracking-normal">{rainChance ?? "--"}%</p>
          <p className="text-xs font-bold text-zinc-700">โอกาสฝน</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">
            {rainChance == null ? "ยังไม่มีข้อมูลฝน" : rainChance >= 60 ? "ควรมีแผนในร่มสำรอง" : "เดินเมืองได้ค่อนข้างคล่อง"}
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
