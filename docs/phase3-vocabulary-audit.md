# Phase 3 vocabulary audit — chunk 1

Status: **10 / 100 sampled records inspected; corrections pending.**
Five N5 and five N4 records inspected from candidate commit `03bce1f`.
This chunk changes audit documentation only. Pause before chunk 2 to respect
the user's credit budget. No production seed, deployment, or push.

## Sampling and resumption

[The saved manifest](phase3-vocabulary-sample.json) fixes the dataset hash,
seed, algorithm, and all 100 IDs. Sort SHA-256(seed + NUL + ID) within each
level and select the first 50. This is a deterministic pseudorandom sample
without replacement, not a handpicked selection of the weakest entries.
Inspect five from each level per chunk. Do not regenerate the sample on a
changed dataset; retain baseline identity and compare corrected versions.

Chunk 1 reviewed positions 1–5 in each level. Chunk 2 starts at positions
6–10. Targeted code probes below do not count as additional sampled records.

This is an agent linguistic audit, not native-speaker certification. I read
the expression, reading, gloss, POS, Japanese/English example, all stored ruby
segments, classification evidence, priority, and provenance for each record.
No screenshots or full browser-accessibility review occurred in this chunk.

## Result

- Three records require correction before release: one placeholder, one wrong
  target sense, and one incorrect contextual sentence reading.
- Four further records have recommended teaching/English improvements.
- Three records have no blocking linguistic issue in this inspection.
- All ten word-level ruby segmentations appear correct for their stored forms.
  Nine sentence segmentations appear correct; one is demonstrably wrong.
- All ten still lack enough per-example attribution and selected dictionary
  sense evidence for release sign-off. The manifest is a source catalogue,
  not proof that a particular meaning/example was checked against that source.

These are findings for ten records, not estimates of the full corpus error
rate. The candidate should remain unreleased. The earlier statement that
Phase 2 was complete overstated the work: it added useful infrastructure but
left corpus remediation and important validation/provenance requirements open.

## Individual decisions

The IDs in this table have prefix `v-jlpt-`. Proposed sentences below are
original editorial candidates, not imported quotations or applied corrections.

| ID / word | Inspection and decision | Correction or recommendation |
| --- | --- | --- |
| `n5-0713` ～週間 / ～しゅうかん | **Required:** 「～週間」という言葉を練習しています。 is a placeholder, not an example of a duration. Meaning “~ weeks” is understandable; noun POS has dictionary support, but a duration-use note is missing. Word 週間→しゅうかん and sentence ruby are correct. | Explain “weeks (duration)” and demonstrate a numbered duration: 日本に二週間います。 / “I will stay in Japan for two weeks.” Review 二週間 as にしゅうかん and preserve the numeral/counter relationship. |
| `n5-0446` 晴れる / はれる | **Polish:** 晴れると思う。 is natural, correctly read, and demonstrates the weather sense. “I think it will be fine” is ambiguous English without weather context. “To be sunny” is supported, but “to clear up” explains the verb better. | Use “to clear up; to be sunny” and a concrete time: 明日は晴れると思います。 / “I think it will be sunny tomorrow.” Explain と思います if used with N5 material. |
| `n5-0384` 自動車 / じどうしゃ | **Polish:** 自動車は左折した。 is grammatical and sense-aligned; 左折→させつ and other ruby are correct. “Automobile” is formal English; the turning vocabulary adds avoidable burden to an early card. | Prefer “car; automobile.” Candidate: 父は自動車で会社に行きます。 / “My father drives to work.” Mention that 車 is common in everyday conversation; do not remove 自動車 just for being formal. |
| `n5-0048` カレンダー / カレンダー | **Accept linguistic content:** カレンダーはどこ？ / “Where is the calendar?” is a natural casual question. Meaning/POS fit; kana-only spelling correctly has no ruby. | Keep. Optional register note: casual; polite form ends in どこですか. Shortness alone is not a defect. |
| `n5-0442` 服 / ふく | **Required:** 一服させて。 / “Let me have a cigarette” demonstrates 一服, not clothing. Stored target span incorrectly labels the 服 inside 一服 as an exact match. Ruby 服→ふく and 一服→いっぷく are each valid for their different words; valid readings do not rescue the sense mismatch. | Replace with この服は少し大きいです。 / “These clothes are a little too big.” Reject substring-only matches when the target is part of a different lexeme or sense. |
| `n4-0326` 指輪 / ゆびわ | **Polish:** 指輪がない。 / “My ring is gone” is natural and plausible; the English supplies an implicit owner reasonably. Both word and sentence ruby are correct. “Finger ring” sounds dictionary-like. | Change primary meaning to “ring (jewelry).” Keep the short example if attribution can be recovered; it is not malformed just because it is short. |
| `n4-0609` 予約 / よやく | **Accept linguistic content:** 予約してある。 / “I have a reservation” naturally expresses an arrangement already made. Readings and target are correct; てある is useful N4 grammar. | Keep or add a location for context. Improve POS display to “noun; suru verb” because the headword is 予約, not 予約する. No need to replace a natural sentence merely for brevity. |
| `n4-0412` 人口 / じんこう | **Accept linguistic content:** その町は人口が多い。 demonstrates population naturally; 町→まち, 人口→じんこう, 多→おお are correct. English “The city has a large population” conveys the core idea. | Optional closer translation: “That town has a large population.” Keep meaning/POS. |
| `n4-0554` 布団 / ふとん | **Required:** 布団干しといて。 is a colloquial request with omitted を and contracted ておいて. In this request 干し is **ほし**, not stored **ぼし**. The generated ふとんぼしといて。 reading is wrong, although its text-reconstruction check passes and status is `automated`. | Use a clearer teaching sentence: 天気がいいので、布団を干します。 / “The weather is nice, so I will air the futon.” Store 干→ほ, します as kana. Review contextual verb readings separately from compound-noun readings. |
| `n4-0577` 捕まえる / つかまえる | **Polish:** 虫を捕まえる。 is natural and correctly read. The primary gloss “to seize” is a less useful choice here than “to catch”; “I capture insects” is stiff English. | Prefer “to catch; to capture” and “I catch insects.” The sentence can stay if provenance is recovered. An optional richer original example is 子どもたちが虫を捕まえています。 / “The children are catching insects.” |

### Lexical and level evidence

Cross-checked the local JMdict English example snapshot (dictionary date
2026-08-31, schema 3.6.2): 週間 `1333500`, 晴れる `1376470`, 服 `1500940`,
一服 `1166260`, 干す `1603510`, 捕まえる `1597780`, 予約 `1543750`.
These support the lexical distinctions above; they do not certify sentence
pedagogy or JLPT level. The snapshot originates from
[jmdict-simplified](https://github.com/scriptin/jmdict-simplified).

All ten placements are plausible curriculum choices. Nine records claim
medium confidence and one (～週間) low confidence. Independent list agreement
was not established in this chunk; keep this uncertainty explicit. Current
`source_evidence()` copies the chosen item level into every source observation
instead of retaining each original source's observed classification. The
stored evidence therefore cannot demonstrate source agreement or disagreement.

## Systematic correction requirements

1. **Add canonical word-reading validation.** An in-memory probe changed only
   服's word ruby to `ねこ`, leaving canonical reading `ふく`; the existing
   `validateVocabularyDataset()` returned `issues: []`. Compare reconstructed
   word reading to canonical kana, with explicitly defined normalization.
   Sentence-reading validation currently compares two values produced together
   by the same generator; it cannot catch the 布団 contextual reading error.

2. **Replace substring target matching.** `target_spans()` accepts any
   `example.find(expression)`. This directly explains the 服/一服 false pass.
   Use token/lemma plus selected-sense alignment and explicit exceptions for
   counters/inflections. Reuse this as a negative regression fixture. The
   current る-suffix heuristic is not a complete Japanese inflection system.

3. **Finish content and provenance work.** The generator mostly copies old
   glosses/POS/examples and adds annotation. It does not perform the planned
   dictionary sense reconciliation. `dictionarySourceId: "jmdict"` can even
   follow successful generated alignment: `word_exact` is overwritten by the
   fallback alignment result. Separate lexical source lookup, ruby source,
   mechanical alignment success, and actual review status. Store entry/sense
   IDs and actual per-source level observations; recover sentence attribution
   or replace with documented original examples. JmdictFurigana describes a
   word-level segmentation resource, not a lexical sentence parser or source
   of definitions. [Project documentation](https://github.com/Doublevil/JmdictFurigana)

4. **Enforce the candidate/release distinction.** All 1,443 candidate records,
   including 139 fallback examples and 20 flagged ruby alignments, currently
   flow directly into the active adapter. A review queue alone does not
   quarantine unresolved content. Add an explicit approval gate and ensure
   the report labels candidate versus approved counts correctly. Complete the
   remaining Phase 2 requirements before calling the corpus ready for Phase 4
   release. Leave content corrections to the authorized implementation phase.

5. **Fix curriculum ordering evidence.** A read-only count found **all 707 N4
   items in the “Later sequence” band**. Global input indexes dominate the
   threshold, and imports retain their old sequence except for a small N5
   foundation. Use per-level editorial priority with validated ordering;
   common-dictionary membership and source count do not establish frequency.

Further checks remain for later chunks: stable identity across spelling
corrections, historical-session edge cases, repeatable source regeneration,
per-sentence licensing, complete vocabulary surfaces including guest mode,
and browser rendering. Do not silently treat these as already passed.

## Verification and next chunk

Verified the manifest has 100 unique existing IDs, 50 at each level, the
recorded dataset hash, and ten reviewed IDs matching chunk 1. `git diff
--check` passed. The deliberately failing validator probe made no file or
database changes. App tests/build were not rerun for this documentation-only
audit; their earlier passing results do not establish linguistic correctness.

Next chunk: inspect N5 sample positions 6–10 and N4 positions 6–10, add ten
individual decisions here, and update the manifest's reviewed-chunk list.
Keep the current corpus unchanged during the audit. Phase 3 remains open.
