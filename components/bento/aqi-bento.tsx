"use client";

import { Wind } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import type { AqiSignal } from "@/lib/services/aqi";

export function AqiBento({ aqi }: { aqi: AqiSignal }) {
  return (
    <ShareableCard title="aqi" square>
      <div className="flex h-full flex-col justify-between pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Wind className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500">AQI</p>
          <p className="mt-1 text-4xl font-black tracking-normal">{aqi.aqi ?? "--"}</p>
          <p className="mt-1 text-sm font-bold text-zinc-700">{aqi.label}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {aqi.available ? `PM2.5 ${aqi.pm25 ?? "-"} · ${aqi.source}` : aqi.message}
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
