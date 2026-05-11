"use client";

import { useState } from "react";
import { CloudRain, Frown, Meh, Plus, Smile, Sun, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportModal({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        <button
          type="button"
          className="flex h-16 w-16 -translate-y-5 items-center justify-center rounded-full bg-violet-600 text-white shadow-2xl shadow-violet-700/35"
          onClick={() => setOpen(true)}
          title="รายงานสถานการณ์"
        >
          <Plus className="h-8 w-8" aria-hidden />
        </button>
      ) : (
        <Button variant="glass" className="h-10 px-3" onClick={() => setOpen(true)} title="รายงานสถานการณ์">
          <Plus className="h-4 w-4" aria-hidden />
          <span>รายงาน</span>
        </Button>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[390px] rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Nagame Signal</p>
                <h2 className="text-xl font-black">รายงานสถานการณ์</h2>
              </div>
              <button className="rounded-full bg-zinc-100 p-2" onClick={() => setOpen(false)} title="ปิด">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                สถานที่
                <input className="h-11 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-violet-400" placeholder="Tenjin, Fukuoka" />
              </label>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">คนหนาแน่น</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["น้อย", Smile],
                    ["ปานกลาง", Users],
                    ["หนาแน่น", Frown],
                  ].map(([label, Icon]) => (
                    <button key={label as string} className="rounded-2xl border border-zinc-200 p-3 text-xs font-bold text-zinc-700" type="button">
                      <Icon className="mx-auto mb-1 h-5 w-5 text-violet-600" aria-hidden />
                      {label as string}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">สภาพอากาศที่รู้สึก</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ["ดี", Smile],
                    ["ร้อน", Sun],
                    ["เย็น", Meh],
                    ["ฝนตก", CloudRain],
                  ].map(([label, Icon]) => (
                    <button key={label as string} className="rounded-2xl border border-zinc-200 p-3 text-xs font-bold text-zinc-700" type="button">
                      <Icon className="mx-auto mb-1 h-5 w-5 text-violet-600" aria-hidden />
                      {label as string}
                    </button>
                  ))}
                </div>
              </div>
              <textarea className="min-h-24 w-full rounded-2xl border border-zinc-200 p-3 text-sm outline-none focus:border-violet-400" placeholder="เช่น คนเยอะช่วงบ่าย ร้านเริ่มรอคิว" />
              <Button className="w-full bg-violet-600 shadow-violet-700/20" onClick={() => setOpen(false)}>
                ส่งรายงาน
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
