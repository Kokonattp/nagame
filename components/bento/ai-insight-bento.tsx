"use client";

import { Sparkles } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import type { SummarySignal } from "@/lib/services/ai-summary";

export function AiInsightBento({ summary }: { summary: SummarySignal }) {
  return (
    <ShareableCard title="ai-insight" className="h-full min-h-[184px] bg-white p-4 text-zinc-950">
      <div className="flex h-full flex-col justify-between gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-black text-violet-600">AI Insight ✨</p>
          <p className="mt-2 line-clamp-5 text-sm font-semibold leading-6 text-zinc-700">{summary.text}</p>
          <p className="mt-3 text-xs font-medium text-zinc-400">Based on signals · {summary.source}</p>
        </div>
      </div>
    </ShareableCard>
  );
}
