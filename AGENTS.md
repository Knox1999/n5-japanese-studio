# Codex Project Instructions

## Mission
Build and refine the existing Japanese-learning application in this repository. The sole visual/interaction reference for the current redesign is https://nihonovaacademy.com/.

## Source of truth
- Visual hierarchy, spacing, component proportions, responsive behavior, and interaction patterns: Nihonova Academy.
- Product functionality, routes, learning logic, state, data, and integrations: this repository.
- Branding, copy, learning content, questions, images, and assets: this repository or user-provided assets only.
- Do not copy Nihonova proprietary text, logos, course material, questions, illustrations, or photography.

## Product constraints
- Preserve the existing app; do not replace it with a new project.
- Keep all learning features unlocked after successful login in this phase.
- Do not introduce premium lesson locks, course-purchase gates, subscription paywalls, or locked learning states.
- Keep pre-login/public UI and authenticated/app UI as distinct layout systems.
- Preserve existing auth, routes, dashboard, vocabulary, SRS, listening, grammar, kanji, kana, mock tests, progress state, APIs, database behavior, forms, and navigation unless the user explicitly requests a product change.

## Working rules
- Work on the active feature branch, never make destructive changes to main.
- Inspect relevant existing files before editing. Prefer small, cohesive changes over broad rewrites.
- Fix root causes rather than hiding failures, skipping tests, or weakening assertions.
- Do not claim exact reference measurements unless they were actually observed from a browser/screenshot/DOM inspection.
- When exact reference measurements are unavailable, keep implementation values explicitly approximate and refine them with visual comparison.
- Reuse existing design tokens/components where practical, but prioritize visual fidelity and maintainability.
- Keep TypeScript strictness and current project conventions.

## Preferred tool workflow
Use connected tools when available:
- GitHub: repository reads/writes, branch/PR review, workflow diagnostics.
- Vercel: preview deployments and deployment verification; never promote to production without explicit user approval.
- Supabase: auth/database/schema inspection and safe changes when the task actually requires backend work.
- Figma: design handoff or editable visual specification when useful.
- PostHog: product analytics/behavior checks when relevant.
- Browser/Playwright or equivalent: inspect Nihonova and compare preview at desktop and mobile breakpoints.

If a required external tool is not connected in the current Codex environment, report that specific missing connection instead of pretending it is available.

## Validation
For meaningful code changes, run the narrowest useful checks first, then broaden:
1. Relevant unit/component tests if present.
2. `npm run lint:types`
3. `npm run lint`
4. `npm run qa`
5. `npm run build`
6. `npm run test:e2e` when UI/routes/flows are affected.

Do not skip or disable a failing test merely to get green CI. Diagnose the failing step, fix the underlying regression, and rerun.

## Visual QA targets
When doing the Nihonova-inspired redesign, verify at least these widths where practical: 1440, 1280, 1024, 768, 430, 390, and 375 px.
Compare:
- container width and gutters
- navbar/header height and alignment
- typography scale/weight/line-height
- button height, padding, radius, icon alignment
- card width/height, padding, radius, border/shadow
- grid gaps and section spacing
- mobile stacking and navigation behavior
- hover/focus/active states
- public vs authenticated layout separation

## Efficiency
Use high reasoning for architecture, difficult debugging, and final visual mismatch diagnosis. Use medium for normal implementation and responsive work, and low/medium for small CSS/token/copy corrections. Avoid repeatedly re-auditing unchanged parts of the repository.
