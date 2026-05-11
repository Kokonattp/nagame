import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "dark" | "glass" | "ghost";
};

export function Button({ className, variant = "dark", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variant === "dark" && "bg-zinc-950 text-white shadow-lg shadow-zinc-950/15",
        variant === "glass" && "border border-white/55 bg-white/45 text-zinc-950 shadow-sm backdrop-blur-xl",
        variant === "ghost" && "text-zinc-700 hover:bg-white/50",
        className,
      )}
      {...props}
    />
  );
}
