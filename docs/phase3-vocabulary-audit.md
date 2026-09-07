# Phase 3 vocabulary audit

Status: **40 / 100 sampled records inspected.** Chunk 1 corrections applied;
chunks 2–4 findings below await Phase 4. Resume position 21 in each level.

## Chunk 1 (historical findings and subsequent corrections)
Five N5 and five N4 records inspected from candidate commit `03bce1f`. The
required and polish corrections below were applied in the Phase 2 completion
pass on 2026-09-06 (see `docs/vocabulary-quality-plan.md`), which also closed
the five systematic gaps this chunk identified (see the addendum at the end
of this document). Chunk 2 (N5/N4 sample positions 6–10) has **not** been
run; this pass is data correction and validation infrastructure, not
additional linguistic sampling. No production seed, deployment, or push.

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

## Addendum: Phase 2 completion pass (2026-09-06)

The "Systematic correction requirements" above are addressed as follows.
This addendum reports what changed; it is not a Phase 3 finding and does not
advance the 10/100 sample count.

1. **Canonical word-reading validation.** Added: the ruby's phonetic
   reconstruction is now compared against the stored reading, both at
   generation time and in `validateVocabularyDataset()`. Running the same
   kind of probe described above (mutating a ruby reading while leaving its
   display text correct) is now a permanent regression test in
   `tests/vocabulary-quality.test.ts`. Applying this check to the real
   corpus, independent of the probe, also surfaced and fixed six further
   defects it was designed to catch (a combined 見る/観る expression, a
   dropped お in お金持ち's reading, and duplicate/annotated readings) —
   these are optimization by-products of adding the check, not part of the
   ten sampled records.
2. **Substring target matching replaced.** `target_spans()` now aligns
   against fugashi/UniDic-lite token boundaries and lemmas instead of
   `example.find(expression)`. The 服/一服 case above is now a permanent
   regression fixture. Run against the full corpus, this rejected roughly
   140 more records with the same bug (the target word only occurs inside
   an unrelated longer compound) — those are quarantined by the new
   approval gate (#4), not silently corrected, since each needs its own
   replacement example.
3. **Content and provenance work.** `dictionarySourceId` (which could be
   set from successful ruby alignment, unrelated to any real dictionary
   lookup) is replaced by a `provenance.dictionary` field populated only by
   an actual full-JMdict entry/sense match, scored by gloss overlap with the
   stored meaning; `provenance.ruby` separately records whether
   JmdictFurigana or a generated fallback supplied the word ruby. Lookups
   now use the full JMdict snapshot (218k entries), not the common-only
   subset. Example attribution is recovered where the Japanese sentence
   text exactly matches a Tatoeba-sourced example in that snapshot; see
   `docs/data-quality-report.md` for how many examples that recovered
   versus how many imported examples still lack it (most still do — this is
   real, targeted work for Phase 3/4, not a completed pass).
4. **Approval gate.** `vocabulary.approval.approved` now gates what
   `vocabularyCorpus` exposes to the app; unapproved candidates stay in the
   full catalog. `docs/data-quality-report.md` reports catalog size and
   approved/active size separately, plus a breakdown of why each unapproved
   record was held back.
5. **Curriculum ordering evidence.** The commonality band (essential/common/
   additional) is now decided directly from foundation/dictionary-commonness
   membership and stored as `priority.band`; the importer's index only
   orders items within a band, so it can no longer push nearly every N4
   record past a shared numeric threshold regardless of actual commonness.

None of this is a substitute for inspecting sample positions 6–100; it closes
the mechanical gaps that let bad records pass unnoticed, so the remaining
audit chunks are working against a corpus that fails closed instead of
silently accepting substring mismatches and unvalidated readings.


## Chunk 2 — partial: two records (2026-09-07)

Inspected position 6 in each level from the fixed manifest against `ba4d863`.
Read both complete records, including gloss/POS, example/translation, every
ruby segment, target spans, priority, classification and provenance. This is
an agent linguistic review, not native-speaker certification. Neither record
is active: the mechanical gate correctly quarantines both. No corpus changes.

### N5 `v-jlpt-n5-0415`: 所 / ところ — required correction

- “Place” and 所→ところ are correct. The stored POS “adverb” alone is
  misleading for a beginner location card: use “noun” as the primary teaching
  label. JMdict entry `1343100`, sense 0, includes noun/adverb/suffix; do not
  claim the dictionary excludes adverbial uses.
- この場所に？ is a plausible conversational fragment, but demonstrates 場所
  (ばしょ), not 所 (ところ). All existing sentence ruby is correct; target
  mismatch is the defect. “Just right here?” supplies emphasis absent from
  the Japanese. Imported attribution remains missing.
- Original proposed replacement: ここは静かな所です。 / “This is a quiet place.”
  Ruby: ここは + 静(しず) + かな + 所(ところ) + です。 Canonical sentence reading:
  ここはしずかなところです。 This uses a beginner な-adjective and location noun.
- Retain the common natural headword 所 and its stable ID; kana ところ is
  also natural. No obscure alternate spelling is needed.

### N4 `v-jlpt-n4-0062`: コンピュータ — required correction

- Headword, reading, “computer,” and noun POS agree with JMdict `1053350`.
  Both コンピュータ and コンピューター are common dictionary variants; do not
  add the latter as a separate learning item solely for spelling variation.
- 「コンピュータ」という言葉を練習しています。 is a metalinguistic placeholder,
  not a useful demonstration of using a computer. Existing 言葉→ことば and
  練習→れんしゅう are correct, but correct ruby does not rescue the example.
- Original proposed replacement: 毎日コンピュータで仕事をします。 /
  “I work on a computer every day.” Ruby: 毎日(まいにち) + コンピュータで +
  仕事(しごと) + をします。 Reading: まいにちこんぴゅーたでしごとをします。
- The kana-only headword correctly has no ruby; its generic “uncertain
  segmentation” flag is unnecessary for this inspected word. This observation
  does not certify any replacement sentence generated later.

### Evidence, classification and follow-up

Cross-checked the full local JMdict snapshot at
`/private/tmp/nihon-made-corpus/jmdict/jmdict-examples-eng-3.6.2.json`, entries
`1343100` and `1053350` (via [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)).
No external example text was copied. Proposed examples above are original
editorial candidates and require verification after implementation.

Both assigned levels are plausible curriculum placements. Each record claims
high confidence from three sources explicitly sharing Waller lineage; this
is not independent corroboration. Independent list agreement was not verified
here. Phase 4 should qualify confidence as within-lineage agreement or lower
it pending independent evidence. Dictionary commonness supports usefulness,
not an exact frequency rank; the imported order remains editorially unverified.

Result: two required example replacements; one primary POS adjustment; both
stored word ruby representations and both existing sentence ruby sequences
appear correct. These two quarantined records do not estimate the active
corpus error rate. Next: positions 7–10 per level to finish chunk 2 (88 total
sample records remain). Keep baseline IDs and sample order unchanged.

Verification: checked reviewed IDs are unique, belong to the fixed sample and
exist in the current catalog; 12 total (6 N5, 6 N4). `git diff --check` passed.
No app tests/build rerun for this documentation-only audit.

## Chunk 2 — completed: positions 7–10 per level (2026-09-07)

Reviewed eight additional complete records at `8c0e655`; cumulative sample
progress is **20/100 (10 N5, 10 N4)**. Together with the preceding two-record
pass, this completes chunk 2. No dataset corrections or production changes.
Current catalog SHA-256:
`05bae31493ca3ebc0c8f08e54c5370ca43ebe8309dcc9e270b3c258d074db7ae`.
The original sampling hash and IDs remain unchanged.

### Individual decisions

**N5 `v-jlpt-n5-0095` — たくさん: required teaching correction; active.**
The kana spelling, reading and “many” sense are valid. However,
もうたくさんだ。 / “I have had it.” is natural Japanese/English expressing
“enough,” not a useful first example of quantity. Stored JMdict sense
`1415870:0` supports the gloss, while the example fits sense 1. Token presence
and gloss overlap do not establish example-sense alignment. “Na-adjective”
alone is a poor teaching label here: JMdict also lists adverb/noun/の-adjective.
Teach “many; a lot” with adverbial quantity use and explain たくさんの + noun;
do not mechanically encourage たくさんな + noun as the beginner pattern.
Original proposed example: 公園に人がたくさんいます。 / “There are a lot of
people in the park.” Ruby: 公園(こうえん)に人(ひと)がたくさんいます。
Reading: こうえんにひとがたくさんいます。 Existing word and sentence need no
ruby and are correctly stored without it. The generic uncertain-ruby flag is
unnecessary for this inspected kana-only material. Imported attribution is missing.

**N5 `v-jlpt-n5-0114` — テレビ: accept linguistic content; active.**
“Television,” noun, and kana spelling agree with JMdict `1080510:0`.
テレビを消して。 / “Turn off the TV.” is a natural casual request, uses the
primary television sense, and is useful beginner material. 消→け with して
left as kana correctly renders 消して (けして); separate し/て segments
are harmless. Explain casual request register if retained; do not reject the
sentence for brevity or force a rewrite. Headword has no kanji, correctly.
Imported sentence attribution remains unresolved; “accept” is linguistic
acceptance, not release or licensing clearance.

**N5 `v-jlpt-n5-0388` — 七つ: required example and reading correction; active.**
七→なな + つ and the number POS agree with JMdict `1319220:0`. Prefer the
teaching gloss “seven (things)” and a note distinguishing general counting
from age and other counters. The current example is a counting list shared
with 六つ, not a contextual sentence. Its English list is accurate, but its
ruby teaches 四つ as よんつ, 六つ as むいつ, and 八つ as ようつ. Correct
beginner readings are よっつ, むっつ, やっつ. In this native counting series,
十 should be とお; じゅう is valid for 十 elsewhere, not the intended sequence.
Other segments in the list are correct. Verified against JMdict entries
`1307040`, `1585315`, `1583095`, `1579840` and
[Kyoto University's counter lesson](https://www.samidori.k.kyoto-u.ac.jp/study/exam?id=158).
The lesson was consulted for reading facts; no lesson sentences/media copied.
Original replacement: みかんを七つ買いました。 / “I bought seven mandarin
oranges.” Ruby: みかんを七(なな)つ買(か)いました。
Reading: みかんをななつかいました。 Replacement still requires post-generation
reading review; fixing the text alone cannot repair the sentence annotator.

**N5 `v-jlpt-n5-0633` — 友達: recommended translation/context polish; active.**
Headword, ともだち, “friend,” noun and JMdict `1540170:0` agree. Word ruby
友→とも / 達→だち and sentence compound ruby 友達→ともだち are both correct.
友達でしょ？ is natural. “Are you friends?” omits the confirmation-seeking
force of でしょ and chooses participants without context. “You're friends,
right?” is closer if asking about the listener and another person; “We're
friends, right?” fits another context. Preserve that ambiguity in a usage note
or replace with an explicit scene. Optional original beginner example:
明日、友達とテニスをします。 / “I'm playing tennis with a friend tomorrow.”
Ruby: 明日(あした)、友達(ともだち)とテニスをします。
Reading: あした、ともだちとてにすをします。 Existing attribution is missing.

**N4 `v-jlpt-n4-0707` — スーパー: accept linguistic content; active.**
JMdict `1066710:0` confirms the supermarket sense and noun POS. This is the
right common sense, without obscure subtitle/radio senses. Kana spelling and
long vowels are correct. スーパーで買い物をします。 / “I shop at the
supermarket.” is natural, concrete and beginner appropriate. Sentence ruby
買→か + い + 物→もの correctly gives かいもの. The original editorial source
is documented in the generator's Phase 2 override, so no imported attribution
is claimed. Word ruby is correctly absent despite the generic uncertain flag.
Keep N4 provisionally with its explicit low-confidence note. This is useful
early shopping vocabulary; promote its curriculum priority within the chosen
mode without claiming an official N5 classification or duplicating the term.

**N4 `v-jlpt-n4-0097` — たいてい: required example/POS correction; quarantined.**
Kana spelling, reading and “usually” agree with JMdict `1414580:0` (usually
kana). Preserve kana. JMdict lists several POS categories, but “adverb” best
teaches this selected usage; “na-adjective” alone misleads. Current example is
an inherited metalinguistic placeholder. Its 言葉→ことば and 練習→れんしゅう
are correct, but it does not demonstrate habitual frequency. Original proposed
replacement: 日曜日はたいてい家にいます。 / “I usually stay home on Sundays.”
Ruby: 日曜日(にちようび)はたいてい家(いえ)にいます。
Reading: にちようびはたいていいえにいます。 Headword needs no ruby.

**N4 `v-jlpt-n4-0057` — このごろ: accept linguistic content; active.**
“these days; nowadays,” adverb, and reading agree with JMdict `1004710:0`.
Kana spelling is natural; この頃 is also a common dictionary form and need
not be forced onto this card. このごろ暖かい日が多い。 / “Recently we have had
many mild days.” demonstrates a recent recurring tendency naturally. English
is acceptable; “We've had a lot of warm days lately” would be optional polish.
暖→あたた + かい, 日→ひ, 多→おお + い are correct for this sentence. Grammar
is accessible at N4. Word ruby correctly absent. Imported attribution remains
missing; do not equate linguistic acceptance with resolved provenance.

**N4 `v-jlpt-n4-0461` — 台風: accept linguistic content; active.**
“Typhoon,” noun, spelling and たいふう agree with JMdict `1596780:0`.
台風は去った。 / “The typhoon is gone.” is grammatical, sense-aligned and
natural. “The typhoon has passed” is an optional closer English rendering.
去る may need a brief “pass/go away” vocabulary aid for this level, but the
short sentence is understandable and does not require advanced grammar.
台→たい / 風→ふう and compound 台風→たいふう both work; 去→さ + った is
correct. Imported attribution remains missing.

### Systematic findings and Phase 4 acceptance criteria

1. **Active sentence-reading defects survive structural validation.** A
   read-only call to `validateVocabularyDataset()` returns `issues: []` on
   this catalog. `sentence_segments()` derives both ruby and exampleReading
   from the same tokenizer output. Agreement between them is insufficient.
   Add reviewed contextual counter fixtures/overrides and test the generated
   output against independently specified correct readings. Include examples
   where the target's in-sentence reading must match its canonical word reading.
   Do not replace generic kanji readings globally: 四 in 四つ differs from
   四人, and 十 in this series differs from 十個.
2. **Targeted follow-up, outside the random-sample count:** the same counting
   list occurs in active `v-jlpt-n5-0662` 六つ. A search for the three bad
   readings also finds active `v-jlpt-n5-0366` 四つ with 見て！四つ葉！ /
   みて！よんつよう！, and active `v-jlpt-n5-0571` 八つ with 彼女は八つだ。 /
   かのじょはようつだ。 Four active records are implicated including 七つ.
   四つ葉 is よつば and is a lexicalized clover reference, not a clear general
   counting example. The 八つ age sentence is grammatical; 八つ needs やっつ
   and an age-use note. Review these three additional cards in Phase 4;
   targeted reading checks here are not complete sampled-record audits.
3. **Select example sense and pedagogical POS together.** たくさん passes
   token matching while teaching a different dictionary sense from its gloss.
   たくさん/たいてい POS lists are not best reduced to a single first-match
   adjective tag. Add teaching-use checks/overrides, retaining dictionary tags
   as evidence rather than pretending other grammatical uses do not exist.
4. **Recover source observations using verified spelling aliases.** Raw
   `waller-n4.csv` contains たいてい/大抵; `open-anki-n4.csv` contains
   大抵/たいてい and この頃/このごろ; `open-anki-n5.csv` contains 沢山/たくさん.
   Their matching kana-card evidence currently says `agrees: null`. The Anki
   スーパー (マーケット) row also explains the normalized スーパー identity.
   Use dictionary-backed aliases plus explicit original-row identity; never
   merge unrelated homophones based solely on kana. These recover within-source
   observations, not independent list consensus. Seven of this pass's eight
   records have “high” confidence based on a shared lineage; qualify that label.
   All eight placements are plausible; independent agreement remains unverified.
5. **Metadata/ordering follow-up.** Five kana-only headwords in this pass have
   correct absence of ruby despite being flagged uncertain. Separate word and
   sentence review status so accepting kana does not certify unreviewed sentence
   kanji. `linkedKanji` contains runs (e.g. `["友達"]`, `["台風"]`), not individual
   kanji IDs; only type/schema references were found outside JSON. Clarify this
   contract before any kanji-link UI consumes it. All eight are in the common
   priority band, but imported rank is not a pedagogical sequence; prioritize
   quantity, numbers, everyday activities and shopping based on prerequisites.

### Evidence and verification

Read all eight full records and their full-JMdict entry senses from the local
snapshot used in the preceding pass. JMdict IDs are given above; contextual
checks also used 消す `1350110`, 去る `1231650`, and 買い物 `1589730`; 四つ葉 `2139910` confirms よつば.
Raw source row comparisons were read-only. Proposed replacements are original
editorial candidates, not copied corpus sentences; no new material imported.

This pass: **3 required teaching/example fixes, 1 recommended polish, 4
linguistically acceptable records**. All eight word readings/ruby representations
appear correct; seven existing sentence ruby sequences appear correct and one
has multiple errors. Seven records are active, one quarantined. Six examples
lack imported attribution, one is a fallback, and one is documented editorial
content. Only 七つ shares its sentence with another catalog record in this pass.

Whole chunk 2 (including the prior two): five required, one polish, four
linguistically acceptable. No estimate of full-corpus error rate is implied.
All findings are agent review, not native-speaker certification or release approval.

Verified 20 unique reviewed IDs, 10 per level, exactly sample positions 1–10;
current records exist and the baseline sample remains unchanged. The read-only
validator probe passes despite the documented counter defects. `git diff --check`
passed; app tests/build were not rerun for this documentation-only increment.
Next: **chunk 3, positions 11–15 in each level; 80 sample records remain**.

## Chunk 3 — positions 11–15 per level (2026-09-07)

Reviewed ten complete records against `aacb5b6`: **30/100 sampled records
inspected (15 per level)**. Dataset unchanged, with the same SHA-256 recorded
for chunk 2. Read each full record including source evidence, priority, sense,
POS, sentence, translation, every ruby segment, and target spans. This is
agent linguistic review, not native-speaker certification. Findings and
original editorial candidates below are not applied corrections.

### Individual decisions

**N5 `v-jlpt-n5-0062` — この: required POS/dictionary correction; active.**
Kana spelling, reading, “this,” and この本です。 / “It's this book.” are
correct. The sentence is a natural short identification answer; 本→ほん is
correct and no word ruby is needed. But “number” is wrong for this word.
Stored dictionary entry `1578150` is 九 (nine), whose readings include an
uncommon この. The intended entry is `1582920` (此の/この), sense 0,
`adj-pn`: teach “determiner / pre-noun modifier,” followed by a noun, unlike
これ. Waller's raw N5 row already supplies the correct entry ID and 此の
spelling. `glossOverlap: 0` records the bad match but does not block approval.
[St. Olaf's demonstrative lesson](https://wp.stolaf.edu/japanese/grammar-index/genki-i-ii-grammar-index/kono-sono-ano-dono-genki-i-chapter-2/)
independently supports the noun-following construction; no lesson examples
copied. Keep the existing example if attribution is recovered. This is core
foundation material and merits priority with the other demonstratives.

**N5 `v-jlpt-n5-0654` — 緑: required example replacement; quarantined.**
緑→みどり, “green,” and noun/の-adjective usage agree with JMdict `1555300:0`.
“No-adjective” is defensible but should be explained as 緑の + noun. The
current 緑茶は無理。 / “I can't drink green tea.” is conversationally plausible
with context; it teaches 緑茶 (りょくちゃ), not 緑 (みどり). Both existing
sentence readings, 緑茶→りょくちゃ and 無理→むり, are correct. The gate properly
rejects the target mismatch. Original proposal: 緑のシャツを着ています。 /
“I'm wearing a green shirt.” Ruby: 緑(みどり)のシャツを着(き)ています。
Reading: みどりのしゃつをきています。 Preserve the natural kanji headword.

**N5 `v-jlpt-n5-0296` — 嫌: required example replacement; quarantined.**
嫌→いや, “unpleasant,” and na-adjective match JMdict `1587610:1`. However,
みんな嫌い。 / “I don't like any of them.” demonstrates 嫌い (きらい,
`1257240`), a distinct word, not an inflection of 嫌. Its stored ruby
嫌→きら + い is correct for the example; replacing it with いや would corrupt
that sentence. The same example occurs on みんな and 嫌い cards. Gate correctly
quarantines this target mismatch. Original proposal: 嫌なにおいがします。 /
“There's an unpleasant smell.” Ruby: 嫌(いや)なにおいがします。
Reading: いやなにおいがします。 This demonstrates the selected sense and な;
add a short note on においがする (“to smell / there is a smell”).

**N5 `v-jlpt-n5-0541` — 曇り: accept linguistic content; active.**
JMdict `1592340:0` supports “cloudy weather,” noun, and くもり. Word and
sentence 曇→くも + り, and 日→ひ, are correct. 曇りの日です。 / “It's a cloudy
day.” is an understandable weather statement with beginner grammar. Explicit
今日は曇りです。 would supply a time topic, but a short sentence alone is not
a defect requiring replacement. Keep noun usage clear rather than implying
曇り is an i-adjective. Imported attribution remains unresolved.

**N5 `v-jlpt-n5-0279` — 近い: recommended pedagogical simplification; active.**
近→ちか + い, i-adjective and “near” are correct (`1242130`). 決断の日は近い。
/ “The day of decision is at hand.” is grammatical but abstract and formal
for an introductory N5 distance word; 決断 adds unnecessary vocabulary. All
ruby is correct: 決断→けつだん, 日→ひ, 近→ちか + い. The sentence uses temporal
closeness (dictionary sense 1), while stored sense 0 describes distance. Both
are valid meanings of 近い; explain the distinction if retained. Prefer an
original first example: 家から駅まで近いです。 / “The station is close to my
house.” Ruby: 家(いえ)から駅(えき)まで近(ちか)いです。
Reading: いえからえきまでちかいです。 Keep temporal use as a secondary meaning.
The imported sentence and English translation were found together in the
local JMdict snapshot under 決断 `1254370:0`, Tatoeba ID `175904`; this is
recovered provenance, not proof of N5 suitability. Live Tatoeba page retrieval
failed during this pass, so current contributor/license details were not rechecked.

**N4 `v-jlpt-n4-0708` — ～について: accept linguistic content; active.**
The expression “about; concerning,” kana spelling and noun + について usage
match JMdict `1009780:0`. 日本の歴史について話しましょう。 / “Let's talk about
Japanese history.” is a useful N4 sentence. 日本→にっぽん is valid (`1582710`
also lists にほん); do not label it wrong merely because にほん is often taught
first. 歴史→れきし and 話→はな + しましょう are correct. The headword needs no
ruby. The leading ～ is a slot marker, not pronounced kana or an inflection.
Required metadata cleanup: `kanjiForm` should be null (there is no kanji), and
matching について after removing a slot marker should not be described as
an inflection. Keep a documented phrase/slot exception in the existing matcher.
N4 is plausible but the low-confidence single-source label should remain.
Source is an original Phase 2 editorial sentence, not an imported quotation.

**N4 `v-jlpt-n4-0528` — 拝見: required canonical-reading/furigana repair; active.**
The headword is 拝見 but its reading is はいけんする, all placed above those
two kanji. This is incorrect word ruby even though it reconstructs the stored
(bad) reading. JMdict `1472270` supplies 拝見 / はいけん, noun + suru verb,
marked humble/polite. Prefer retaining the stable ID/headword with reading
はいけん and ruby 拝見→はいけん; label “noun; suru verb” and explain 拝見する
as humble “to look at / see.” If choosing 拝見する as the headword instead,
する must be visible kana outside the ruby. Do not create a duplicate card.
Current dictionary provenance is null because the mismatched reading prevents
lookup; correcting it should recover `1472270` and its commonness signal.
搭乗券を拝見します。 is natural service language, and sentence ruby
搭乗→とうじょう, 券→けん, 拝見→はいけん + します is correct. “May I see your
boarding pass, please?” is a plausible functional translation, not a literal
question encoded by します. Explain that context or use an explicit request.
Original simpler proposal: 写真を拝見してもいいですか。 / “May I look at the
photos?” Ruby: 写真(しゃしん)を拝見(はいけん)してもいいですか。
Reading: しゃしんをはいけんしてもいいですか。 Teach ordinary 見る first, then
this humble usage. Current attribution remains unresolved.

**N4 `v-jlpt-n4-0035` — お宅: accept linguistic content; active.**
“(polite) your house,” noun and おたく match JMdict `1002400:0`. Keep お as
kana, 宅→たく as ruby. 明日お宅に伺います。 / “I'll pay you a visit at your
house tomorrow.” is natural, with an appropriately respectful home reference
and humble 伺う. 明日→あす is valid (`1584660`) and appropriate in this register;
あした is another valid reading, not a mandatory correction. 伺→うかが + います
is correct. Useful N4 honorific material after basic visiting verbs. Retain the
home sense without introducing the unrelated hobby-fan meaning of オタク.
Explain respectful register in the usage note; imported attribution still missing.

**N4 `v-jlpt-n4-0164` — 一生懸命: recommended gloss/POS polish; active.**
JMdict `1164010:0` supports the canonical spelling, いっしょうけんめい, and
adverb/na-adjective/noun categories. “With utmost effort” is accurate but
“hard; with all one's effort” is easier learner English. 一生懸命働いた。 /
“He worked hard.” is natural; Japanese omits the subject, so “he” is one
contextual interpretation, not grammatically specified gender. No replacement
required on that basis. Display the adverbial use exemplified here alongside
other POS support, rather than only “na-adjective.” All ruby is correct:
word 一→いっ / 生→しょう / 懸→けん / 命→めい; sentence 一生→いっしょう,
懸命→けんめい, 働→はたら + いた. Compound segmentation differences are valid.
Imported attribution remains unresolved.

**N4 `v-jlpt-n4-0504` — 途中: recommended usage/POS clarification; active.**
途中→とちゅう and “on the way” agree with JMdict `1582200:0` (noun/adverb).
家に帰る途中なの？ / “Are you on your way home?” is natural and useful N4
conversation. 家→いえ, 帰→かえ + る, 途中→とちゅう are correct; the word's
途→と / 中→ちゅう segmentation is also valid. “Adverb” alone fails to explain
the nominal construction shown here: verb dictionary form + 途中, with なの？
as a casual explanatory question. Add noun usage and a register note; optionally
show the polite equivalent with 途中ですか. Retain the current sentence if
attribution can be recovered.

### Systematic findings and Phase 4 requirements

1. **Dictionary entry selection must consider homographs/homophones.**
   `jmdict_index()` stores only the first entry for each form/reading using
   `by_form.setdefault`. `select_sense()` then searches only that entry. For
   この this retains 九 and discards the correct demonstrative entry even
   though the gloss is exactly “this.” Retain candidate entries, respect
   reading/spelling restrictions and commonness, and select using intended
   sense/POS plus source IDs. Test that この resolves to `1582920` and that
   genuine 九 remains a number. Do not assume zero English overlap always
   proves an error, but route unresolved matches to review instead of certifying
   the first match. POS also needs correction at its authoritative import source;
   fixing provenance alone does not update the learner-facing label.
2. **Canonical consistency is not lexical correctness.** The same malformed
   headword/reading pattern as 拝見 appears in **30 active candidates (4 N5,
   26 N4)**: reading ends in する, headword does not, and all 30 put する in
   ruby over the headword. Targeted scan, not 30 extra full audits. IDs:
   N5 `0362`, `0471`, `0601`, `0659`; N4 `0154`, `0170`, `0172`, `0176`,
   `0257`, `0259`, `0279`, `0327`, `0370`, `0371`, `0372`, `0380`, `0381`,
   `0396`, `0400`, `0419`, `0425`, `0426`, `0445`, `0459`, `0525`, `0526`,
   `0528`, `0579`, `0603`, `0604` (prefix `v-jlpt-<level>-`). Validate each
   base noun against the dictionary before normalizing; never strip する
   indiscriminately from legitimate verbs. Retain IDs/progress and check for
   collisions with prior retired variants. Use explicit reviewed fixtures for
   拝見 / はいけん and, if supported, 拝見する / はいけんする.
3. **The target gate helps but does not certify content.** 緑/緑茶 and
   嫌/嫌い are correctly held back. この and 拝見 are active despite serious
   lexical defects. 近い has recovered attribution but remains a poor first
   teaching example. Approval must keep mechanical checks, lexical review,
   pedagogical review and source/licensing review visibly distinct.
4. **Preserve legitimate contextual alternatives.** 日本→にっぽん and
   明日→あす are valid in these samples. Regression coverage should prevent
   broad corrections from replacing all alternative readings automatically.
5. **Classification and order:** eight records claim high confidence from the
   same Waller lineage, 拝見 medium, ～について low. All ten placements are
   plausible curriculum choices; independent source agreement was not verified.
   Waller N4 has 拝見/はいけん, while Anki N4 stores 拝見/はいけんする: record
   the latter as a source-format defect rather than a JLPT disagreement.
   Waller N5 contains 此の/この with the correct dictionary ID despite the
   kana card's null evidence match. Retain source-row identity across repairs.
   Nine records are in the common band; 拝見's additional band is plausibly
   influenced by its failed dictionary match. Recalculate after repair, then
   sequence honorifics after basic verbs instead of treating import rank as
   curriculum evidence. This scan did not establish numerical frequency ranks.

### Evidence and verification

Full JMdict entries/senses inspected from the local snapshot recorded in prior
chunks; relevant entry IDs appear in the decisions above. Word source rows
were cross-checked for この and 拝見. No external examples imported. Nine
sentences are imported: eight lack recovered attribution, while 近い has a
matching Japanese/English pair in the local Tatoeba-derived snapshot. One
sentence (～について) is original Phase 2 editorial content. Licensing of
unattributed imports remains unresolved; lexical approval is not permission
to redistribute examples.

Result: **4 required lexical/example corrections, 3 recommended teaching
improvements, 3 linguistically acceptable records** (～について also needs
metadata cleanup). Eight active, two quarantined. Nine word ruby representations
appear correct and one (拝見) is wrong; all ten current sentence ruby sequences
appear correct. 嫌's example is shared with two other cards; no other sampled
example in this batch is duplicated in the current catalog. These are findings
for the sample, not a full-corpus quality estimate.

Verified 30 unique reviewed IDs, exactly positions 1–15 per level, all still
present; original sample seed/hash/order and current corpus unchanged.
`git diff --check` passed. No application tests/build rerun for a documentation-only
audit. Next: **chunk 4, positions 16–20 per level; 70 sampled records remain**.

## Chunk 4 — compact audit, positions 16–20 per level (2026-09-07)

Reviewed at `c30a8a1`; **40/100 inspected, 20 per level**. Same unchanged
catalog hash as chunk 2. Compact packets covered term/reading, gloss/POS,
examples/translations, every ruby segment, source/sense, target spans, status,
priority and supporting metadata. Decisions below are agent review and proposed
Phase 4 work, not applied data changes or native-speaker certification.

| Record | Decision and correction |
| --- | --- |
| N5 `0214` 押す | **Polish; active.** Word 押(お)す and example ボタンを押す。 have correct readings. Natural instructional dictionary form; “Press the button” fits that context, though it is not an explicit imperative inflection. Prefer primary “to push; to press”; keep stamping secondary. **Required provenance repair:** stored `1180470:4` is interpersonal pressure; the button example uses sense 1. Gloss-overlap selection has favored the wrong sense. |
| N5 `0193` 一月 | **Required; active.** 一(ひと)月(つき), “one month,” noun match `1162130:0`. 一月に彼に会いました。 / “I met him in January” instead uses いちがつ. Existing ruby 一→いち, 月→がつ, 彼→かれ, 会→あ + いました is correct for January, but not the target lexeme. Prefer natural disambiguating spelling **ひと月** (same stable ID/reading) and original example **ひと月日本にいます。 / “I'll be in Japan for a month.”** Ruby: ひと月(つき)日本(にほん)にいます。 Record the dictionary-backed spelling alias; do not conflate January progress with duration progress. |
| N5 `0131` など | **Required; active.** Kana/particle/“et cetera” fit `1582300:0`, but 神などいない。 uses dismissive “such a thing as,” closer to sense 2. Japanese is natural; the problem is sense alignment, not its religious subject. 神→かみ is correct; word needs no ruby. Original: **スーパーでパンや卵などを買いました。 / “I bought bread, eggs, and other things at the supermarket.”** Ruby: スーパーでパンや卵(たまご)などを買(か)いました。 Explain the non-exhaustive や…など list; preserve kana spelling. |
| N5 `0378` 時々 | **Polish; active.** “Sometimes” and `1598680:0` fit. Add **adverb** to the teaching POS; dictionary の-adjective support does not explain this example. 彼は時々変です。 is natural; “Sometimes he acts strangely” is a reasonable smoother translation, or retain the current contextual translation. All ruby correct: 彼→かれ, 時→とき / 々→どき (compound ときどき also valid), 変→へん. No compulsory sentence rewrite. |
| N5 `0175` ラジオ | **Accept linguistically; active.** Noun/radio, `1138860:0`; preserve modern ラジオ. ラジオ、切った？ / “Did you turn off the radio?” is natural casual speech with omitted を. 切→き + った is correct; no headword ruby. Add a register note if retained rather than rejecting punctuation/ellipsis. |
| N4 `0255` 形 | **Required; quarantined.** 形→かたち, noun/shape match `1250220:0`, but あの人形怖い。 / “That doll is scary” teaches 人形→にんぎょう. Existing ruby, including 怖→こわ + い, is correct; gate properly rejects target mismatch. Original: **このパンは星の形をしています。 / “This bread is shaped like a star.”** Ruby: このパンは星(ほし)の形(かたち)をしています。 Explain ～の形をしている as a shape-description pattern. |
| N4 `0073` しばらく | **Required teaching replacement; active.** Adverbial `1304420:1` is “for a while; for some time,” a better gloss than “little while.” しばらくね。 is a valid reunion greeting (sense 3), not a duration example; “It's been a while” is closer than the generic “Nice to see you again.” Original duration example: **ここでしばらく待ってください。 / “Please wait here for a while.”** Ruby: ここでしばらく待(ま)ってください。 Existing kana-only word/sentence are correctly unannotated. |
| N4 `0473` 恥ずかしい | **Accept linguistically; active.** i-adjective, `1421630:0`. 恥ずかしいなぁ！ / “How embarrassing!” is natural emotional speech. Optionally broaden gloss to “embarrassed; embarrassing.” 恥→は + ずかしい correctly respects visible okurigana; do not move ず into ruby while retaining it below. Preserve なぁ punctuation and register. |
| N4 `0359` 周り | **Polish; active.** Noun/surroundings, `1604290:1`; 僕は周りを見回した。 / “I looked around me” is natural and demonstrates the term. All ruby correct: 僕→ぼく, 周→まわ + り, 見回→みまわ + した (a compound ruby span is acceptable). Add a brief 見回す “look around” aid for N4 accessibility; sentence replacement is optional. |
| N4 `0349` 社長 | **Accept linguistically; active.** Company president/noun, `1322920:0`. 社長は外出中です。 / “The president is out now” is useful workplace language. Optionally specify “company president” in English. 社→しゃ / 長→ちょう and compound しゃちょう, 外出→がいしゅつ, 中→ちゅう are correct. Explain 外出中 “currently out” if needed. |

IDs above have prefix `v-jlpt-<level>-`. All ten lexical entries/senses were
checked in the cached full JMdict snapshot used in previous chunks; all stored
canonical readings and word ruby appear correct. All current sentence readings
are plausible for their actual sentences, including January's いちがつ;
correct readings do not establish target-word/sense alignment.

**Apply existing systemic requirements, with two new regression cases:**
- 一月/ひとつき must not accept a January/いちがつ example merely because text
  and token boundaries match. Match intended lexeme/reading and context, allowing
  reviewed spelling aliases and inflections. This extends chunk 3's lexical
  identity requirement; avoid universal same-reading rules for legitimate variants.
- 押す demonstrates why overlapping gloss words cannot certify a selected sense.
  Reuse the sense-alignment work already specified for たくさん and 近い.

All ten are plausible level assignments, in the common priority band, claiming
high confidence from the same Waller lineage; no independent JLPT consensus or
numerical frequency was established. Duration/list-making/frequency deserve
foundation sequencing; teach company titles after everyday nouns. All ten
examples are imported without recovered attribution, so linguistic acceptance
is not release approval. Original proposals above are not copied source examples.
Duplicate-example scan: 押す shares its example with `v-jlpt-n5-0158`; 形 with
`v-jlpt-n4-0411`. Shared examples alone are not invalid, but target sense must
be evaluated separately for each card. No additional sampled records counted.

**Result:** four required example/teaching replacements; three polish decisions
(one also needs a dictionary-sense metadata fix); three linguistic accepts.
Nine active, one quarantined. Ten correct word ruby representations; no new
incorrect sentence-reading finding, but one homograph/reading target mismatch.
Verified 40 unique reviewed IDs, positions 1–20 per level; sample and corpus
unchanged. `git diff --check` passed. No app tests/build needed for this
documentation-only audit. **Next: positions 21–25 per level; 60 remain.**
