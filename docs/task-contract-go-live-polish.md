# Task Contract — Go-live UX/UI Polish

Status: `CLOSED_WITH_NOTES`
Mode: `STANDARD`
Candidate: `go-live-polish-v1`
Execution profile: `SOLO-REVIEWED` with sequential `self-audit`

## Objective

Polish the already implemented Nagame pre-trip home so the go-live candidate has clearer mobile hierarchy, more discoverable card management, and more readable supporting text.

## In scope

- Reduce mobile hero height without changing the visual world or product message.
- Make the saved-card management affordance explicit while preserving the expandable action menu.
- Improve readability of card metadata and storage/backup guidance.
- Replace outdated internal planning wording with go-live-candidate/pre-trip-companion wording in active project docs.

## Out of scope

- No new product workflow, API, storage, auth, provider, or data model.
- No deletion of old routes/components.
- No production deployment, DNS, secrets, migrations, push, or external release action.

## Acceptance criteria

1. The first mobile viewport reaches the entry choices with less vertical dominance from the hero.
2. Users can see that saved cards have a `จัดการ` action without guessing what an ellipsis means.
3. Card detail, storage, and backup text remain readable at desktop and mobile widths.
4. Existing card management, IndexedDB persistence, export/import, and chat flow are unchanged.
5. Rendered review at 1440px and 390px has no critical overflow or interaction regression.

## Verification and evidence

- `npm run lint`
- `npm run build`
- Impeccable detector on changed UI files
- Clean production runtime at port 4101
- Desktop/mobile screenshots and card-management flow
- Self-audit and copy audit; production deployment evidence remains `NOT RUN`

## Rollback

Revert only the approved polish files and documentation wording. The prior local-first candidate remains the behavioral rollback reference.
