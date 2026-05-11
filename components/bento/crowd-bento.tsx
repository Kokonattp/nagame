"use client";

import { UsersRound } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import { crowdLabel } from "@/lib/utils/format";

export function CrowdBento({ score }: { score: number | null }) {
  const label = crowdLabel(score);
  return (
    <ShareableCard title="crowd" square>
      <div className="flex h-full flex-col justify-between pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <UsersRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500">Crowd</p>
          <p className="mt-1 text-4xl font-black tracking-normal">{score ?? "--"}</p>
          <p className="mt-1 text-sm font-bold text-zinc-700">{label}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            สัญญาณประมาณจากเมือง + ฝน/สภาพอากาศ ไม่ใช่จำนวนคนสด
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
