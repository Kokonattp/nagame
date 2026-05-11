"use client";

import Link from "next/link";
import { Camera, Home, MapPin, Sparkles } from "lucide-react";

const items = [
  { label: "วันนี้", href: "/", icon: Home },
  { label: "แผนที่", href: "#map", icon: MapPin },
  { label: "กล้อง", href: "#livecam", icon: Camera },
  { label: "แนะนำ", href: "#local", icon: Sparkles },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto max-w-[430px] px-8 lg:hidden">
      <div className="grid grid-cols-4 items-center rounded-[2rem] border border-white/70 bg-white/86 px-2 py-1.5 shadow-2xl shadow-zinc-900/15 backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-14 flex-col items-center justify-center rounded-2xl text-violet-600 transition hover:bg-white"
              title={item.label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="mt-1 text-[11px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
