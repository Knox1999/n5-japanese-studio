# The Nihongo Vibes — V60 Ultimate Redesign

This bundle combines both redesign approaches:
1. Real component/JSX redesign for the application shell and dashboard.
2. A full-site visual system that restyles the existing learning modules without rewriting their tested learning logic.

## Replace / add these files

- `app/layout.tsx`
- `components/Shell.tsx`
- `components/Dashboard.tsx`
- `styles/v60-ultimate.scss`

Extract the bundle into the repository root and allow these files to overwrite the existing paths.

## Why this is safer

The current application already separates learning logic into Vocabulary, SRS, Spelling, Listening, StudyViews, GrammarStudio, KanjiExplorer, MockTest and HistoryView. V60 leaves that behavior intact and gives those views one shared design system, while structurally rebuilding the two components that define the global experience: Shell and Dashboard.

## Verify locally

```bash
npm install
npm run lint:types
npm run build
```

Then run the project's normal development command and inspect desktop + mobile layouts.

## Design direction

Sumi × Sakura:
- deep ink background
- warm paper-like surfaces
- sakura-red primary action
- muted teal for progress/positive states
- warm gold for Japanese/Kanji details
- editorial Bengali/Japanese typography
- reduced cyber visual noise
- clearer navigation and learning hierarchy
- responsive lesson map and mobile dock
- accessible focus and reduced-motion states

## Rollback

Remove the `v60-ultimate.scss` import and restore the previous `Shell.tsx`, `Dashboard.tsx`, and `app/layout.tsx` from Git if needed.
