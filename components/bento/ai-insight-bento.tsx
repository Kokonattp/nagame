"use client";

import { Sparkles } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import type { SummarySignal } from "@/lib/services/ai-summary";

export function AiInsightBento({ summary }: { summary: SummarySignal }) {
  return (
    <ShareableCard title="ai-insight" className="bg-zinc-950 p-5 text-white">
      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-cyan-200">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-cyan-100/75">AI Insight</p>
          <p className="mt-2 line-clamp-3 text-lg font-bold leading-7">{summary.text}</p>
          <p className="mt-3 text-xs font-medium text-white/45">Based only on available signals · {summary.source}</p>
        </div>
      </div>
    </ShareableCard>
  );
}
