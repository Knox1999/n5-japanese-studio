# Public learning and JLPT N5 mock research report

**Audience:** Product owner and maintainers  
**Date:** 2026-09-01  
**Scope:** Pre-login learning value, Bangla/English presentation, JLPT N5 mock structure, responsive UI and external-resource policy.

## Executive answer

The public experience should demonstrate the product before asking for an account. The implemented public lab therefore includes a bilingual starter lesson, listening samples, a five-question diagnostic and a curated N5 resource directory. Account creation remains the transition to saved progress, SRS, the full 25-lesson course and mock history.

The internal mock system now offers four clearly different practice sizes: Quick (6), Lesson (15), Mini (30) and Full (67). The 67-item version is a practice blueprint based on common high-quality online practice-test structures; it is not represented as an official fixed JLPT question count. The Full practice timing follows the official N5 section timing: Vocabulary 20 minutes, Grammar/Reading 40 minutes and Listening 30 minutes.

## Findings and implementation decisions

1. The official JLPT describes N5 sections and item types, but does not publish a reusable bank of complete live examinations. The app creates original questions from its owned lesson data and uses official material only through links.
2. Official pass decisions use scaled scores and section minimums. The app labels its result as a raw practice percentage and separately explains the official 80/180 overall, 38/120 language/reading and 19/60 listening requirements.
3. Official sample questions and practice workbooks are the strongest first-party free resources. Additional providers were included only when their N5 offering, access conditions and test shape were directly verified.
4. Copyright restrictions make copying third-party test questions into the repository inappropriate. External resources remain provider-attributed outbound links.
5. Bangla is the default public language because the primary audience is Bangladeshi; English remains available with a visible toggle. Japanese terms are preserved where they are part of the learning content.

## Source ledger

| Source | What it supports | Role |
| --- | --- | --- |
| [Official JLPT test sections](https://www.jlpt.jp/sp/e/guideline/testsections.html) | N5 timing: 20/40/30 minutes | Primary |
| [Official N5 item types](https://jlpt.jp/e/guideline/pdf/n5_e_revised.pdf) | Vocabulary, grammar/reading and listening task taxonomy | Primary |
| [Official score criteria](https://www.jlpt.jp/guideline/results.html) | Overall and sectional pass minimums; scaled-score context | Primary |
| [Official sample questions](https://www.jlpt.jp/e/samples/forlearners.html) | First-party sample access | Primary |
| [Official Practice Workbook](https://www.jlpt.jp/e/samples/sampleindex.html) | First-party workbook and listening files | Primary |
| [JLPT site policy](https://www.jlpt.jp/e/policy.html) | Reproduction and reprint restrictions | Primary |
| [Bunpro practice tests](https://bunpro.jp/jlpt_practice_tests) | Five free N5 practice tests, 67 items, 90 minutes, no account | Secondary/provider |
| [Conjugaizen N5 practice](https://conjugaizen.com/jlpt-n5-practice-test/) | Two 67-question, 90-minute tests with review/listening | Secondary/provider |
| [Unagibun online JLPT](https://www.unagibun.com/jlpt-online/) | Free N5 simulation using official section timing; email required | Secondary/provider |
| [JTest4You N5](https://japanesetest4you.com/) | Large categorized N5 practice bank | Secondary/provider |

## Limitations

- The in-app Full Mock is an original practice simulation, not an official JLPT examination or score predictor.
- External providers can change their access rules or URLs. The directory records a review date and should be rechecked periodically.
- Browser speech fallback quality depends on the learner's device; published static neural MP3 remains the preferred playback path.

## Recommended maintenance

- Re-verify external resource URLs and access conditions at least quarterly.
- Expand original listening items only with owned or properly licensed audio.
- Use anonymized completion analytics to decide which public exercise should be expanded next.
