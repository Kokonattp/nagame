"use client";

import { ReactNode, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils/cn";

export function ShareableCard({
  title,
  children,
  className,
  square = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  square?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function exportPng() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f8fbff",
      });
      const link = document.createElement("a");
      link.download = `nagame-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/70 bg-white/58 p-4 shadow-xl shadow-sky-950/7 backdrop-blur-2xl",
        square && "aspect-square",
        className,
      )}
    >
      <button
        type="button"
        onClick={exportPng}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/70 text-zinc-700 shadow-sm backdrop-blur-xl transition hover:bg-white disabled:opacity-60"
        title="Export PNG"
        disabled={busy}
      >
        {busy ? <Share2 className="h-4 w-4 animate-pulse" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
        <span className="sr-only">Export PNG</span>
      </button>
      {children}
    </section>
  );
}
