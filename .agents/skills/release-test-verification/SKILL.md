---
name: release-test-verification
description: Use for diagnosing CI/E2E/build failures, validating feature branches, and preparing a safe Vercel preview without skipping tests or promoting to production.
---

# Release Test Verification

## When to use
Use after meaningful implementation work, when CI fails, before a preview handoff, or when the user asks whether the branch is ready to review.

## Gather context
1. Read `AGENTS.md`.
2. Identify the active branch and changed files.
3. Inspect the exact failing test/workflow step before editing.
4. Use GitHub workflow logs/artifacts and Vercel preview information when those tools are available.

## Procedure
1. Run the narrowest relevant test/check first.
2. Reproduce or inspect the exact failure and identify its root cause.
3. Make the smallest cohesive fix that preserves existing behavior.
4. Rerun the failed check.
5. Broaden verification in this order when applicable: `npm run lint:types`, `npm run lint`, `npm run qa`, `npm run build`, `npm run test:e2e`.
6. For UI work, verify a non-production Vercel preview and core public/authenticated flows.
7. Never disable, skip, weaken, or delete a legitimate failing test merely to make CI green.
8. Never promote a deployment to production without explicit user approval.

## Efficiency plan
- Read only the relevant workflow/job logs around the failure first.
- Cache the failing command, route, viewport, and error signature while debugging.
- Do not rerun the full suite after every tiny edit; rerun the failing check first, then the broader suite once stable.

## Pitfalls and fixes
- Environment-only failure: compare environment variables/configuration before changing application logic.
- Flaky UI test: verify timing/state assumptions and selectors; do not simply add large arbitrary waits.
- Preview works but CI fails: treat CI as unresolved until the failing check is understood.
- Build failure from unrelated pre-existing issue: report it clearly and avoid silently changing unrelated code.

## Verification checklist
- Relevant failing check passes after the fix.
- Type/lint/QA/build checks pass where applicable.
- E2E passes for affected flows.
- Preview is non-production.
- No secrets are printed or committed.
- Branch is ready for user review before any merge/promotion.
