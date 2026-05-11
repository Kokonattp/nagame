"use client";

import { Gauge } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";

export function WindBento({ windSpeed }: { windSpeed: number | null }) {
  return (
    <ShareableCard title="wind" square>
      <div className="flex h-full flex-col justify-between pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Gauge className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500">Wind</p>
          <p className="mt-1 text-4xl font-black tracking-normal">{windSpeed ?? "--"}</p>
          <p className="mt-1 text-sm font-bold text-zinc-700">km/h</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {windSpeed == null ? "ยังไม่มีข้อมูลลม" : windSpeed > 28 ? "ลมแรง ระวังจุดชมวิวและเรือ" : "เดินเมืองได้สบายขึ้น"}
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
