"use client";

import { UsersRound } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import { crowdLabel } from "@/lib/utils/format";

export function CrowdBento({ score }: { score: number | null }) {
  const label = crowdLabel(score);
  return (
    <ShareableCard title="crowd" square className="p-3">
      <div className="flex h-full flex-col justify-between pr-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <UsersRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-500">Crowd</p>
          <p className="mt-1 text-3xl font-black tracking-normal">{score ?? "--"}</p>
          <p className="text-xs font-bold text-zinc-700">{label}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">
            สัญญาณประมาณจากเมือง + ฝน/สภาพอากาศ ไม่ใช่จำนวนคนสด
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
