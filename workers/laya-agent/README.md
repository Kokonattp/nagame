# laya-agent (Rust)

A search-only browser agent in the style of Jev UltraFast, built so live search can keep working
on our own machine with Laya when Jev is unavailable (owner decision 2026-10-14).

- Opens **one URL** in a normal Chrome over the DevTools protocol (the same Chrome the live-search
  worker uses, `--cdp`, default `http://127.0.0.1:9224`).
- Each step, a System One model picks from a short typed list: **CLICK** a listed button (only to
  close a consent/cookie dialog), **WAIT**, **DONE**, **BLOCKED**. It never types, never follows
  links, never opens another site.
- Model order: Jev (`TYPESAFE_API_KEY`) → Laya (`LAYA_URL`, `LAYA_MODEL` default `multilingual`,
  `LAYA_API_KEY` optional). An answer that names an operation or target not offered executes nothing.
- Buttons that sign in, book, buy, pay, share, call or download are never offered to the model.
- A CAPTCHA / "unusual traffic" page ends the run at once (exit 2, `status: "blocked"`) — no retry,
  no workaround, no proxies.
- Results are read from the page's own DOM (`--read-js`); the model writes none of it.

## Build and run (PowerShell)
```powershell
cd D:\TT\nagame\workers\laya-agent
cargo build --release
$env:LAYA_URL = "http://127.0.0.1:7860/v1/systemone"
.\target\release\laya-agent.exe --url "https://www.google.com/maps/search/ramen+in+Kyoto+Japan?hl=en" `
  --goal "Show ramen restaurants in Kyoto. Close any consent dialog without signing in." `
  --read-js read-places.js --max-steps 6 --deadline 30
```
Prints one JSON object: `status` (done / blocked / error), `steps`, `url`, `title`, `text`, `read`,
`model`, `elapsedMs`. Exit 0 done, 2 blocked, 1 error.

## Tested (2026-10-14)
- `cargo test`: forbidden buttons never offered; block pages stop the run.
- Headless Chrome + local page with a consent dialog + scripted model: closes the dialog with
  "Reject all" (Sign in not offered) and reads the list; Jev down → Laya; CAPTCHA page → blocked
  with no model call; out-of-list target → error, nothing clicked; no model → error; Chrome down → error.
- **Not yet:** real Laya, real Google pages, and wiring into `workers/live-search/server.py`
  (next step once the machine and the Laya benchmark exist).
