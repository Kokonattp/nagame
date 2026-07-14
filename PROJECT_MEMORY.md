# Project memory

## Kruak weather mascot

- The dashboard uses the **Kruak** Japanese bobtail cat mascot for weather-state feedback. Final transparent assets live in `public/kruak/`; `lib/game/kruak.ts` is the central asset registry, and UI should use `components/kruak-avatar.tsx` rather than hard-code artwork paths.
- `getKruakMood` must retain this priority order: severe warning → AQI above 100 → rain chance at least 60% → rain chance at most 15% → idle.
- Asset mapping: `kruak-worried`, `kruak-dust`, `kruak-rain`, `kruak-sunny`, and `kruak-idle`, respectively.
- The design is a warm washi-paper, Showa-inspired kawaii **Japanese neko traveler**: vermilion forehead patch `#D64000`, indigo sashiko traveler scarf `#1A3A32`, muted-gold bell `#B98A20`, a small vermilion furoshiki travel bundle, and ink outline `#2B2622`. Keep future variants visually consistent with this set.

## Product direction v2.1 (decided 2026-07-14, mockup-approved, not yet built)

Approved via Fable-advised UX plan + owner decisions. Mockups are Artifacts only; **no app code changed yet**. Build against this when implementing.

**IA — 4 tabs (no more):** `แชท (Chat)` · `แผนที่ (Map)` · `สมุดฝาท่อ (Manhole book)` · `ทริป (Trip)`.
- **Chat is the primary surface and must never disappear.** It is the router: Kruak recommends → deep-links into Map/Book/Trip pre-filtered.
- **"Stays" is NOT a tab.** Accommodations, restaurants, flights are **map layers** (toggle chips). The Rakuten stay-card list is the map's result view (bottom-sheet mobile / right-docked panel desktop).
- **Trip tab** = the itinerary Kruak assembles from chat (flights + booked stays + planned districts + uncollected manholes). It's the "glue" that makes chat feel productive.

**Shell:** Desktop (≥1080px) = two-pane (left ~384px Kruak+chat always alive; right = stage swapping Map/Book/Trip). Mobile = 4 bottom tabs, Chat default. Build Chat/Map/Book/Trip as **shell-agnostic components** — shell is a layout concern.

**Map = "washi woodblock", calm + neo-brutalist.** Principle: *hard borders (brutalist) + soft fills (calm)*. NOT CARTO's saturated orange-red. Custom style (plan: MapLibre GL + custom style JSON). Choropleth = single-hue gold ramp on washi with 1.5px ink cell borders; vermilion `#c8503c` reserved ONLY for selected/active states + Kruak. Anti-dashboard rule: **no data on the map without a Kruak-voiced frame** (filters phrased as Kruak's questions).

**Kruak stays present on map (3 patterns):** (1) Kruak IS the focus pin, weather-reactive; (2) Kruak = filter narrator corner bubble reacting to filter state ("งบเท่านี้เจอ 12 ที่"); (3) Kruak-annotated hero pins with handwritten notes, not rating badges.

**Manhole game** = evolve the existing 御朱印帳 stamp code (keep the book container + progress bar + locked slots). Reward art = per-district **マンホール (manhole cover)** illustrations. Template system: one shared circular frame, only center motif varies (matches `docs/kruak-image-prompts.md` pipeline). Collect via GPS proximity check-in (fallback: Kruak micro-quest). Unlocked = color on map; locked = grey ghost outline on map. First city = **Tokyo** (浅草/谷中/上野 + 渋谷/新宿). **Do NOT copy real municipal manhole art 1:1** (trademark) — "inspired-by" motifs only.

**Pixel accent:** keep washi/retro as the master system (Codex-generated Kruak PNGs stay). Pixel/8-bit art is an **accent confined to the game/map layer** (landmark sprites, manhole texture) — never the whole UI, to preserve premium feel.

**Landmarks:** 3–5 hero landmarks per district as pixel sprites on the map, **tied to the manhole game** (a landmark with 🕳️ is that district's collection point). Keeps the map from becoming pin-clutter.

**Navigation = deep-link, not built in-house.** Kruak describes transit in plain words ("นั่ง Ginza line ~8 นาที") + a button that opens Google Maps / transit apps. Do NOT pay for Google Directions API or embed Google's map (would break washi direction). Our washi map is display; Google is the nav handoff.

**Neighbouring cities:** single map, zoom out to reveal secondary cities (Yokohama, Kamakura). Locked cities unlock when the current city's manholes are fully collected (retention hook). No separate city-picker screen.

**Two skill levels, one app:** toggle at top of chat. Beginner = Kruak plots the walking route for you (雷門→temple→food). Expert = route off, free exploration. Goal: fun for both first-timers and repeat visitors.

**Revenue unchanged:** Rakuten Travel accommodations (NOT reverse-engineered) via booking deep-links is the main leg. Flights = mockup now, deep-link later.

**Fable tiering for build:** Real-now = map + Rakuten stays layer + manhole reskin of existing stamp code. Mockup-now = restaurant data, choropleth density. Later = GPS check-in.

## v1 scope — refined by Fable completeness audit (2026-07-14, owner-approved)

Fable audited the full plan. Owner accepted nearly all of it (kept isometric map against Fable's cost concern — "เสน่ห์คุ้มค่า"). **This is the real v1 scope; build against this.**

**v1 = Chat + 1-city (Tokyo) illustrated map + Trip.** Everything else is v1.5+.

**⚠️ CORRECTION (owner overrode Fable, 2026-07-14): FLIGHTS STAY. Fable misread the intent.** Fable saw flights as "cold OTA price-comparison" and cut them. Owner's actual intent is the OPPOSITE and it is core: **flights + stays + restaurants are "all the info in ONE place so the user never has to go hunt for it," and Kruak PROACTIVELY pulls & narrates it.** The pain being solved: on Skyscanner you must input dates/months yourself and dig; with Kruak you just ask and he tells you "ช่วงนี้บินไปโตเกียว สายการบิน X ราคาเท่านี้, ที่พักย่านนี้เท่านี้." **That aggregation-by-a-friend IS the warmth, not the coldness.** So flights are kept — but framed as *Kruak fetches & speaks the info* (price per airline for the asked period, alongside stays), NOT a Skyscanner-style comparison tab the user operates. Architecture guard still applies: flights via fragile fli/Google-Flights = optional enrichment, fail-silent, cache heavy, deep-link fallback, never promise price in the first sentence — but the *capability* is v1 intent, not cut.

**CUT from v1 (owner-approved):**
- **Beginner/Expert mode toggle** — double QA for a distinction users won't understand at launch. Ship one mode; infer expertise from behavior later. (Owner confirmed this cut.)
- **Neighbouring-city zoom-out + city LOCKING** — locking Yokohama behind Tokyo stamps punishes real travelers (someone flying into Osaka locked out of their own trip). Defer; when it returns, stamps must *unlock bonuses*, never *lock access*.
- **Tabelog per-restaurant scraping** from v1 (legal/fragility cost) — Google Places is enough to start.

**ADD to v1 (owner-approved, were previously "later"):**
- **LINE Login + persistent Kruak memory = v1, NOT later.** localStorage contradicts "Kruak remembers you" — a cleared cache erases the relationship. Every Thai user has LINE. This is the single highest-leverage feature: a friend who remembers your last trip / pace / shrimp allergy is unduplicable by Google/Agoda/ChatGPT, and it's the prerequisite that makes stamps, trips, and freemium real. **The real retention engine is Kruak's memory; the stamp book is its visible artifact.**
- **During-trip mode** — when trip dates arrive, Kruak's greeting + tab priorities + map flip to "today" (weather now, today's plan, nearest stamp). Without this it's a planner that gets deleted at the airport.
- **After-trip closure** — trip recap + "next city?" hook + beautiful shareable completed-city card sized for LINE/IG story (the only viral loop).
- **Transit answers in chat** — Thai travelers' #1 question (JR Pass คุ้มไหม / Suica / A→B ยังไง). Wire existing per-city transit data into chat + deep-link Google Maps transit. A friend must not look ignorant of what friends get asked most.
- **Budget in THB** — Kruak says "คืนละ ~1,800 บาท" at today's rate + rough trip-budget estimate. Cheap, high perceived warmth.
- **Food constraints** — halal / vegetarian / แพ้กุ้ง filter (1 intent-slot + 1 Places filter). Real Thai concern, real differentiator vs Google.

**CORE v1 PURPOSE (owner restated 2026-07-14) — "all travel info in one place, Kruak fetches & suggests from your question":** The product's job is to spare the user from hunting across Skyscanner / Booking / blogs. Flights + stays + restaurants are aggregated; Kruak reads your question and proactively pulls the relevant slice and speaks it. This aggregation-by-a-friend is the whole value prop — keep it front-and-center, don't let audit-driven cuts erode it.

**Kruak must answer these INSIGHT questions (v1 intent, owner-named):**
- **Seasonal "what's it like":** "ไปคามิโคจิแต่ละฤดูเป็นยังไง" → Kruak describes each season **with images to show** (not just text). Season → scenery → what to expect.
- **Weather/season planning across Japan:** "เดือนนี้หิมะตกไหม ไปจังหวัดไหนดี" → Kruak reasons over the season/weather data and *recommends which prefecture* fits the month. This is a where-should-I-even-go question, not a within-city question — the app already has season radar + JMA + holidays to power it.
- **Transit at THREE scales:** within a prefecture, within a region, AND **inter-region** (e.g. Kanto→Kansai, shinkansen). Existing per-city transit (Leaflet) covers the smallest scale only — inter-region/inter-prefecture answering is a v1 expectation, deep-linked to Google Maps / Navitime for actual routing.
- General "other insights" — Kruak should feel knowledgeable about Japan travel broadly, powered by the orchestrated fetch + (gated) web-search enrichment, not just the hardcoded city data.

**Manhole game fix (owner-approved): extend the stamp economy beyond the 7-day trip window.** As specced it only works in-trip (users are in Japan ~7 days/yr) = cute distraction, not retention. Fixes: (1) each collected stamp permanently teaches Kruak something + unlocks a small perk (outfit / hidden tip) — feeds the *relationship*; (2) at-home earning — seasonal postcards from Kruak, planning actions (booking, finishing itinerary) earn *planning stamps* so the book breathes year-round; (3) keep GPS check-in for in-trip (authentic マンホールカード hobby).

**Warmth-moat risks to engineer against (Fable):**
- **Latency kills warmth** — 2 sequential LLM calls + fetches = 4-8s silence. Mitigate: instant rule-based ack bubble ("แป๊บนะ เดี๋ยวกร๊วกเช็คให้ ☔") before compose lands + stream the reply.
- **Haiku's Thai voice** — persona rests on the cheapest model writing charming Thai consistently. Needs a *voice bible* (fixed particles, catchphrases, forbidden translated-Thai) in the compose prompt + a golden-transcript eval set. Deserves more engineering than any visual feature.
- **Referral ick** — Kruak recommends by fit; monetization stays in the deep-link; he sometimes recommends things that earn nothing (free shrine, konbini tip). Un-salesy behavior IS the moat.
- **Chip creep** — a map opening with 5 toggle chips + legend rebuilds the cold dashboard in cute clothes. Kruak *sets* layers from conversation; chips are secondary.
- **Disaster tone** — cute cat + JMA earthquake alert = tonal landmine. Define a "serious mode": plain face, plain language, no jokes when disaster feeds fire.

**Design law from audit (owner kept isometric):**
- Frame neo-brutalism as **判子 hanko / woodblock craft** (ink-brown outlines on washi, not pure black). Vermilion = the hanko stamp color — rhymes with the stamp-book mechanic. Keep it scarce.
- **Hard style law: anything interactive/informational = washi-UI flat style; anything world/decorative = game style; NO element is both.** (A price pin is a washi-bordered tag standing in the iso world — never a pixel-art pin. Like Animal Crossing: world rendered, dialogue boxes flat/clean.)
- All character-adjacent art (landmark sprites, manhole covers) must be generated to match Kruak's 5 mood PNGs or he looks pasted onto someone else's game.
- **Dark theme = deep indigo-ink "night washi", NOT gray slate** — or warmth vanishes exactly where we promised it wouldn't.
- Isometric kept despite ~3x art cost — owner's call, charm judged worth it. Enforce consistency or a half-good iso map next to polished flat UI reads as a fan mod.
