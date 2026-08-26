# N5 Natural Japanese Studio — GitHub Pages Edition v18

Pure static/mobile-first JLPT N5 study website.

## Included

- 1,011 verified vocabulary
- curated natural sentences
- spelling + writing lab
- adaptive SRS in browser LocalStorage
- long conversation
- long reading + rewrite
- listening + shadowing
- grammar
- KLC 2300 Kanji tree
- Onyomi / Kunyomi / Furigana
- Bangla Kanji memory stories
- 100-question random mock
- mobile slide-out menu + bottom dock
- compact floating Kana Pad
- Romaji → Hiragana / Katakana
- Native Japanese keyboard / IME mode
- PWA / Add to Home Screen
- service-worker offline cache

## GitHub Pages

This project is static. No Python server is required.

### Recommended deployment

1. Create a public repository named `n5-japanese-studio`.
2. Upload **the contents of this folder**, not the ZIP itself.
3. Repository → **Settings** → **Pages**.
4. Under **Build and deployment**, set **Source = GitHub Actions**.
5. The included workflow `.github/workflows/deploy-pages.yml` will deploy the site.

Alternative: use **Deploy from a branch → main → /(root)**; `.nojekyll` is included.

## Important

The GitHub Pages edition uses the Japanese voice available in the phone/browser through Web Speech API. The PC-only Python/Edge-TTS neural backend is not part of a static GitHub Pages site.

Progress is stored per-device in browser LocalStorage.
