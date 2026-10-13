"""Live search worker: Tabi asks, Jev UltraFast looks it up in a normal Chrome, Tabi answers.

Used only when the traveller asks for something outside the published snapshots and taps
"🔎 เช็กสด: …". It drives whatever Chrome LIVE_CDP_URL points at — Chrome on a small cloud
machine (see Dockerfile) or the owner's PC. Never a browser service that solves CAPTCHAs:
search only, no sign-in, no booking, and a block or CAPTCHA page ends the search.

  POST /search   Authorization: Bearer $LIVE_SEARCH_TOKEN
    {"kind": "flight", "to": "Sendai", "depart": "2026-12-10", "back": "2026-12-15"}
    {"kind": "eat", "area": "Sasebo", "what": "ramen"}
  GET  /health

Env: LIVE_SEARCH_TOKEN (required), LIVE_CDP_URL (default http://127.0.0.1:9224),
     LIVE_DAILY_CAP (default 100 searches a day), TYPESAFE_API_KEY, PORT (default 8790).
Run: uv run --project <jev-ultrafast> --env-file <env> python workers/live-search/server.py
"""

import json
import os
import re
import threading
import time
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, quote_plus

TOKEN = os.environ.get("LIVE_SEARCH_TOKEN", "")
CAP = int(os.environ.get("LIVE_DAILY_CAP", "100"))
PORT = int(os.environ.get("PORT", "8790"))
DEADLINE_S = 40  # the app waits ~55 s in total
os.environ.setdefault("BU_CDP_URL", os.environ.get("LIVE_CDP_URL", "http://127.0.0.1:9224"))
os.environ.setdefault("BU_NAME", "nagame-live")

from jev_ultrafast import Agent  # noqa: E402  (after BU_* so the harness attaches to our Chrome)

BLOCKED = re.compile(r"unusual traffic|captcha|are you a robot|not a robot|/sorry/", re.I)
NAME = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,39}$")
WHAT = {"restaurant", "ramen", "sushi", "udon soba", "yakiniku", "tempura tonkatsu", "okonomiyaki",
        "izakaya", "seafood", "cafe sweets", "kaiseki", "curry", "cheap"}
TTL = {"flight": 6 * 3600, "eat": 30 * 86400}  # prices move within hours, restaurants within months

GOALS = {
    "flight": "Show Google Flights results for this round trip. If a consent dialog is open, close it without signing in. "
              "Stop as soon as flight options with prices are visible. Do not sign in, select a flight, or book.",
    "eat": "Show Google Maps search results for restaurants in this area. If a consent or cookie dialog is open, close it "
           "without signing in. Stop as soon as a list of restaurants with star ratings is visible. Do not sign in, "
           "open a website, call, book, or share anything.",
}

# same reading as workers/eat-places/collect.py: names/ratings/coords from the result links
READ_EAT = r"""(() => {
  const out = [];
  for (const a of document.querySelectorAll('a[href*="/maps/place/"]')) {
    const name = (a.getAttribute('aria-label') || '').trim();
    if (!name) continue;
    const card = a.closest('[role="article"]') || a.parentElement;
    const text = (card?.innerText || '').replace(/\s+/g, ' ');
    const rate = text.match(/(\d\.\d)\s*\(([\d,.]+)(K?)\)/);
    const coord = a.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const after = rate ? text.slice(text.indexOf(rate[0]) + rate[0].length).split('·').map(s => s.trim()) : [];
    out.push({ n: name, r: rate ? Number(rate[1]) : null,
      rc: rate ? Math.round(Number(rate[2].replace(/,/g, '')) * (rate[3] ? 1000 : 1)) : null,
      la: coord ? Number(coord[1]) : null, lo: coord ? Number(coord[2]) : null,
      cat: after[0] && after[0].length < 40 ? after[0] : '', url: a.href.split('?')[0] });
  }
  return out;
})()"""


def parse_flights(raw):
    """Port of parseResults in workers/flight-prices/collect.mjs (Google Flights, hl=en, THB)."""
    text = re.sub(r"[   ]", " ", raw)
    start = text.find("Top departing flights")
    if start < 0:
        return None, []
    m = re.search(r"Cheapest\s*\n?\s*from\s*\n?[^\n]*?\n?\s*THB ([\d,]+)", text)
    cheapest = int(m.group(1).replace(",", "")) if m else None
    flights = []
    for block in re.split(r"\n\s*round trip\s*\n", text[start:]):
        lines = [x.strip() for x in block.split("\n") if x.strip()]
        price = next((x for x in reversed(lines) if re.fullmatch(r"THB [\d,]+", x)), None)
        dur = next((i for i, x in enumerate(lines) if re.fullmatch(r"\d+ hr( \d+ min)?", x)), -1)
        route = next((x for x in lines if re.fullmatch(r"[A-Z]{3}–[A-Z]{3}", x)), None)
        stops = next((x for x in lines if re.fullmatch(r"Nonstop|\d+ stops?", x)), None)
        if not price or dur < 1 or not route or not stops:
            continue
        flights.append({"price": int(price[4:].replace(",", "")), "airline": re.sub(r"Operated by (.+)$", r" (บินโดย \1)", lines[dur - 1]),
                        "duration": lines[dur], "route": route, "nonstop": stops == "Nonstop"})
    if cheapest is None and flights:
        cheapest = min(f["price"] for f in flights)
    return cheapest, flights


def validate(body):
    kind = body.get("kind")
    if kind == "flight":
        to = str(body.get("to", ""))
        d1, d2 = str(body.get("depart", "")), str(body.get("back", ""))
        try:
            a, b = date.fromisoformat(d1), date.fromisoformat(d2)
        except ValueError:
            raise ValueError("dates must be YYYY-MM-DD")
        today = date.today()
        if not NAME.match(to) or not (today <= a <= b <= today + timedelta(days=330)) or (b - a).days > 30:
            raise ValueError("bad flight request")
        return kind, {"to": to, "depart": d1, "back": d2}
    if kind == "eat":
        area, what = str(body.get("area", "")), str(body.get("what", "restaurant"))
        if not NAME.match(area) or what not in WHAT:
            raise ValueError("bad restaurant request")
        return kind, {"area": area, "what": what}
    raise ValueError("kind must be flight or eat")


def url_for(kind, q):
    if kind == "flight":
        words = f"Flights to {q['to']} from Bangkok on {q['depart']} through {q['back']}"
        return f"https://www.google.com/travel/flights?hl=en&curr=THB&q={quote(words)}"
    word = "restaurants" if q["what"] in {"restaurant", "cheap"} else q["what"]
    words = f"{word} in {q['area']} Japan"
    return f"https://www.google.com/maps/search/{quote_plus(words)}?hl=en"


def run_search(kind, q):
    url = url_for(kind, q)
    agent = Agent(url, GOALS[kind])
    t0 = time.monotonic()
    try:
        for _ in agent.run():
            if time.monotonic() - t0 > DEADLINE_S:
                break
        text = agent.browser.evaluate("document.body.innerText") or ""
        if BLOCKED.search(agent.browser.evaluate("location.href") + text[:3000]):
            return {"blocked": True}
        if kind == "flight":
            if q["depart"] not in text:  # results stream in; the page names its own dates when they belong to this trip
                time.sleep(5)
                text = agent.browser.evaluate("document.body.innerText") or ""
            cheapest, flights = parse_flights(text)
            if q["depart"] not in text:
                cheapest, flights = None, []
            nonstop = min((f for f in flights if f["nonstop"]), key=lambda f: f["price"], default=None)
            return {"cheapest": cheapest, "nonstop": nonstop, "results": len(flights), "url": url}
        rows = [r for r in agent.browser.evaluate(READ_EAT) if (r["r"] or 0) >= 3.8 and (r["rc"] or 0) >= 20 and r["la"] is not None]
        seen, out = set(), []
        for r in sorted(rows, key=lambda r: (r["r"] * r["rc"] + 400) / (r["rc"] + 100), reverse=True):
            if r["n"] not in seen:
                seen.add(r["n"])
                out.append(r)
        return {"places": out[:8], "url": url}
    finally:
        agent.close()


class State:
    lock = threading.Lock()  # one Chrome, one search at a time
    day, used = date.today(), 0
    cache: dict = {}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # no request bodies in logs
        print(f"{self.address_string()} {fmt % args}", flush=True)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True, "usedToday": State.used, "cap": CAP})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/search":
            return self._send(404, {"error": "not found"})
        if not TOKEN or self.headers.get("Authorization") != f"Bearer {TOKEN}":
            return self._send(401, {"error": "unauthorized"})
        try:
            body = json.loads(self.rfile.read(min(int(self.headers.get("Content-Length", 0)), 4096)) or b"{}")
            kind, q = validate(body)
        except (ValueError, json.JSONDecodeError) as e:
            return self._send(400, {"error": str(e)})
        key = json.dumps([kind, q], sort_keys=True)
        hit = State.cache.get(key)
        if hit and time.time() - hit[0] < TTL[kind]:
            return self._send(200, {**hit[1], "checkedAt": hit[2], "cached": True})
        if State.day != date.today():
            State.day, State.used = date.today(), 0
        if State.used >= CAP:
            return self._send(429, {"error": "daily cap reached"})
        if not State.lock.acquire(blocking=False):
            return self._send(429, {"error": "busy"})
        try:
            State.used += 1
            t0 = time.monotonic()
            result = run_search(kind, q)
            stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
            print(f"{kind} {q} → {'blocked' if result.get('blocked') else 'ok'} in {time.monotonic() - t0:.1f}s", flush=True)
            if result.get("blocked"):
                return self._send(503, {"error": "blocked"})
            State.cache[key] = (time.time(), result, stamp)
            return self._send(200, {**result, "checkedAt": stamp, "cached": False})
        except Exception as e:  # a broken page must not take the worker down
            print(f"{kind} failed: {e}", flush=True)
            return self._send(502, {"error": "search failed"})
        finally:
            State.lock.release()


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("Set LIVE_SEARCH_TOKEN")
    print(f"live search on :{PORT}, Chrome at {os.environ['BU_CDP_URL']}, cap {CAP}/day", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
