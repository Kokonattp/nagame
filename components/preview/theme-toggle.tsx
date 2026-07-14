"use client";

// Theme toggle เบาๆ (ไม่ลง next-themes ในก้าว A) — สลับ data-theme บน <html> + จำใน localStorage.
// อ่านค่าก่อน paint ด้วย script inline ใน page ไม่ได้ที่นี่ จึง sync ใน effect (อาจกระพริบ 1 เฟรม
// บน route ทดสอบ — ยอมรับได้; หน้าจริงจะทำ no-flash script ตอน integrate).

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("nagame.theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    window.localStorage.setItem("nagame.theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      className="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-full border-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--nb-shadow-sm)] transition hover:-translate-y-px"
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
