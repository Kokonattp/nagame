# Task Contract — Nagame Pre-trip Rebuild

Status: `CLOSED_WITH_NOTES`
Mode: `STANDARD`
Candidate: `pretrip-rebuild-v1`
Base: current working tree at task start; unrelated existing changes are preserved

## Problem and current behavior

Nagame's current interface still reads as an exploratory chat/dashboard prototype. The product decision is to rebuild the user-facing experience around preparing for a Japan trip with Kruak as a friend. The current typed assistant endpoint and card contract can support a new surface, but the first viewport does not yet make the preparation workflow obvious.

## Objective

Replace the main Nagame experience with a new Thai-first pre-trip surface that makes the path from a travel question to a saved plan visible and actionable.

## In scope

- Replace the `/` route's visual composition and interaction model.
- Establish a new design world for the rebuilt surface, using approved Kruak identity assets.
- Add three entry intents: destination discovery, prepare a known city, and check an existing plan.
- Connect the new chat surface to the existing `/api/assistant` contract.
- Provide a visible trip-brief/next-action area and a bounded local draft interaction where supported by existing trip utilities.
- Update user-facing metadata/copy necessary for the new purpose.

## Out of scope

- Deleting old routes, services, or components as a cleanup action.
- Replacing the backend provider architecture, chat contract, authentication, or identity model.
- Adding a global globe, country-wide camera directory, new webcam provider, navigation engine, or production deployment.
- Claiming persistent memory, provider E2E, or production readiness from a local UI prototype.

## Constraints and risks

- Preserve the existing API/data boundary and fail-silent behavior.
- Do not invent live prices, availability, weather, or user proof.
- Keep Thai text readable on mobile and maintain keyboard/focus states.
- The rebuild can make the old UI visually obsolete, but old source remains until the new candidate is verified and accepted.
- No destructive deletion, migration, auth change, push, deploy, or commit is included in this package.

## Acceptance criteria

1. The first viewport clearly says what Nagame helps with and presents three useful starting actions.
2. A user can choose a starting action, submit a Thai question, and see assistant bubbles/cards from the existing API with loading and error recovery.
3. The interface makes the emerging trip brief and next action visible without turning into a metrics dashboard.
4. Live-camera/map content appears only as supporting evidence when available, with honest unavailable states.
5. The surface works at desktop and mobile widths with visible keyboard focus and no critical horizontal overflow.
6. User-facing strings pass copy audit and the rendered surface is inspected in both target viewports.

## Definition of Done

- Source and diff inspected; only approved paths changed.
- Focused type/lint/build checks run as applicable and recorded separately.
- Rendered runtime evidence captured for desktop and mobile.
- Self-audit performed against product truth, responsive behavior, copy, accessibility, and scope.
- No blocker or major finding remains; unverified provider/auth/release evidence is explicitly reported.

## Verification plan

- `npm run lint`
- `npm run build`
- Start the local Next.js app and inspect `/` at desktop and mobile viewport sizes.
- Exercise the three entry actions, submit a prompt, loading, error, empty, and card states.
- Run Impeccable detector once on changed UI targets after implementation.

## Rollback

Revert only the approved changed UI/metadata files from this candidate. Do not delete or reset unrelated working-tree changes.

## Approval gates

- Implementation is bounded to this contract.
- Commit remains a main-agent gate after verification and audit.
- Push/deploy/destructive cleanup/auth/provider changes remain out of scope.
