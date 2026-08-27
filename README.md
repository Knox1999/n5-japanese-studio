# N5 Natural Japanese Studio — Premium Next.js v41

A production-oriented static Japanese learning application designed for GitHub Pages.

## Stack

- **HTML5 / semantic React markup** — accessible app structure.
- **CSS3 + Tailwind CSS + SCSS** — responsive layout, design tokens, branded components.
- **JavaScript / TypeScript (ES6+)** — study state, local progress, audio, tests and interactions.
- **React 19 + Next.js 15** — component architecture and static export.
- **Framer Motion** — view transitions, card/reveal motion.
- **GSAP** — Sakura/Fuji hero choreography.
- **Three.js** — low-cost ambient Sakura particle layer on capable desktop devices only.
- **Python 3.12** — data split/validation, neural-audio generation, KanjiVG build pipeline and QA.
- **Kokoro Japanese neural TTS + FFmpeg** — cached pre-generated Japanese MP3.
- **KanjiVG** — build-time stroke-order SVG assets (CC BY-SA 3.0; attribution copied into the export).
- **GitHub Actions + GitHub Pages** — Python/Node build in CI, static site served to users.

## Data carried forward

- 1,011 verified vocabulary records.
- 25 lessons.
- 2,300 KLC Kanji nodes.
- 4,034 KLC component relations.
- 2,300 Bangla memory-story records.
- Existing browser progress keys are preserved so the new UI can read old progress/history/SRS data.

## Main product surfaces

Dashboard, Vocabulary, Adaptive SRS, Spelling, Conversation, Reading, Listening, Grammar, Kanji KLC, 100-question Mock Test, and Test History.

Listening is intentionally capped at **0.75× / 0.90× / 1×**.

## Local development

```bash
python scripts/build_data.py
npm install
npm run dev
```

## Production build

```bash
npm install
npm run build
```

Next.js exports the static site to `out/`.

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` runs Python and Node on GitHub Actions, pre-generates the study assets, builds the static Next.js site, performs QA, and deploys `out/` to GitHub Pages.

Python does **not** run in the visitor's browser. Python is a build-time engine; the published site is static HTML/CSS/JavaScript/SVG/audio.
