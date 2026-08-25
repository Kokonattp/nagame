# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Next.js application in this repository; the first rebuild package is a web UI replacement, not a framework migration.

## Users

Thai travelers who are considering or preparing for a trip to Japan. They may not know which city to choose, or may already know a city and need help turning preferences, dates, budget, pace, and constraints into an actionable plan.

## Product Purpose

Nagame helps a traveler prepare for Japan by letting them talk with Kruak, receive relevant travel information in one place, make decisions, and carry those decisions into a trip plan. Success means the user can move from a vague travel question to a useful next action and a saved trip brief without hunting across many services.

## Positioning

Nagame is a Thai-first Japan travel companion: a friend who helps decide where to go, what to prepare, and how to continue using the plan during the trip. It is not primarily a world map or live-camera directory.

## Operating Context

- The primary starting point is a Thai chat with Kruak.
- The conversation can surface weather, seasons, flights, stays, food, webcams, transit, warnings, and places when relevant.
- The user should be able to save decisions into a trip and later use them for planning or during-trip adjustments.
- Maps and live cameras are supporting evidence selected by the conversation, not the opening catalog.

## Capabilities and Constraints

- Existing project APIs and typed chat/card contracts are available for the rebuild package.
- Cards must be assembled from real service data; the model's role is Thai-language guidance.
- External navigation remains a deep-link to Google Maps or another transit app, not an in-app turn-by-turn system.
- The first rebuild package must not add a new global camera provider, full-screen globe, authentication migration, or production integration.
- Provider failures must be honest and recoverable; unavailable data must not be presented as current.

## Brand Commitments

- Product name: Nagame 眺め.
- Assistant/mascot: Kruak, a Japanese bobtail cat traveler.
- Thai-first, warm, practical, friend-like voice.
- Existing Kruak artwork in `public/kruak/` remains approved product identity material; use the central asset registry and avatar component.

## Evidence on Hand

- Existing typed chat contract in `lib/chat/types.ts`.
- Existing assistant endpoint at `app/api/assistant/route.ts`.
- Existing city, weather, webcam, stay, food, flight, and transit services under `lib/`.
- Existing project memory and product direction in `PROJECT_MEMORY.md`.
- No new visual reference is approved as a copy target; Tomarigi is a positioning reference only.

## Product Principles

1. Conversation leads; data supports a decision.
2. Every meaningful answer ends with a next action.
3. The plan should become more useful as the user shares context.
4. Live information is labeled by source and freshness; uncertainty is visible.
5. The product should feel like a capable friend, not a travel-data dashboard.

## Accessibility & Inclusion

- Thai copy must remain readable at mobile widths and support keyboard focus.
- Important actions must not rely on color or icon alone.
- Loading, error, empty, and unavailable-provider states must explain what happened and what the user can do next.
