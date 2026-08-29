# THE NIHONGO VIBES — FINAL PRODUCTION

Approved phases: 7A, 7B, 7C, 7D, 7E, 7F, 7G, 7H

## Locked product decisions

- Neo Torii Learning Studio
- Deep navy + Japanese red + porcelain white + silver
- Official user-supplied logo
- Bangla-first interface
- Japanese learning objects in Japanese
- No romaji-first UX
- Mobile targets: 360 / 390 / 430 / 768
- Mobile dock: Home / Vocabulary / Smart Review / Listening / More
- Quick Quiz 10
- Mini Mock 25
- Full JLPT N5 Mock 52
  - Vocabulary 20
  - Grammar/Reading 20
  - Listening 12
- Lesson completion: >=80% vocabulary mastery + 0 due SRS
- KLC: 2,300 nodes / 4,034 edges
- Visual construction is not presented as historical etymology
- Phase 7D free Japanese browser audio
  - Web Speech API with installed Japanese device voices
  - separate A/B voice preference and pitch
  - no API key or per-character billing
  - voice name and quality vary by browser/operating system
  - 0.75 / 0.9 / 1 speed
  - full dialogue sequencing

## What this package replaces

- Shell.tsx
- Dashboard.tsx
- MockTest.tsx
- StudyViews.tsx
- lib/audio.ts
- audio generation scripts
- production QA
- deploy workflow
- official logo assets

It also patches the existing `styles/v60-ultimate.scss` in place.
It does NOT add a V61/V62 override stylesheet.

## GitHub connector status

The ChatGPT GitHub integration returned HTTP 403 for repository writes.
Therefore this ZIP is the exact upload/publish fallback.
