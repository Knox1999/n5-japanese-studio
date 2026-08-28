THE NIHONGO VIBES — TOP NOTCH v40 SAFE SINGLE-FILE UI
======================================================

এই প্যাকেজ আপনার exact existing single-file app-এর JavaScript rewrite করে না।

Default source:
docs/legacy-root/index-v44-single-file.html

Generated complete file:
index.html

Run from repository root:
python upgrade_index_top_notch_v40.py

অথবা আপনার active single file যদি root index.html হয়:
python upgrade_index_top_notch_v40.py index.html index.html

এই দ্বিতীয় ক্ষেত্রে backup হবে:
index.pre-tn40-backup.html

SAFETY
------
Generator output থেকে TN40 injected blocks remove করলে source-এর exact original text
ফিরে আসে কিনা SHA/byte-level verification করা হয়।

Original:
- IDs
- SpeechSynthesis references
- LocalStorage references
- addEventListener logic
- querySelector/getElementById logic
কোনোটাই rewrite করা হয় না।

DESIGN
------
Bangla: Hind Siliguri
Japanese: Noto Sans JP
English: Inter

Background: #0B0F19 / #0D1117
Glass: rgba(255,255,255,.035)
Border: rgba(255,255,255,.085)
Primary: #F3F4F6
Secondary: #9CA3AF
Accent: #FF2E63

Hero:
সহজে ও সাবলীল উপায়ে N5 জাপানিজ শিখুন
Top Notch v40 · Learning Intelligence
১,০১১+ শব্দ

IMPORTANT CURRENT-REPO NOTE
---------------------------
আপনার current main branch এখন Next.js production pipeline ব্যবহার করছে।
পুরনো single-file app V58 cleanup-এর পরে:
docs/legacy-root/index-v44-single-file.html
এ archive হয়েছে।

বর্তমান GitHub Pages workflow Next.js `app/` থেকে `out/` build deploy করে।
সুতরাং root-এ নতুন index.html রাখলেই বর্তমান live Next.js website replace হবে না।

যদি literal final complete index.html আমার কাছ থেকে চান, legacy/active index.html
ফাইলটি সরাসরি ChatGPT-তে upload করুন। তখন এই upgrader আপনার file-এর উপর চালিয়ে
final complete index.html ফেরত দেওয়া যাবে।
