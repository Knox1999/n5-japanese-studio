# The Nihongo Vibes

A futuristic JLPT N5 Japanese learning studio built for structured daily practice.

## Learning modules

- Public Bangla/English starter lab with free lessons, listening and diagnostic quiz
- Vocabulary with Japanese audio and mastery tracking
- Smart Recall / spaced repetition
- Spelling and Kana Pad
- Conversation role-play
- Reading practice
- Listening and shadowing
- Grammar patterns
- KLC Kanji Matrix with stroke order
- Quick, lesson, mini and 67-item full N5 practice mocks with history
- Curated directory of verified free JLPT N5 practice resources
- Local progress backup / restore

## Technology

- Next.js 15
- React 19
- TypeScript
- SCSS / Tailwind
- Three.js
- GSAP
- Build-generated Japanese neural MP3 with fast browser-voice fallback
- GitHub Pages
- Google Analytics 4

## Production

Live site: https://knox1999.github.io/n5-japanese-studio/

Current release: **V61**

Deployment is handled by `.github/workflows/deploy-pages.yml`.

## Repository structure

```text
.github/workflows/   GitHub Pages deployment
app/                 Next.js application
components/          Learning UI and interactions
lib/                 Data, storage, audio and analytics helpers
public/              PWA, generated data/audio and public assets
scripts/             Data/audio/build QA scripts
source/              Source learning datasets
styles/              Production styles
```

## Development

```bash
npm install
npm run data:build
npm run lint:types
npm run build
```

The project intentionally keeps learner progress in the browser. Use **Backup & Restore** inside the app to export or restore progress.

External practice questions are linked to their original providers. They are not copied into this repository; in-app mock questions are generated from the project's own 25-lesson dataset.
