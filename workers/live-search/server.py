"""Live search worker: Tabi asks, Jev UltraFast looks it up in a normal Chrome, Tabi answers.

Every flight and restaurant question goes through here first; when the worker is busy, over its
daily cap, blocked or down, Tabi answers from the published snapshots instead. It drives whatever Chrome LIVE_CDP_URL points at — Chrome on a small cloud
machine (see Dockerfile) or the owner's PC. Never a browser service that solves CAPTCHAs:
search only, no sign-in, no booking, and a block or CAPTCHA page ends the search.

  POST /search   Authorization: Bearer $LIVE_SEARCH_TOKEN
    {"kind": "flight", "to": "Sendai", "depart": "2026-12-10", "back": "2026-12-15"}
    {"kind": "eat", "area": "Sasebo", "what": "ramen"}
    {"kind": "stay" | "buy" | "sight", "area": "Kyoto", "what": "hotels" | "souvenir shops" | "temples" …}
    {"kind": "rail", "from": "Kyoto Station", "to": "Osaka Station"}
  GET  /health

Env: LIVE_SEARCH_TOKEN (required), LIVE_CDP_URL (default http://127.0.0.1:9224),
     LIVE_DAILY_CAP (default 1000 new searches a day, everyone together), LIVE_USER_DAILY_CAP (default 10
     a day per visitor), LIVE_CACHE_FILE (results kept across restarts), TYPESAFE_API_KEY, PORT (default 8790).
Run: uv run --project <jev-ultrafast> --env-file <env> python workers/live-search/server.py
"""

import json
import os
import re
import threading
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, quote_plus

TOKEN = os.environ.get("LIVE_SEARCH_TOKEN", "")
CAP = int(os.environ.get("LIVE_DAILY_CAP", "1000"))
# one visitor must not use up the day for everyone; the app sends a one-day hash, never an address
USER_CAP = int(os.environ.get("LIVE_USER_DAILY_CAP", "10"))
USER_ID = re.compile(r"^[a-f0-9]{16}$")
CACHE_FILE = os.environ.get("LIVE_CACHE_FILE") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "live-search-cache.json")
PORT = int(os.environ.get("PORT", "8790"))
DEADLINE_S = 30  # one search; the app waits ~50 s in total
QUEUE_S = 15  # how long a question waits for the one Chrome
os.environ.setdefault("BU_CDP_URL", os.environ.get("LIVE_CDP_URL", "http://127.0.0.1:9224"))
os.environ.setdefault("BU_NAME", "nagame-live")

from jev_ultrafast import Agent  # noqa: E402  (after BU_* so the harness attaches to our Chrome)

BLOCKED = re.compile(r"unusual traffic|captcha|are you a robot|not a robot|/sorry/", re.I)
NAME = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,39}$")
# what each place search may ask Google Maps for (the app sends one of these words, nothing free-form)
WHAT = {
    "eat": {"restaurant", "ramen", "sushi", "udon soba", "yakiniku", "tempura tonkatsu", "okonomiyaki",
            "izakaya", "seafood", "cafe sweets", "kaiseki", "curry", "cheap"},
    "stay": {"hotels", "ryokan", "hostels", "business hotels"},
    "buy": {"souvenir shops", "department stores", "markets", "electronics stores", "drugstores", "food gift shops", "shopping"},
    "sight": {"tourist attractions", "temples", "shrines", "castles", "museums", "parks", "onsen", "viewpoints"},
}
PLACE_KINDS = set(WHAT)
# prices move within hours (fares, room rates); places and train fares within months
TTL = {"flight": 6 * 3600, "stay": 6 * 3600, "eat": 30 * 86400, "buy": 30 * 86400, "sight": 30 * 86400, "rail": 30 * 86400}

GOALS = {
    "flight": "Show Google Flights results for this round trip. If a consent dialog is open, close it without signing in. "
              "Stop as soon as flight options with prices are visible. Do not sign in, select a flight, or book.",
    "eat": "Show Google Maps search results for restaurants in this area. If a consent or cookie dialog is open, close it "
           "without signing in. Stop as soon as a list of restaurants with star ratings is visible. Do not sign in, "
           "open a website, call, book, or share anything.",
    "stay": "Show Google Maps search results for places to stay in this area. If a consent or cookie dialog is open, close it "
            "without signing in. Stop as soon as a list of hotels with star ratings is visible. Do not sign in, open a "
            "website, check availability, book, or share anything.",
    "buy": "Show Google Maps search results for shops in this area. If a consent or cookie dialog is open, close it without "
           "signing in. Stop as soon as a list of shops with star ratings is visible. Do not sign in, buy, or share anything.",
    "sight": "Show Google Maps search results for places to visit in this area. If a consent or cookie dialog is open, close it "
             "without signing in. Stop as soon as a list of places with star ratings is visible. Do not sign in, book, or share anything.",
    "rail": "Show Google Maps public transport directions between these two stations. If a consent or cookie dialog is open, "
            "close it without signing in. Stop as soon as the route options with travel times and fares are visible. "
            "Do not sign in, buy tickets, or share anything.",
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
    // hotels show tonight's rate ("THB 6,169", "¥12,000", "THB 14K"); ads are labelled "Sponsored"
    const pm = text.match(/(THB|JPY|¥)\s?([\d.,]+)(K?)/);
    const price = pm ? { cur: pm[1] === 'THB' ? 'THB' : 'JPY', amount: Math.round(Number(pm[2].replace(/,/g, '')) * (pm[3] ? 1000 : 1)) } : null;
    if (/Sponsored/.test(text)) continue;
    out.push({ n: name, r: rate ? Number(rate[1]) : null, price,
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
    if kind in PLACE_KINDS:
        area, what = str(body.get("area", "")), str(body.get("what", ""))
        if not NAME.match(area) or what not in WHAT[kind]:
            raise ValueError(f"bad {kind} request")
        return kind, {"area": area, "what": what}
    if kind == "rail":
        a, b = str(body.get("from", "")), str(body.get("to", ""))
        if not NAME.match(a) or not NAME.match(b) or a == b:
            raise ValueError("bad rail request")
        return kind, {"from": a, "to": b}
    raise ValueError("kind must be flight, rail, eat, stay, buy or sight")


def url_for(kind, q):
    if kind == "flight":
        words = f"Flights to {q['to']} from Bangkok on {q['depart']} through {q['back']}"
        return f"https://www.google.com/travel/flights?hl=en&curr=THB&q={quote(words)}"
    if kind == "rail":
        # public transport (3e3) leaving 10:00 tomorrow (8j = local time as epoch seconds): at night the
        # first option is a night bus with no fare shown; mid-morning it is the train people actually take
        d = date.today() + timedelta(days=1)
        t10 = int(datetime(d.year, d.month, d.day, 10, 0, tzinfo=timezone.utc).timestamp())
        return (f"https://www.google.com/maps/dir/{quote_plus(q['from'] + ' Japan')}/{quote_plus(q['to'] + ' Japan')}"
                f"/data=!4m6!4m5!2m3!6e0!7e2!8j{t10}!3e3?hl=en")
    word = "restaurants" if q["what"] in {"restaurant", "cheap"} else q["what"]
    words = f"{word} in {q['area']} Japan"
    return f"https://www.google.com/maps/search/{quote_plus(words)}?hl=en"


def chrome_up():
    """The browser harness waits 30 s for a dead Chrome; check in 2 s so Tabi can fall back at once."""
    try:
        urllib.request.urlopen(f"{os.environ['BU_CDP_URL'].rstrip('/')}/json/version", timeout=2)
        return True
    except OSError:
        return False


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
        if kind == "rail":
            # only the first (best) option is expanded: "2 hr 15 min / 10:00 AM—12:15 PM / Tokaido Shinkansen / … / ¥13,320 / Details"
            if "¥" not in text:
                time.sleep(3)
                text = agent.browser.evaluate("document.body.innerText") or ""
            text = re.sub(r"[   ]", " ", text)
            start = text.find("Copy link")
            block = text[start: text.find("Details", start)] if start >= 0 and "Details" in text[start:] else ""
            lines = [x.strip() for x in block.splitlines() if x.strip()]
            fare = re.search(r"¥\s?([\d,]+)", block)
            dur = next((x for x in lines if re.fullmatch(r"\d+ hr(?: \d+ min)?|\d+ min", x)), None)
            t = next((i for i, x in enumerate(lines) if "—" in x), -1)
            line = lines[t + 1] if 0 <= t < len(lines) - 1 and not lines[t + 1].startswith("¥") else None
            return {"yen": int(fare.group(1).replace(",", "")) if fare else None, "duration": dur, "line": re.sub(r"\s{2,}", " · ", line) if line else None, "url": url}
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
    users: dict = {}  # visitor hash → new searches today
    cache: dict = {}


def load_cache():
    """Results survive a restart: a redeploy must not send every question back to Google."""
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            saved = json.load(f)
    except (OSError, ValueError):
        return
    now = time.time()
    for key, (at, result, stamp) in saved.items():
        try:
            kind = json.loads(key)[0]
        except ValueError:
            continue
        if kind in TTL and now - at < TTL[kind]:
            State.cache[key] = (at, result, stamp)
    print(f"cache: {len(State.cache)} results from {CACHE_FILE}", flush=True)


def save_cache():
    now = time.time()
    for key in [k for k, v in State.cache.items() if now - v[0] >= TTL[json.loads(k)[0]]]:
        del State.cache[key]
    try:
        tmp = CACHE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(State.cache, f, ensure_ascii=False)
        os.replace(tmp, CACHE_FILE)
    except OSError as e:  # a read-only disk only costs the cache
        print(f"cache not saved: {e}", flush=True)


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
            return self._send(200, {"ok": True, "usedToday": State.used, "cap": CAP, "userCap": USER_CAP, "cached": len(State.cache)})
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
            State.day, State.used, State.users = date.today(), 0, {}
        if State.used >= CAP:
            return self._send(429, {"error": "daily cap reached"})
        user = self.headers.get("X-Live-User", "")
        user = user if USER_ID.match(user) else None
        if user and State.users.get(user, 0) >= USER_CAP:
            return self._send(429, {"error": "user cap reached"})
        # one Chrome: later questions queue briefly, then the app falls back to its snapshots
        if not State.lock.acquire(timeout=QUEUE_S):
            return self._send(429, {"error": "busy"})
        try:
            if not chrome_up():
                print("Chrome is not reachable — answering from snapshots", flush=True)
                return self._send(503, {"error": "browser down"})
            State.used += 1
            if user:
                State.users[user] = State.users.get(user, 0) + 1
            t0 = time.monotonic()
            result = run_search(kind, q)
            stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
            print(f"{kind} {q} → {'blocked' if result.get('blocked') else 'ok'} in {time.monotonic() - t0:.1f}s", flush=True)
            if result.get("blocked"):
                return self._send(503, {"error": "blocked"})
            State.cache[key] = (time.time(), result, stamp)
            save_cache()
            return self._send(200, {**result, "checkedAt": stamp, "cached": False})
        except Exception as e:  # a broken page must not take the worker down
            print(f"{kind} failed: {e}", flush=True)
            return self._send(502, {"error": "search failed"})
        finally:
            State.lock.release()


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("Set LIVE_SEARCH_TOKEN")
    load_cache()
    print(f"live search on :{PORT}, Chrome at {os.environ['BU_CDP_URL']}, cap {CAP}/day, {USER_CAP}/day per visitor", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
