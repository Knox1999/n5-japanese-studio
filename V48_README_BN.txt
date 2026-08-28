N5 NATURAL JAPANESE STUDIO — V48 LEARNING INTELLIGENCE + MOTION UPGRADE
=======================================================================

এই patch V47-এর উপর merge/replace করার জন্য। Existing Next.js architecture অক্ষুণ্ণ থাকে; production build শেষে browser-এ HTML/CSS/JavaScript হিসেবেই serve হবে। Repository-তে থাকা Three.js + GSAP dependencies ব্যবহার করা হয়েছে।

V48-এ কী যোগ হয়েছে
-------------------
1) Listening Meaning Assist
   - প্রতিটি listening line-এর Japanese-এর সাথে বাংলা অর্থ দেখায়।
   - dialogue_extended/dialogue-এর 3rd column সরাসরি meaning হিসেবে ব্যবহার করে।
   - reading_extended + reading_extended_bn sentence alignment করে।
   - reading_extra_pairs sentence-level alignment করে।
   - shadowing line-এর জন্য একই Japanese line-এর available meaning পুনর্ব্যবহার করে।
   - current line-এর ভেতরে lesson vocabulary থেকে গুরুত্বপূর্ণ word hint দেখায়।
   - অর্থ default ON; user চাইলে hide/show করতে পারে।

2) Verb / い-adjective / な-adjective Visual Classification
   - word_type থেকে learning category বের করে color-coded badge দেখায়।
   - Verb, い-adjective, な-adjective-এর আলাদা rule strip আছে।
   - filter chips: All / Verb / い-adj / な-adj / ব্যতিক্রম।

3) Exception / Irregular Highlight
   - する: Group 3 irregular
   - 来る（くる）: Group 3 irregular stem changes
   - 行く（いく）: special て/た → 行って / 行った
   - ある: negative → ない
   - いい / 良い: よ- stem conjugation
   - きれい / 有名 / 嫌い: দেখতে い-ending হলেও な-adjective
   - source data-তে usage_notation / naturalness_note থাকলে সেটিও NOTE হিসেবে highlight হয়।

4) Three.js Global Ambient Layer
   - lightweight 3D particles + sakura-like points + depth rings
   - desktop pointer parallax
   - render throttling (~35fps target)
   - <=640px এবং prefers-reduced-motion-এ disabled
   - tab hidden হলে animation pause হয়

5) GSAP UX Motion
   - view/lesson change-এ smooth page reveal
   - active quick-nav micro animation
   - HeroScene-এর Fuji, branch, petals, sun glow আরও natural choreography
   - mobile/reduced-motion safe

Merge instructions
------------------
ZIP-এর app/, components/, lib/, styles/, scripts/, .github/ folders repository root-এর একই folders-এর উপর merge/replace করুন।

Important
---------
- `package.json`-এ repository-র existing `three` এবং `gsap` dependencies থাকতে হবে (current repo README অনুযায়ী আছে)।
- V48 full repo নয়; এটি ready-to-merge patch।
- Listening meaning-এর quality source lesson JSON-এর বাংলা translation-এর উপর নির্ভর করে। যেখানে line-level translation পাওয়া যায় না, UI স্পষ্ট fallback note দেখায়; ভুল translation invent করে না।
