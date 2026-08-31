---
name: nihonova-ui-rebuild
description: Use for implementing or refining the Japanese-learning UI to match Nihonova Academy's layout, spacing, responsive behavior, and interaction patterns while preserving this repository's functionality and original content.
---

# Nihonova UI Rebuild

## When to use
Use when the user asks to redesign, refine, compare, or make the site closer to Nihonova Academy. Do not use for unrelated backend-only work.

## Gather context first
1. Read the root `AGENTS.md`.
2. Inspect the relevant current components and styles before editing.
3. Identify whether the target belongs to public/pre-login UI or authenticated/app UI.
4. If available, inspect the live reference with a browser and capture observable measurements/states. If unavailable, use user screenshots or mark values as approximate.

## Procedure
1. Preserve current routes, auth, learning state, data flow, and module functionality.
2. Extract or update shared design tokens before duplicating magic values across components.
3. Implement geometry first: containers, gutters, section rhythm, card/button sizes, nav/header structure.
4. Refine typography, radii, borders, shadows, icon alignment, and interaction states.
5. Keep public and authenticated layouts visually distinct when the reference does.
6. Never copy proprietary reference text, logos, lessons, questions, photography, or illustrations.
7. Do not add premium/paywall/locked-learning states in this phase.

## Efficiency plan
- Audit only files needed for the requested surface.
- Reuse already-observed measurements instead of re-measuring unchanged elements.
- Prefer CSS variables/tokens and shared primitives for repeated values.
- Use high reasoning only for architecture or difficult visual mismatch diagnosis; use medium for normal implementation.

## Pitfalls and fixes
- If the layout looks close at one width but breaks elsewhere, fix container/gutter/grid rules instead of adding many breakpoint-specific hacks.
- If reference measurements are unknown, do not present guessed pixels as exact.
- If an edit breaks existing learning behavior, revert the structural change and preserve the original functional boundary.

## Verification
- Compare at 1440, 1280, 1024, 768, 430, 390, and 375 px where practical.
- Verify button/card geometry, typography, spacing, alignment, nav behavior, and public/auth layout separation.
- Run relevant project checks from `AGENTS.md` after meaningful changes.
