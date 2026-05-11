import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#eaf3f5] text-zinc-950">
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.35),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(251,146,60,0.22),transparent_25%),linear-gradient(180deg,#f9fbff_0%,#dceef0_46%,#f7f0e8_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-24 pt-4 sm:px-5">
        <div
          className={cn(
            "min-h-[calc(100dvh-2rem)] rounded-[2rem] border border-white/70 bg-white/34 p-3 shadow-2xl shadow-sky-900/10 backdrop-blur-2xl",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
