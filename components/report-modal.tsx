"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatThaiDate } from "@/lib/utils/format";

export function ReportModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="glass" className="h-10 px-3" onClick={() => setOpen(true)} title="เลือกวันที่">
        <CalendarDays className="h-4 w-4" aria-hidden />
        <span>{formatThaiDate()}</span>
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[390px] rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Date signal</p>
                <h2 className="text-xl font-bold">วันนี้ในญี่ปุ่น</h2>
              </div>
              <button className="rounded-full bg-zinc-100 p-2" onClick={() => setOpen(false)} title="ปิด">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="text-sm leading-6 text-zinc-600">
              V1 แสดงสัญญาณของวันนี้เป็นหลัก ข้อมูลอากาศและ AQI ถูก cache ประมาณ 30 นาทีเพื่อไม่เรียก API ซ้ำทุกครั้งที่เปิดหน้า
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
