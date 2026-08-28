THE NIHONGO VIBES — V49.1 DEPLOY FIX
=====================================

Current GitHub Actions failure:
Type-check frontend -> components/Listening.tsx

Exact TypeScript error:
Argument of type 'string | undefined' is not assignable to parameter of type 'string'.

Root cause:
VocabItem.kanji can be undefined, but norm() accepted only string.

Fix:
function norm(text?: string) { ... }

Workflow improvement:
- npm install + TypeScript check now run BEFORE expensive TTS generation.
- audio cache uses save-always: true so later build errors do not waste a completed audio regeneration.

Replace ONLY these 2 files in GitHub:
1. components/Listening.tsx
2. .github/workflows/deploy-pages.yml

Suggested commit:
Fix V49.1 deploy type check and fail-fast workflow

Important:
The failed V49 run successfully generated all 2,669 emotive audio clips, but because the job failed later, that new cache was not saved.
Therefore the next successful run may need to regenerate them one more time.
