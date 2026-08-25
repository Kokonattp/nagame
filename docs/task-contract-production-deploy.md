# Task Contract — Production Deploy

Status: `AUTHORIZED`

## Objective

Deploy the current Nagame go-live candidate to the existing Vercel production project and verify the public alias.

## Release candidate

- Source: current working tree in `D:\TT\nagame`
- Candidate: `go-live-polish-v1`
- Host: `https://nagame.vercel.app`
- Vercel project: `nattps-projects-da430d7f/nagame`

## In scope

- Link the checkout to the existing Vercel project.
- Deploy with Vercel production mode.
- Verify deployment readiness and the public production alias.
- Run read-only desktop and mobile smoke checks for the initial page.
- Record release evidence and unverified boundaries.

## Out of scope

- Provider/authenticated E2E, fresh third-party data verification, device testing, DNS changes, environment-variable changes, migrations, and rollback execution.
- Git commit or push; this deployment is from the reviewed working tree unless a release tool requires otherwise.

## Acceptance criteria

- Vercel reports the production deployment as ready and aliases it to `https://nagame.vercel.app`.
- Public HTTP response is successful.
- Initial page renders the Thai pre-trip entry surface and three start choices at desktop and mobile widths without horizontal overflow.
- No production deployment claim is upgraded to provider, auth, data-freshness, device, or rollback evidence.

## Verification

- Preflight: lint/build already PASS for this exact candidate; `git diff --check` PASS.
- Release: Vercel deployment status and alias.
- Runtime: public browser smoke at 1440px and 390px; console/page errors captured.

## Rollback

If the public smoke fails, do not make unrelated changes. Preserve the deployment URL and restore the previous Vercel production deployment through the Vercel dashboard/CLI after confirming the exact prior production target.
