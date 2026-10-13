# Live search worker for a small cloud machine (Fly.io, Railway, Runpod CPU, any Docker host).
# One container: a normal Google Chrome on a virtual display (no headless flags, nothing faked)
# + Jev UltraFast + workers/live-search/server.py. No CAPTCHA-solving browser service.
#
# Build from the repo root:
#   docker build -f workers/live-search/Dockerfile -t nagame-live .
# Run (secrets come from the host's secret store, never baked into the image):
#   docker run -p 8790:8790 -e LIVE_SEARCH_TOKEN=... -e TYPESAFE_API_KEY=... nagame-live

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends wget gnupg ca-certificates git xvfb fonts-noto-cjk \
 && wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /usr/share/keyrings/google.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv
# pinned to the commit the worker was tested with
RUN git clone https://github.com/browser-use/jev-ultrafast.git /opt/jev \
 && cd /opt/jev && git checkout 1231850a0bf1a0c0341fe408ef1668dbbfdfac46 && uv sync --frozen

COPY workers/live-search/server.py /app/server.py

RUN useradd -m tabi && mkdir -p /data/chrome && chown -R tabi /data /opt/jev /app
USER tabi
ENV PORT=8790 LIVE_CDP_URL=http://127.0.0.1:9224 DISPLAY=:99 BH_OPEN_LIVE_URL=0 BH_UPDATE_CHECK=0
EXPOSE 8790

CMD Xvfb :99 -screen 0 1280x900x24 & \
    google-chrome --remote-debugging-port=9224 --user-data-dir=/data/chrome --no-first-run --no-default-browser-check --disable-dev-shm-usage about:blank & \
    sleep 3 && cd /opt/jev && exec uv run --frozen python /app/server.py
