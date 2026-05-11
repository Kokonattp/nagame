"use client";

import Link from "next/link";
import { Camera, Home, Map, Sparkles } from "lucide-react";

const items = [
  { label: "หน้าแรก", href: "/", icon: Home },
  { label: "สัญญาณ", href: "#signals", icon: Sparkles },
  { label: "กล้อง", href: "#livecam", icon: Camera },
  { label: "เมือง", href: "#local", icon: Map },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto max-w-[430px] px-8">
      <div className="grid grid-cols-4 rounded-full border border-white/70 bg-white/72 p-1.5 shadow-2xl shadow-zinc-900/15 backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-11 items-center justify-center rounded-full text-zinc-700 transition hover:bg-white"
              title={item.label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
