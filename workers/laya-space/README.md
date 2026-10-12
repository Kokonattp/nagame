---
title: Nagame Laya
emoji: 🐾
colorFrom: blue
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Laya for Nagame's Tabi

[Laya](https://huggingface.co/convaiinnovations/laya) (Apache-2.0) served with `laya-serve`, which
speaks the same `POST /v1/systemone` protocol as TypeSafe's Jev. Only the multilingual checkpoint
is loaded (Thai messages). Requests need `Authorization: Bearer <LAYA_API_KEY>`.

## Set up (owner)

1. huggingface.co → New Space → SDK **Docker** → hardware **CPU basic (free)**.
2. Upload this folder's `Dockerfile` and `README.md` to the Space.
3. Space → Settings → Variables and secrets → **New secret** `LAYA_API_KEY` = a long random string.
4. Wait for "Running" (first build ~10 min, first request downloads the checkpoint).

A free Space sleeps when unused; the first request after that waits for it to wake.

## Try it from Nagame (PowerShell)

```powershell
$env:SYSTEM_ONE_URL = "https://<user>-<space>.hf.space/v1/systemone"
$env:SYSTEM_ONE_MODEL = "multilingual"
$env:TYPESAFE_API_KEY = "<the LAYA_API_KEY secret>"
npx next dev -p 3210
# another window: $env:BASE = "http://localhost:3210"; node scripts/eval-tabi.mjs
```
