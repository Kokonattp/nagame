# Flight price snapshots (owner's PC)

Tabi shows "ไป-กลับเริ่ม ~฿X · บินตรง ~฿Y (ทาบิเช็กเมื่อ …)" on the flights screen and in its chat
answer. Vercel cannot run Chrome, so the prices are collected here and published as
`data/flights/snapshot.json`.

## How it works
- Opens a **normal Chrome** with its own profile (`D:\TT\nagame-workers\chrome-cdp-profile`) and
  remote debugging — the same way Jev ultrafast drives Chrome. Nothing is faked to look human.
- Reads Google Flights results for Bangkok ⇄ Tokyo, Osaka, Nagoya, Fukuoka, Sapporo, Okinawa,
  one sample round trip per month (10th → 15th) for the next 6 months: 36 searches, 20 s apart.
- Keeps a price only when the page confirms the requested dates.
- **Stops at once** on a block or CAPTCHA and keeps the previous snapshot. Search only: no login,
  booking, payment or personal data. Skyscanner is not used (it shows a CAPTCHA).
- The site hides snapshots older than 14 days, so stale prices never show.

## Cheapest dates in a month (`calendar.mjs`)
Opens Google Flights' **Price graph** once per city and reads the round-trip price of every departure
date (hover each bar; a price is kept only when the tooltip names that bar's date), scrolling about
6 months ahead, for 5- and 7-day trips. Tabi uses it for "ไป ม.ค. 5 วัน ช่วงไหนถูก" and offers the 3
cheapest ranges; picking one sets the trip dates. Output: `data/flights/calendar.json` (server only).

## Run (PowerShell)
```powershell
cd D:\TT\nagame
powershell -ExecutionPolicy Bypass -File workers\flight-prices\run.ps1
```
`run.ps1` collects, then commits and pushes the snapshot (Vercel redeploys on push).

Only some cities, keeping the rest: `node workers/flight-prices/collect.mjs --gateways=OKA,CTS`

## Daily, automatically
```powershell
schtasks /Create /SC DAILY /ST 07:30 /TN "Nagame flight prices" /TR "powershell -ExecutionPolicy Bypass -File D:\TT\nagame\workers\flight-prices\run.ps1"
```
The PC must be on at that time. Remove with `schtasks /Delete /TN "Nagame flight prices"`.
