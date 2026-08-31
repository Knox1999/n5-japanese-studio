---
name: visual-responsive-qa
description: Use for screenshot-based visual comparison, responsive regression checks, and pixel-level UI mismatch diagnosis across desktop and mobile breakpoints.
---

# Visual Responsive QA

## When to use
Use after UI changes, when the user asks whether the build matches the reference, or when desktop/mobile screenshots need comparison.

## Inputs
1. Read `AGENTS.md` and the relevant implementation files.
2. Use the live reference, user screenshots, or a preview deployment when available.
3. Use identical viewport sizes for reference and implementation comparisons whenever possible.

## Procedure
1. Verify page state first: public vs authenticated, same route/section, same viewport.
2. Compare in this order: global container/gutters, header/nav, section spacing, card/button dimensions, typography, icon alignment, borders/radii/shadows, interactions.
3. Diagnose the smallest shared rule causing each mismatch before changing individual elements.
4. Prefer token/component fixes over one-off overrides.
5. Re-capture/re-check the affected viewport after each cohesive correction set.
6. Check mobile overflow, wrapping, stacking, touch-target spacing, drawers/navigation, and fixed/sticky elements.

## Efficiency plan
- Start with the largest visible geometry mismatch; it often fixes several downstream differences.
- Batch related corrections by component/token.
- Do not repeatedly inspect unchanged screens.
- Stop when remaining differences are content/assets that cannot or should not be copied.

## Pitfalls and fixes
- Different viewport or auth state: align state before comparing.
- Font mismatch causing cascading geometry differences: verify font family/weight/line-height first.
- Screenshot-only guesswork: mark uncertain measurements as approximate until browser/DOM inspection is available.
- Mobile horizontal scroll: locate the overflowing ancestor rather than hiding overflow globally.

## Verification checklist
- 1440, 1280, 1024, 768, 430, 390, 375 px where practical.
- No unexpected horizontal scroll.
- Header/nav behavior is correct at each breakpoint.
- Cards/buttons/text align consistently.
- Hover/focus/active states remain usable.
- Existing user flows still work after styling changes.
