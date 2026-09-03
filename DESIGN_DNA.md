# Design DNA — Source of Truth: Public/Pre-login UI

Extracted from [components/PublicLanding.tsx](components/PublicLanding.tsx) + [components/PublicLanding.module.css](components/PublicLanding.module.css) (rendered by [components/AccountGate.tsx](components/AccountGate.tsx) when `!session`), plus global tokens in [app/globals.css](app/globals.css). This is the **only** UI inspected for DNA extraction — nothing here was modified.

## Colors
Two token sets exist and are *numerically aligned* (same hex/rgba values, different var names):
- `globals.css` `:root`: `--navy:#050812` `--navy-2:#0A1424` `--ink:#F5F8FC` `--sakura:#e5372d` `--gold:#FFB35D` `--sage:#70D4D7` `--blue:#173D70` `--violet:#786CB6` `--muted:#9CAABD`
- `PublicLanding.module.css` `.page` scope: `--public-bg:#050812` `--public-surface:#0c1625` `--public-ink:#f7f9fc` `--public-accent:#e5372d` (red) `--public-accent-2:#ffb35d` (gold) `--public-cyan:#75d8dc` `--public-muted:#9caabd` `--public-line:rgba(208,222,239,.13)` `--public-line-strong:rgba(255,177,92,.3)`

Palette role: **navy/near-black base**, **red→gold gradient** for primary actions/accents, **cyan** for secondary/trust accents, **translucent white borders** (`rgba(208,222,239,.13)`) for card edges. No pure black, no flat white surfaces.

## Typography
- Font stack: `Inter, "Hind Siliguri", "Noto Sans Bengali", "Noto Sans JP", system-ui, sans-serif`; Bangla pages (`.banglaPage`) swap Hind Siliguri/Noto Sans Bengali to the front.
- Headline weight 850–900, tight/negative letter-spacing (`-.03em` to `-.055em`), `text-wrap:balance`.
- Fluid sizing via `clamp()`: H1 `clamp(48px,5.5vw,76px)`, H2 `clamp(32px,4vw,50px)`, module H2 `clamp(28px,3.4vw,40px)`.
- Body copy: 13–18px, `color:var(--public-muted)`, line-height 1.5–1.75.
- Eyebrow/kicker labels: 9–11px, weight 850–900, letter-spacing `.11em`–`.17em`, uppercase, accent-colored.

## Spacing & Layout
- Max content width `1180px` (`--public-max`), horizontal padding `24px` (`18px` ≤768px, `16px` ≤380px).
- Section vertical rhythm: `--public-section-space:96px` (70–72px on mobile, 64px ≤380px).
- Grid-first layout (CSS Grid over flex for major sections); gaps mostly 10–20px (cards), 40–86px (section columns).

## Backgrounds & Gradients
- Page base: dual radial-gradient wash over navy — `radial-gradient(circle at 10% 3%, rgba(160,45,41,.27), transparent 31rem)` + `radial-gradient(circle at 92% 12%, rgba(32,71,143,.26), transparent 34rem)` over `--public-bg`.
- Subtle grid overlay in hero (`linear-gradient` 1px lines, 52px cells, masked to fade downward).
- Section-specific tints layered on the same navy (e.g. journey section `linear-gradient(135deg,#0d1019,#13151c 42%,#11182a)`).
- CTA/primary-button gradient: `linear-gradient(135deg,#c92a22,#e5372d 60%,#ff6a4a)` (red→red→orange).
- Accent bars/meters: `linear-gradient(90deg,var(--public-accent),var(--public-accent-2))` (red→gold).

## Cards & Borders/Radius
- Border: 1px, always `var(--public-line)` (translucent white ~13% alpha) or accent-tinted for emphasis/hover.
- Radius scale is large and soft, roughly: small controls 8–13px, standard cards 14–22px, hero/feature panels 22–29px, pill/circular controls `999px`.
- Card fill: near-transparent white washes (`rgba(255,255,255,.02–.045)`) or layered dark gradients (`linear-gradient(145deg,#111d2d,#0b1523)`), never flat opaque color.
- Hover: `translateY(-2px to -5px)` + border brightens to gold-tinted (`rgba(255,177,92,.24–.35)`) + background lightens slightly. Consistent across nav links, buttons, feature cards, lesson cards, word/resource grid cards.

## Shadows
- Ambient: `--shadow:0 24px 72px rgba(0,0,0,.34)` (global).
- Elevated panels: `0 28–34px 70–90px rgba(0,0,0,.2–.42)`, sometimes paired with a color glow (`0 0 70px rgba(197,42,34,.1)`).
- Buttons: colored glow matching the gradient, e.g. `0 12px 30px rgba(197,42,34,.3)`.

## Buttons
- Primary (`.primaryCta`/`.joinButton`): red→orange gradient fill, 1px border `rgba(255,120,105,.68)`, white text, colored box-shadow, `height:42–50px`, `border-radius:11–13px`, weight 850.
- Secondary (`.secondaryCta`/`.loginButton`): translucent white fill (`rgba(255,255,255,.035)`), `var(--public-line)` border, no shadow.
- All buttons: `transition: transform .2s ease, box-shadow/border-color/background .2s ease`; hover lifts `translateY(-2px)`.

## Navigation
- Sticky header, `74px` (66px scrolled/mobile), `backdrop-filter: blur(20px) saturate(135%)`, background `rgba(4,8,17,.86)` → `rgba(3,6,13,.94)` when scrolled.
- Desktop nav links: transparent by default, animated underline sweep on hover (`::after` scaleX 0→1, red→gold gradient).
- Mobile: hamburger → full-width dropdown panel below header (no drawer/overlay on public site — contrast with authenticated app's drawer pattern, see below).
- Language switch: pill-shaped segmented control, active state gold-tinted.

## Icons
`lucide-react`, stroke icons only, sized 14–22px, colored via context (gold `#ffad63`/`#ffc078` for kickers, cyan `var(--public-cyan)` for check/trust marks, white for neutral).

## Hover / Active States
Consistent formula across all interactive elements: **lift** (`translateY`), **border brightens toward gold/accent**, **background wash intensifies**, `transition` 0.2–0.25s ease. No color-only hover states; always paired with motion.

## Transitions / Animation
- Framer Motion for scroll-reveal (`Reveal` component: `opacity 0→1, y 26→0`, `viewport:{once:true}`), staggered hero entrance.
- CSS keyframes for ambient motion: hero highlight shimmer/glow pulse, floating background glyphs (9–12.5s ease-in-out loops), header underline sweep.
- Respects `prefers-reduced-motion: reduce` globally (animations disabled/instant).

## Responsive Behavior
Breakpoints: `1024px` (nav collapses to hamburger, 2-col grids), `768px` (mobile menu, stacked sections, `--public-pad:18px`), `480px` (single-column everything, stacked CTAs), `380px` (tightened type scale, `--public-section-space:64px`).

## Visual Hierarchy
Eyebrow (small, accent, uppercase) → large tight-tracked headline with one gradient-highlighted phrase → muted supporting paragraph → dual CTA (primary gradient + secondary outline) → trust/proof row. Repeated at section level: kicker → H2 → muted description → content grid.

---

# Authenticated UI — Main Inconsistencies Found

Entry: [components/AccountGate.tsx:367](components/AccountGate.tsx:367) renders `<StudioApp/>` when a session exists, which imports [styles/studio.scss](styles/studio.scss) (18 partials) instead of `public.scss`.

1. **Competing base theme.** [styles/foundation/app-shell.scss](styles/foundation/app-shell.scss) (loaded first in `studio.scss`) defines its own root palette — `--f-bg:#071311`, `--f-cyan:#58ddd3`, teal/green "Futuristic Learning OS" theme — completely different from the public navy/red/gold palette. It is not deleted; it's overridden.
2. **Three-layer override stack per element.** [components/Shell.tsx](components/Shell.tsx) applies triple classNames on most nodes, e.g. `className="future-shell nv60-shell nv-final-shell"`. Each layer (`future-*` base → `nv60-*` from platform.scss → `nv-final-*`/`.nha-*` from [styles/foundation/nihonova-adaptation.scss](styles/foundation/nihonova-adaptation.scss)) patches the previous with `!important`. `nihonova-adaptation.scss` is what pulls colors back toward the public red/gold/navy palette, but only for the selectors it explicitly targets.
3. **Extreme `!important` usage** — `platform.scss` (=`v60-ultimate.scss`) alone has 1287 occurrences; `connected-learning.scss` 420+; total ~19k lines across `styles/`. This makes visual behavior hard to predict and any redesign pass fragile without removing dead layers first.
4. **No shared radius/spacing token discipline.** [styles/tokens.scss](styles/tokens.scss) defines `--nv-radius-sm/md/lg/xl` and `--nv-space-*`, but authenticated modules (e.g. [styles/modules/dashboard.scss](styles/modules/dashboard.scss)) hardcode ad-hoc radii (`24px`, `19px`, `15px`, `11px`, `18px`...) instead of the scale — similar to the public CSS module's ad-hoc-but-consistent-by-eye approach, except here it's layered across 3 override files, increasing drift risk.
5. **Naming/versioning debt.** Class prefixes like `v67-`, `nv58-`, `nv60-`, `nv-final-`, `future-` are historical version markers baked into shipped class names and component JSX, not semantic names — makes future changes error-prone (must grep all layers touching a prefix).
6. **Dead legacy components** not part of any render path (found via reference search): [components/LandingPage.tsx](components/LandingPage.tsx), [components/CTASection.tsx](components/CTASection.tsx), [components/Header.tsx](components/Header.tsx), [components/Button.tsx](components/Button.tsx) (only used by the dead `CTASection`). `styles/index.scss` is also unused at runtime (only `styles/public.scss` and `styles/studio.scss` are imported).

# Reusable Existing Components/Styles
- [components/PublicLanding.module.css](components/PublicLanding.module.css) — CSS Module, scoped, no `!important`, no cross-file override chain. Best candidate as a pattern reference (or literal source) for a future authenticated redesign.
- [app/globals.css](app/globals.css) `:root` tokens (`--navy`, `--ink`, `--sakura`, `--gold`, `--sage`, `--blue`, `--violet`, `--muted`, `--shadow`) — global, already shared by both public and authenticated surfaces via `app/layout.tsx`.
- [styles/tokens.scss](styles/tokens.scss) `--nv-*` — spacing/radius/shadow/motion scale, numerically compatible with `globals.css`, but currently under-used by authenticated modules.
- Framer Motion `Reveal`-style scroll-in pattern from `PublicLanding.tsx` (lines 142–148) — no authenticated equivalent found; reusable as-is.

# Authenticated Layout Files
- [components/AccountGate.tsx](components/AccountGate.tsx) — top-level session gate (public vs. authenticated branch).
- [components/StudioApp.tsx](components/StudioApp.tsx) — authenticated app shell/router (view switching, data loading).
- [components/Shell.tsx](components/Shell.tsx) — header/nav/drawer chrome for the authenticated app (the triple-class-layer component).
- [components/Dashboard.tsx](components/Dashboard.tsx) — authenticated home/dashboard view.
- [styles/studio.scss](styles/studio.scss) — the authenticated stylesheet entrypoint (18 `@use` partials).

# Minimum Files To Change Later (for a redesign pass)
1. [styles/studio.scss](styles/studio.scss) — entrypoint; decide which of its 18 partials to keep/replace.
2. [styles/foundation/app-shell.scss](styles/foundation/app-shell.scss) — teal/green competing base theme; either retheme or remove in favor of tokens.
3. [styles/foundation/nihonova-adaptation.scss](styles/foundation/nihonova-adaptation.scss) — current corrective layer; logic here shows what already had to be patched back toward the public palette.
4. [components/Shell.tsx](components/Shell.tsx) — remove `future-*`/`nv60-*`/`nv-final-*` triple-class pattern once underlying CSS is consolidated.
5. [styles/modules/dashboard.scss](styles/modules/dashboard.scss) — dashboard-specific card/button patterns to align with `--nv-radius-*`/`--nv-space-*` tokens.
6. [styles/tokens.scss](styles/tokens.scss) — likely needs reconciling/renaming against `PublicLanding.module.css`'s `--public-*` scale so both surfaces share one token vocabulary.

No functionality or code changes were made — this file is analysis-only.
