"use client";

// "Alert me in Thai": registers this browser for quake/tsunami pushes for one trip's prefectures and
// dates (docs/quake-alerts.md). Hidden until the server has Supabase + VAPID keys. While on, any change
// to the route or dates re-registers silently, so the worker always matches the current plan.

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";

/** One town on the trip, as JMA codes it (weather 警報 are issued per municipality). */
export type JmaWatch = { office: string; areas: string[]; th: string };
type Props = { tripId: string; prefectures: string[]; jma: JmaWatch[]; places: string; startsOn: string | null; endsOn: string | null };
type State = "loading" | "hidden" | "ios-home" | "unsupported" | "off" | "on" | "turning-on" | "turning-off" | "denied" | "error";

const flagKey = (tripId: string) => `nagame-quake-alert:${tripId}`;

function urlB64ToBytes(b64: string) {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export function QuakeAlertToggle({ tripId, prefectures, jma, places, startsOn, endsOn }: Props) {
  const [state, setState] = useState<State>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const plan = useMemo(() => JSON.stringify({ prefectures, jma, startsOn, endsOn }), [prefectures, jma, startsOn, endsOn]);

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await fetch("/api/tabi/push", { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? ((await res.json()) as { enabled: boolean; publicKey: string | null }) : null;
      if (!live) return;
      if (!body?.enabled || !body.publicKey) return setState("hidden");
      setPublicKey(body.publicKey);
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-home" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      let on = false;
      try { on = localStorage.getItem(flagKey(tripId)) === "1"; } catch { /* private mode */ }
      setState(on ? "on" : "off");
    })();
    return () => { live = false; };
  }, [tripId]);

  async function save(): Promise<boolean> {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(publicKey!) }));
    const json = sub.toJSON();
    const res = await fetch("/api/tabi/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, tripId, prefectures, jma, startsOn, endsOn }),
    });
    return res.ok;
  }

  // route or dates changed while alerts are on → re-register for the new plan
  useEffect(() => {
    if (state !== "on" || !startsOn) return;
    save().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, state === "on"]);

  async function turnOn() {
    setState("turning-on");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      if (!(await save())) return setState("error");
      try { localStorage.setItem(flagKey(tripId), "1"); } catch { /* still on server-side */ }
      setState("on");
    } catch {
      setState("error");
    }
  }

  async function turnOff() {
    setState("turning-off");
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/tabi/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint, tripId }),
        });
      }
      try { localStorage.removeItem(flagKey(tripId)); } catch { /* ignore */ }
      setState("off");
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "hidden") return null;
  return (
    <div className="mt-3 rounded-2xl bg-[#fff6e0] p-3 text-sm" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold text-[var(--t-navy)]"><Bell size={16} aria-hidden />แจ้งเตือนภัยธรรมชาติเป็นภาษาไทย</p>
      {state === "ios-home" && (
        <p className="mt-1">บน iPhone ต้องเพิ่ม Nagame ลงหน้าจอโฮมก่อน: กดปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” จากนั้นเปิด Nagame จากไอคอนแล้วกลับมาเปิดที่นี่</p>
      )}
      {state === "unsupported" && <p className="mt-1">เบราว์เซอร์นี้รับแจ้งเตือนไม่ได้ ลองเปิดด้วย Chrome หรือ Safari</p>}
      {state === "denied" && <p className="mt-1">เบราว์เซอร์บล็อกการแจ้งเตือนของ Nagame อยู่ เปิดอนุญาตในการตั้งค่าเบราว์เซอร์ก่อน แล้วกลับมากดอีกครั้ง</p>}
      {(state === "off" || state === "turning-on" || state === "error") && (
        <>
          <p className="tabi-muted mt-1">แผ่นดินไหว สึนามิ ฝนตกหนัก และพายุ เด้งเตือนเมื่อ 気象庁 ประกาศ เฉพาะ{places} และเฉพาะช่วงวันเดินทาง</p>
          {startsOn ? (
            <button type="button" className="tabi-btn tabi-btn--primary mt-2 w-full" disabled={state === "turning-on"} onClick={turnOn}>
              <Bell size={18} />{state === "turning-on" ? "กำลังเปิด…" : "เปิดแจ้งเตือน"}
            </button>
          ) : (
            <p className="mt-2 font-semibold">ใส่วันออกเดินทางด้านบนก่อน แล้วเปิดแจ้งเตือนได้</p>
          )}
          {state === "error" && <p className="mt-1 text-[#c0392b]">เปิดไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
        </>
      )}
      {(state === "on" || state === "turning-off") && (
        <>
          <p className="mt-1">เปิดอยู่: เตือนเมื่อมีภัยที่{places} ระหว่างทริป</p>
          <button type="button" className="tabi-btn tabi-btn--soft mt-2 w-full" disabled={state === "turning-off"} onClick={turnOff}><BellOff size={18} />{state === "turning-off" ? "กำลังปิด…" : "ปิดแจ้งเตือน"}</button>
        </>
      )}
      <p className="tabi-muted mt-2 text-xs">แจ้งเตือนอาจช้าหรือไม่มาถึง ควรติดตั้งแอป Safety tips ไว้ด้วย</p>
    </div>
  );
}
