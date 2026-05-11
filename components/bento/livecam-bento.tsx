"use client";

import { Camera, ExternalLink } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import type { WebcamSignal } from "@/lib/services/webcams";

export function LivecamBento({ webcam, cityName }: { webcam: WebcamSignal; cityName: string }) {
  return (
    <ShareableCard title={`${cityName}-livecam`} className="min-h-[220px]" square>
      <div className="flex h-full flex-col justify-between">
        <div className="absolute inset-0">
          {webcam.previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={webcam.previewImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.35),transparent_30%),linear-gradient(135deg,#e0f2fe,#fef3c7_58%,#fce7f3)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/15 via-zinc-950/10 to-zinc-950/55" />
        </div>
        <div className="relative z-10 flex items-start justify-between pr-10 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/22 backdrop-blur-xl">
            <Camera className="h-5 w-5" aria-hidden />
          </div>
          <p className="rounded-full bg-white/22 px-3 py-1 text-xs font-bold backdrop-blur-xl">
            {webcam.available ? "LIVE CAM" : "NO CAM"}
          </p>
        </div>
        <div className="relative z-10 text-white">
          <h2 className="max-w-[15rem] text-2xl font-black tracking-normal">
            {webcam.title ?? "ยังไม่พบกล้องใกล้เมืองนี้"}
          </h2>
          <p className="mt-2 text-sm font-medium text-white/78">
            {webcam.available ? webcam.source : webcam.message}
          </p>
          {webcam.url ? (
            <a
              href={webcam.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950"
            >
              เปิดกล้อง <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </ShareableCard>
  );
}
