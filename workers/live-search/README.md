# Live search worker ("🔎 เช็กสด: …")

When a traveller asks for something the published snapshots don't cover — the fare for their
exact dates, or a dish Tabi has no restaurant names for — Tabi offers a **🔎 เช็กสด** chip.
Tapping it sends only the destination + dates, or the area + dish, to this worker. Jev UltraFast
opens Google Flights / Google Maps in a normal Chrome, the page's own results are read
(nothing generated), and Tabi answers with "ทาบิเพิ่งเช็ก…".

- **Off by default.** The chip appears only when Vercel has `LIVE_SEARCH_URL` and `LIVE_SEARCH_TOKEN`.
- **Search only.** No sign-in, no booking. A block or CAPTCHA page ends the search (HTTP 503);
  Tabi then shows the Google link instead. Do **not** point it at a browser service that solves
  CAPTCHAs (Browser Use Cloud does, always) — project rule.
- **Bounded.** One search at a time (a second gets "busy"), `LIVE_DAILY_CAP` searches a day
  (default 100), results cached in memory (flights 6 h, restaurants 30 days).
- Tested: Sasebo ramen 3.4 s, Bangkok ⇄ Sendai 7.4 s, Bangkok ⇄ Tokyo 7.6 s, cache hit 0.06 s.

## Endpoints
```
GET  /health                                   {"ok": true, "usedToday": 3, "cap": 100}
POST /search   Authorization: Bearer <token>
     {"kind":"flight","to":"Sendai","depart":"2026-12-10","back":"2026-12-15"}
     {"kind":"eat","area":"Sasebo","what":"ramen"}
```

## Run on the owner's PC (PowerShell)
```powershell
cd D:\TT\nagame
# Chrome with the worker's own profile
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9224 --user-data-dir=D:\TT\nagame-workers\chrome-cdp-profile --no-first-run about:blank
$env:LIVE_SEARCH_TOKEN = "<a long random string>"
uv run --project D:\TT\nagame-workers\jev-ultrafast --env-file .env.local python workers/live-search/server.py
```
The site can only reach it through a tunnel (e.g. `cloudflared tunnel --url http://localhost:8790`),
and only while the PC is on.

## Run on a small cloud machine (Docker)
`Dockerfile` = Google Chrome on a virtual display + Jev UltraFast (pinned commit) + `server.py`.
Any Docker host works (Fly.io, Railway, Runpod CPU). Example with Fly.io:
```powershell
cd D:\TT\nagame
fly launch --no-deploy --dockerfile workers/live-search/Dockerfile --internal-port 8790
fly secrets set LIVE_SEARCH_TOKEN=<random> TYPESAFE_API_KEY=<key>
fly deploy
```
Then in Vercel (Production): `LIVE_SEARCH_URL=https://<app>.fly.dev` and the same `LIVE_SEARCH_TOKEN`.

A cloud machine has a data-centre IP, so Google may show "unusual traffic" more often than at
home; the worker stops on that and Tabi falls back to the link. Do not add proxies or anything
that disguises the browser to get around it.
