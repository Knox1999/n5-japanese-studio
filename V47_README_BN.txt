N5 NATURAL JAPANESE STUDIO — V47 FULL RESPONSIVE + NATURAL VOICE PATCH
=======================================================================
Target repository:
https://github.com/Knox1999/n5-japanese-studio

এই ZIP একটি drop-in overlay patch। ZIP-এর folder structure অপরিবর্তিত রেখে repository root-এর উপর copy/merge করুন এবং existing files replace করুন।

যে ফাইলগুলো V47-এ পরিবর্তিত/যোগ হয়েছে
--------------------------------------
1. app/layout.tsx
   - viewportFit=cover সহ mobile safe-area support-এর foundation।

2. components/Shell.tsx
   - mobile header/control bar আর hide হয় না।
   - current lesson selector compact mobile-safe control হিসেবে থাকে।
   - Quick Access horizontal scroll + active item auto-centering।
   - drawer/search body-scroll lock।
   - Escape এবং Ctrl/Cmd+K interaction।
   - accessibility labels / aria-current / main landmark।

3. components/Listening.tsx
   - premium responsive listening console।
   - previous/current/next transport control।
   - current line / full session play।
   - live progress/transcript state।
   - line বদলালে আগের audio cleanly stop হয়।
   - mobile stacked layout।

4. lib/audio.ts
   - pre-generated neural MP3 primary path retained।
   - slower playback-এ pitch preservation।
   - browser fallback-এ first Japanese voice না নিয়ে best Japanese voice ranking।
   - punctuation-aware pacing এবং natural fallback rate।

5. scripts/generate_audio.py
   - warmer Japanese Kokoro voice profile (clarity + warmth blend when supported)।
   - punctuation/politeness-aware speed/pause।
   - old robotic cache invalidation via _voice_profile.json।
   - CUDA auto-use + torch.inference_mode()।
   - gentle FFmpeg mastering / loudness normalization।

6. styles/v46-futuristic.scss
   - V47 responsive optimization layer appended।
   - Dashboard, Vocabulary, SRS, Spelling, Conversation, Reading, Listening,
     Grammar, Kanji/KLC, Mock Test, History—actual production selectors covered।
   - desktop/tablet/mobile layouts।
   - iPhone/Android safe-area handling।
   - touch targets, overflow, sticky-offset, mobile dock, drawer/search fixes।
   - <=980px, <=700px, <=480px, <=360px breakpoints।

7. .github/workflows/deploy-pages.yml
   - audio cache key এখন generator script hash-ও ব্যবহার করে।
   - voice/prosody change হলে old V42 cache silent reuse হবে না।
   - নতুন neural audio build হওয়ার পর future deploy-এ V47 cache reuse করা যাবে।

APPLY / DEPLOY
--------------
A) GitHub web থেকে manual upload করলে:
   - ZIP unzip করুন।
   - একই path অনুযায়ী files repository-তে replace করুন।
   - Commit to main করুন।
   - GitHub Actions -> Deploy workflow run হতে দিন।

B) Local machine হলে:
   1. আপনার full repository checkout-এর উপর ZIP contents copy করুন।
   2. npm install
   3. npm run lint:types
   4. npm run build
   5. git add .
   6. git commit -m "V47 responsive UI and natural Japanese voice"
   7. git push origin main

VOICE সম্পর্কে গুরুত্বপূর্ণ
--------------------------
পুরনো MP3 ZIP-এ intentionally রাখা হয়নি। Repository-এর GitHub Actions flow
scripts/extract_audio_texts.py -> scripts/generate_audio.py -> scripts/build_audio_manifest.py
চালিয়ে updated neural MP3 তৈরি করবে। নতুন script পুরনো profile/cache detect করলে regenerate করে।

Optional voice override:
N5_TTS_VOICE="jf_tebukuro" python scripts/generate_audio.py
অথবা default blend ব্যবহার করুন।

Optional speed override:
N5_TTS_SPEED="0.92" python scripts/generate_audio.py

QA STATUS IN THIS WORKSPACE
---------------------------
PASS: Python generate_audio.py py_compile
PASS: SCSS structural brace check (732 open / 732 close)
PASS: TS/TSX parse stage — no syntax/parser error detected
NOTE: isolated TS parse-check-এ React/lucide/@ alias modules পাওয়া যায়নি, কারণ full repo/node_modules
      এই patch workspace-এ নেই। তাই complete `npm run build` এখানে execute করা যায়নি।

মূল source repository-তে React 19 / Next.js 15 / Sass dependencies আছে; full repo-তে
npm install করার পরে lint:types/build চালিয়ে final production verification করুন।
