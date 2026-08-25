# Task Contract — Local-first Trip Cards

Status: `CLOSED_WITH_NOTES`
Mode: `STANDARD`
Candidate: `local-first-trip-cards-v1`
Execution profile: `SOLO-REVIEWED` with sequential `self-audit` because no independent reviewer is callable

## Problem and current behavior

The new pre-trip home currently writes the saved plan as one JSON string in `localStorage`. This is synchronous, difficult to query or evolve, and does not give the user a portable backup. The plan rail also shows saved items as a static list without enough user control.

## Objective

Replace the pre-trip plan's primary browser persistence with IndexedDB, add explicit export/import backup, and make saved evidence cards manageable without imposing a fixed number of daily destinations.

## Context and architecture

- Route: `/` through `components/pretrip/pretrip-home.tsx`.
- Existing assistant endpoint and typed `Card` contract remain unchanged.
- New storage boundary: `lib/pretrip/storage.ts` exposes typed load/save/import/export functions; the UI does not call IndexedDB directly.
- Data is local-first and device/browser scoped. Cloud sync, auth, provider changes, and cross-device identity are out of scope.

## In scope

- Add a versioned IndexedDB plan repository for saved cards.
- Read the old `localStorage` key once for a safe migration, without continuing to write the key.
- Add `.nagame` JSON export and import controls with validation and merge behavior.
- Add card filters: all, important, completed.
- Add per-card actions: mark important, mark completed, return to saved, remove.
- Add honest storage status and backup guidance in Thai.
- Refine the plan rail and saved-card UI for desktop/mobile keyboard use.
- Update product/design/task documentation and closeout evidence.

## Out of scope

- No one-day/one-pin rule or automatic itinerary scheduler.
- No Supabase schema/API/auth migration or cloud sync.
- No deletion of old routes/components or broad storage migration outside the new pre-trip surface.
- No new provider, live data claim, production deployment, push, or commit unless separately approved.

## Assumptions and risks

- IndexedDB and browser storage are best-effort; export is the user-owned backup path.
- Private browsing, storage clearing, quota pressure, or an unavailable IndexedDB implementation may prevent persistence; the UI must preserve the in-memory session and explain export recovery.
- Imported data is treated as untrusted user data: validate shape, constrain strings, deduplicate by card ID, and never execute imported values.
- Cards contain recommendation metadata, not credentials or secrets.

## Acceptance criteria

1. Reloading `/` restores saved cards from IndexedDB without a `localStorage` write.
2. Existing legacy `nagame.pretrip-plan.v1` data can be imported once into IndexedDB without being silently discarded.
3. The user can export a valid `.nagame` file and import it back; duplicate IDs merge without duplicate cards.
4. The user can filter cards and change card state without a fixed daily itinerary rule.
5. The user can remove a card and the visible count/status update after persistence completes.
6. Storage, loading, failure, and backup states are understandable Thai copy with keyboard focus and mobile-safe layout.
7. Existing assistant conversation and evidence-card save flow still work.

## Definition of Done

- Only approved files are changed; unrelated routes and working-tree changes are preserved.
- `npm run lint`, `npm run build`, `git diff --check`, and the Impeccable detector pass for the candidate.
- Local production runtime proves reload persistence, card actions, export/import, and responsive desktop/mobile rendering.
- Self-audit separates source, build, runtime, data, and release evidence; provider/auth/cloud-sync evidence remains `NOT RUN`.

## Verification plan

- Inspect diff and storage schema.
- Run `npm run lint` and `npm run build`.
- Run the Impeccable detector on changed UI targets.
- Start a clean production server and use browser automation at 1440px and 390px.
- Exercise: clean load, save card, reload, filter, mark important/completed, remove, export, import, and mobile overflow.

## Rollback and release gates

- Rollback is limited to the approved new storage/UI/docs files; the old `localStorage` key remains readable for one-time migration.
- Commit, push, deploy, auth, provider, and cloud-sync decisions remain separate gates.
