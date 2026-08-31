# Nihonova High-Fidelity UI/UX Adaptation

## Reference
- Primary and only visual/UX reference: https://nihonovaacademy.com/

## Source-of-truth rules
- Visual geometry and interaction patterns: Nihonova reference
- Functionality: existing n5-japanese-studio codebase
- Branding/content/assets: existing project assets and content
- Do not copy proprietary course text, questions, protected illustrations, logos, or brand identity.

## Two-state architecture
### A. Pre-login / Public
Analyze and implement separately:
- public navbar
- hero
- marketing/feature sections
- CTA patterns
- public cards
- login/register entry points
- public footer
- responsive/mobile public navigation

### B. Post-login / Authenticated App
Analyze and implement separately:
- authenticated shell
- top navigation/sidebar/drawer
- dashboard
- lesson journey
- progress UI
- vocabulary
- SRS
- listening
- grammar
- kanji
- kana practice
- mock tests
- history/progress
- authenticated mobile navigation

## Existing architecture findings
- Next.js 16.3.3 + React 19.2.8
- App entry: app/page.tsx -> AccountGate -> StudioApp
- AccountGate owns authentication/session/cloud-sync behavior
- StudioApp owns learning-state orchestration and module routing
- Shell owns authenticated navigation and application chrome

## Implementation guardrails
- Preserve authentication, cloud progress, learning state, APIs, routes, data loading, service worker, analytics, and module behavior.
- Do not replace functional modules with static mockups.
- Prefer visual restyling and layout refactors over logic rewrites.
- Keep all learning features unlocked after successful login; no premium/locked lesson states in this phase.

## Workflow
1. Reference inspection and measurement report
2. Existing repository audit
3. Public vs authenticated component mapping
4. Design-token extraction
5. Public shell implementation
6. Authenticated shell implementation
7. Module visual adaptation
8. Desktop/tablet/mobile QA
9. Functional regression QA
10. Visual correction loop

## Verification targets
- 1440px
- 1280px
- 1024px
- 768px
- 430px
- 390px
- 375px

## Visual-priority order
1. Page/container geometry
2. Navigation/app-shell geometry
3. Section dimensions
4. Card dimensions and grids
5. Spacing
6. Typography hierarchy
7. Buttons and controls
8. Images/icons
9. Borders/shadows/radius
10. Micro-spacing

## Current branch
`codex/nihonova-high-fidelity`
