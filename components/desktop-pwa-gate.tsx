"use client";

import { Smartphone } from "lucide-react";

export function DesktopPwaGate() {
  return (
    <section className="hidden min-h-dvh items-center justify-center bg-[#080b18] p-8 text-white md:flex">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-zinc-950">
          <Smartphone className="h-8 w-8" aria-hidden />
        </div>
        <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-cyan-200">Nagame 眺め</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">ออกแบบมาสำหรับมือถือ</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-white/70">
          เปิด Nagame บน iPhone หรือ Android เพื่อใช้งานแบบ mobile app หรือกด Install / Add to Home Screen จาก browser เพื่อบันทึกเป็น PWA
        </p>
        <div className="mt-7 rounded-3xl bg-white/10 p-4 text-left text-sm leading-6 text-white/75">
          <p className="font-bold text-white">iPhone / iPad</p>
          <p>Safari → Share → Add to Home Screen</p>
          <p className="mt-3 font-bold text-white">Android / Chrome</p>
          <p>Chrome menu → Install app หรือ Add to Home screen</p>
        </div>
      </div>
    </section>
  );
}
