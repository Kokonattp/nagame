import type { ReactNode } from "react";
import { DesktopPwaGate } from "@/components/desktop-pwa-gate";
import { cn } from "@/lib/utils/cn";

export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#080b18] text-zinc-950">
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.25),transparent_30%),radial-gradient(circle_at_86%_6%,rgba(168,85,247,0.18),transparent_22%),linear-gradient(180deg,#090b17_0%,#10162a_52%,#060815_100%)]" />
      <DesktopPwaGate />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f7f7fb] pb-24 shadow-2xl shadow-black/40 md:hidden">
        <div
          className={cn(
            "min-h-dvh sm:min-h-[calc(100dvh-2rem)]",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
