# Phase 4 fresh holdout review — 2026-09-07

**Result: review finished; release gates remain open.** Twenty previously
unreviewed active records were inspected: **7 require corrections, 8 merit
polish, and 5 are linguistically acceptable as presented.** All 20 still lack
recovered example attribution. These decisions are not full-corpus certification
or a claim that seven sentences are ungrammatical: several required changes
concern metadata or the meaning being taught.

No vocabulary, generator, application, database, or production changes were made
in this review. Corrections below are proposals for the next implementation batch.

## Sample and method

[The saved manifest](phase4-holdout-sample.json) pins the IDs, selection algorithm,
seed, baseline commit `829f5e6fcdafa906878bdefa592a49e0c3cb52e0`, and corpus SHA-256
`bc0a3ba60f3a8ffd0cae051d9c8e3aabfe3b24ea3d5ccba79c3b6717c9ea7971`.
It was saved before inspecting the selected records. The population was active
records with both lexical and example review pending, excluding all 100 original
Phase 3 IDs: 517 eligible N5 and 487 eligible N4 records. Hash ordering selected
10 per level. This samples previously unreviewed learner-facing material, not
the quarantined catalog. It is fresh-ID agent review, not a blind independent
human/native-speaker audit. Do not extrapolate an error rate to the entire corpus.

For every record, the review inspected the expression, canonical kana, primary
meaning, POS, example and translation, each word/sentence ruby segment, target
span, dictionary entry/sense, classification evidence, priority and provenance.
The pinned local JMdict snapshot was checked against the source manifest; its
selected entries were read for all 19 dictionary-linked records. Additional
lookups checked びっくり, 億万長者 and the alternative reading ぬくい.

## Individual decisions

Glosses below are abbreviated where convenient. All rows also inherit the
unresolved provenance finding below. **Accept** means
no required linguistic correction was identified here, not permission to release.

### N5

| ID | Current word and example | Decision and action |
| --- | --- | --- |
| `v-jlpt-n5-0218` | 温い / ぬるい / “luke warm”; ここはちょっと温いですね？ — “It's a bit warm in here, isn't it?” | **Required.** Word ruby 温→ぬる is correct, but sentence ruby 温→ぬき produces **ぬきい**. Room warmth also leaves ambiguity with 温い/ぬくい; merely changing the annotation is insufficient. Teach “lukewarm; tepid” with a clear liquid-temperature example. JMdict `1183300:0` supports ぬるい and marks usual kana spelling; `2863133` is the separate ぬくい reading. |
| `v-jlpt-n5-0126` | どの / “which”; どの犬が黒い？ — “Which dog is black?” | **Required.** POS `suffix` is wrong: JMdict `1920240:0` identifies a prenoun adjective/determiner. Do not confuse it with honorific 殿/どの. The sentence, reading and 犬/いぬ・黒/くろ ruby are sound. Keep kana spelling. The Waller row uses 何の with reading どの; retain this source alias rather than declaring the source absent. |
| `v-jlpt-n5-0276` | 狭い / “narrow”; 狭い部屋だね。 — “It's a small room.” | **Polish.** Natural Japanese and a valid confined-space sense, not a mistranslation. Add “cramped” to the primary meaning so the example connects clearly. JMdict `1237680:0` includes the small/confined sense. 狭/せま + い and 部屋/へや are correct. |
| `v-jlpt-n5-0639` | 洋服 / “western-style clothes”; お洋服着ましょうね。 — “Let's get you dressed.” | **Polish.** Natural gentle caregiver speech; omitted を and contextual “you” are acceptable. Add that context instead of marking the sentence malformed. JMdict `1546020:0`; word 洋/よう・服/ふく and sentence 洋服/ようふく・着/き + ましょう are correct. |
| `v-jlpt-n5-0202` | 飲む / “drink”; ビール飲む？ — “Do you want to drink some beer?” | **Accept.** Natural casual offer with omitted を; the English captures the invitation. JMdict `1169870:0`; 飲/の + む is correct in word and sentence. |
| `v-jlpt-n5-0265` | 休む / “rest”; 仕事の途中で休む。 — “I take a break while working.” | **Accept.** Natural plain-form statement demonstrating taking a break. JMdict `1227560:1`; 仕事/しごと・途中/とちゅう・休/やす + む are correct. |
| `v-jlpt-n5-0615` | 毎日 / “every day”; 平凡な毎日さ。 — “I live an ordinary life.” | **Polish.** Natural nominal “everyday life/days” use with colloquial さ, but the POS only says adverb. Add the noun use (JMdict `1524720:0`) or teach the adverbial use first. 平凡/へいぼん and 毎日/まいにち are correct. This is not nonsense because the English supplies an implicit subject. |
| `v-jlpt-n5-0638` | 夕方 / “evening”; 夕方の五時です。 — “It's five in the evening.” | **Polish.** Add noun alongside the current adverb POS and clarify “late afternoon; early evening” without imposing rigid clock boundaries. JMdict `1542790:0`. 夕/ゆう・方/がた and 五/ご・時/じ are correct. |
| `v-jlpt-n5-0369` | 姉 / “(humble) older sister”; 姉はいない。 — “I don't have an older sister.” | **Polish.** Correct, natural short sentence. Make the beginner gloss “(my) older sister” and explain using 姉 for one's own sister when speaking to outsiders, versus お姉さん. The dictionary's humble label is not a reason to teach this as a special conjugation. JMdict `1307630:0`; 姉/あね is correct. |
| `v-jlpt-n5-0346` | 座る / “sit”; その上に座るな。 — “Don't sit on it.” | **Polish.** Grammatical but blunt prohibition; label that register or choose a neutral first example. Do not classify な prohibitions as malformed. JMdict `1291800:0`; 上/うえ and 座/すわ + る are correct. |

### N4-only

| ID | Current word and example | Decision and action |
| --- | --- | --- |
| `v-jlpt-n4-0472` | 地理 / “geography”; 地理は弱い。 — “I am weak in geography.” | **Accept.** Natural topic construction about one's weak subject. “I'm not good at geography” is optional English polish. JMdict `1421540:0`; 地/ち・理/り, sentence 地理/ちり・弱/よわ + い are correct. This sentence also appears on `v-jlpt-n5-0395`; sharing it demonstrates both targets but should remain visible in the duplicate-example report. |
| `v-jlpt-n4-0179` | 億 / “100 million”; トムは億万長者だ。 — “Tom is a billionaire.” | **Required.** 億万長者 is a natural idiom for a very rich person; “billionaire” is not an arithmetic mistranslation of 億. However, it fails to teach the target numeric value. JMdict `1182620:0` versus compound `1182670:0`. The matcher marks 億 as exact inside 億万長者, demonstrating that token boundaries alone do not establish the intended sense. Ruby 億/おく・万/まん・長者/ちょうじゃ is correct. Replace the example with an explicit amount. |
| `v-jlpt-n4-0128` | びっくりする / “surprised”; トムは絶対びっくりするよ。 — “I'm sure Tom will be surprised.” | **Required metadata correction; linguistically sound.** Missing dictionary linkage should resolve through the attested base びっくり, JMdict `1226360:0` (suru verb/adverb), while preserving する in the displayed verb. Do not force uncommon 吃驚 spelling or strip する from every verb indiscriminately. Missing linkage currently relegates this useful verb to the `additional` priority band. 絶対/ぜったい is correct; the word needs no ruby. |
| `v-jlpt-n4-0439` | 浅い / “shallow; superficial”; 眠りが浅いんだ。 — “I'm a light sleeper.” | **Required sense alignment.** Entirely natural Japanese and English, but light sleep is missing from the taught meanings and the stored sense points to `1390800:0`, rather than sleep sense `1390800:1`. Add the contextual meaning and correct provenance, or use a depth example first. 眠/ねむ + り and 浅/あさ + い are correct. |
| `v-jlpt-n4-0357` | 受ける / “to take a lesson or test”; ワクチンを受けるの？ — “Will you get vaccinated?” | **Required teaching alignment.** The vaccination sentence is natural, but does not teach the narrow displayed meaning. JMdict `1329590:4` encompasses undergoing/receiving as well as taking tests: this is not a wrong dictionary lexeme. Prefer a lesson/test example for this card, or explicitly broaden the meaning. 受/う + ける is correct. |
| `v-jlpt-n4-0272` | 絹 / “silk”; 絹は高価なんだよ。 — “Silk is expensive.” | **Accept.** Natural explanatory casual speech; 高価 may benefit from a gloss but is not evidence of an unsuitable sentence at N4. JMdict `1258710:0`; 絹/きぬ and 高価/こうか are correct. |
| `v-jlpt-n4-0239` | 急行 / “speedy; express”, POS `no-adjective`; これは急行ですか。 — “Is this an express?” | **Required.** Teach noun “express train” for this railway sense (`1228690:1`); the current gloss/POS conflates it with hurrying. Keep the natural Japanese; clarify English to “Is this an express train?” 急行/きゅうこう is correct. |
| `v-jlpt-n4-0246` | 驚く / “surprised”; 彼女はきっと驚く。 — “She is certain to be surprised.” | **Accept.** Natural Japanese and faithful English; “She'll definitely be surprised” is optional stylistic polish. JMdict `1238680:0`; 彼女/かのじょ and 驚/おどろ + く are correct. |
| `v-jlpt-n4-0452` | 足す / “to add a number”; １足す２は３である。 — “One plus two equals three.” | **Polish.** Correct mathematics and grammatical formal register. Consider です for a beginner first example. 足/た + す is correct, but the stored sentence reading leaves １・２・３ as digits, providing no pronunciation help; explicitly support いち・に・さん if a fully readable sentence is intended. This is an assistance gap, not incorrect kanji ruby. JMdict `1404700:0`. |
| `v-jlpt-n4-0232` | 規則 / “regulations”; 規則に逆らうな。 — “Don't go against the rules.” | **Polish.** Correct blunt command; annotate register or prefer a neutral example. “Rules; regulations” makes the meaning clearer. A zero gloss-overlap score is not evidence of a wrong sense here. JMdict `1223021:0`; 規/き・則/そく, sentence 規則/きそく・逆/さか + らう are correct. |

## Source, reading and curriculum findings

- **Word readings:** all 20 canonical readings and word segmentations were
  manually checked with no remaining error identified in this sample. Kana-only
  words need no ruby. This does not change the stored review flags or certify
  generated annotations elsewhere.
- **Sentence readings:** 19/20 had no incorrect kanji reading identified;
  温い has the definite ぬきい error. 足す separately lacks numeral pronunciation
  assistance. No uncertain word segmentation remained in this sample; sentence
  context for 温い must be resolved with its example, not guessed.
- **Provenance:** all 20 have imported examples with null attribution. Exact
  Japanese lookup in the pinned JMdict example snapshot recovered none of these
  20 sentences. This does not prove fabrication or infringement: it means this
  lookup did not establish redistributable provenance. Recover actual source,
  attribution and licensing, or replace with documented original/licensed text.
- **Lexical sources:** 19 have an appropriate dictionary lexeme, though 浅い's
  selected sense needs correction. びっくりする needs the base-form mapping above.
  Meanings inherited from list rows still need editorial selection; dictionary
  linkage alone has not cleaned up POS and senses.
- **JLPT confidence:** 19 report `high`, one (びっくりする) `medium`; the cited
  lists share Waller lineage. Nineteen exact expression/reading rows were found
  in Waller at the assigned level, using the 何の alias for どの. No exact
  びっくりする row was recovered in that check; base-form reconciliation remains.
  These are plausible curriculum placements, not independently corroborated
  modern JLPT classifications. No level was changed or newly certified here.
- **Priority:** dictionary commonness is supporting evidence, not a curriculum
  sequence. The missing びっくり linkage exposes lookup-dependent priority, while
  retained import order supplies no prerequisite/frequency evidence within bands.
- **Duplicates:** no duplicate Japanese/reading pairs were found for these
  records in the catalog. The 地理 example reuse noted above is the only selected
  example duplicated elsewhere in the catalog; review shared examples without
  assuming that every reuse is invalid.

Lexical evidence came from the existing pinned **JMdict/EDRDG** snapshot and
existing Waller-derived raw lists; no new dataset was incorporated.
[EDRDG's licensing page](https://www.edrdg.org/edrdg/licence.html) and the
repository's existing attribution records govern the imported lexical data.
Dictionary consultation must not be confused with permission for unattributed
sentences. For the contextual distinction between ぬるい and ぬくい, the
[Digital Daijisen entry via Kotobank](https://kotobank.jp/word/%E6%B8%A9%E3%81%84-594102)
was also consulted; no example sentences from that commercial dictionary were
copied into the dataset or proposals.

## Previously missed Phase 3 findings — outside this sample

The previous Phase 4 handoff said all **33** required findings were repaired.
That count did not reconcile the full audit: its overall historical decisions
are **41 required**, including findings written under prose headings rather
than table rows. Some earlier findings were already repaired by Phase 2, so
neither 41 nor 41 minus 33 is a current outstanding count.

Read-only checks found **at least six unchanged required records**:

| ID | Remaining earlier finding | Current gate |
| --- | --- | --- |
| `v-jlpt-n5-0415` 所 | “place” still tagged adverb; この場所に？ does not establish the intended independent target. | Quarantined |
| `v-jlpt-n4-0062` コンピュータ | Placeholder example; reconcile the existing コンピューター alias before deciding whether to retire this record. | Quarantined |
| `v-jlpt-n5-0095` たくさん | “many” with na-adjective POS and もうたくさんだ。 / “I have had it.” still teaches the wrong first sense. | **Active** |
| `v-jlpt-n4-0097` たいてい | “usually” still tagged na-adjective with a placeholder example. | Quarantined |
| `v-jlpt-n5-0654` 緑 | 緑茶は無理。 / “I can't drink green tea.” remains unsuitable for teaching green as the independent target. | Quarantined |
| `v-jlpt-n5-0296` 嫌 | みんな嫌い。 / “I don't like any of them.” still substitutes 嫌い for the intended lexeme. | Quarantined |

These are targeted carryover checks, **not six additional holdout observations**.
The completed fixes are useful, but the blanket completion/containment claim
must be withdrawn. No exhaustive reconciliation of every previous correction
was performed in this holdout turn.

## Correction follow-up — 2026-09-07

The seven required holdout repairs and the six listed missed Phase 3 findings
were implemented after this review through explicit generator overrides. The
five previously quarantined cards with usable repairs are now active. The
current generated counts are **730 N5 + 679 N4-only = 1,409 candidates**;
**584 N5 + 568 N4-only = 1,152 active**; **257 quarantined**. Focused
regressions cover each repair. This is a correction update, not a new audit or
provenance clearance.

## Remaining bounded work

1. Reconcile all 100 original decisions, including prose findings, into the
   existing correction workflow with repaired/retired/held evidence for each.
   Repair or explicitly hold the remaining active defects, including たくさん.
2. Apply the seven required holdout changes through the existing reproducible
   generator inputs. Add focused regressions for contextual ぬるい, どの POS,
   base-form びっくり linkage, sense alignment, and 億 versus 億万長者. Do not
   hard-code a general rule that rejects every compound or strips every する.
3. Recover or replace unresolved sample examples. Suitable **original proposals**
   include このお茶はぬるいです。 (“This tea is lukewarm”),
   この建物は一億円です。 (“This building costs 100 million yen”), and
   来週、日本語の試験を受けます。 (“I'll take a Japanese test next week”).
   Review their structured ruby, target aliases and translations before importing.
   Keep sound colloquial sentences when useful context suffices.
4. Recheck repaired fixtures, then verify actual rendered ruby on all vocabulary
   surfaces and mobile. This review inspected structured data, not screenshots.
   Run the integration/release checks after code/data changes and update exact
   replacement, retirement, approval and provenance counts.

## Verification and unchanged scope

Manifest determinism, exclusions, level counts, baseline hash and coverage of
all 20 IDs in this report were checked. The existing vocabulary validator was
run read-only: **0 structural issues, 1,868 quality flags** (flags are not unique
record counts). Structural success does not detect the linguistic defects above.
`git diff --check` was run for the documentation change. Full tests, typecheck,
lint and webpack build were not rerun for this documentation-only audit; the
earlier implementation's passing results are historical, not new release evidence.

The review itself added/removed/retired **0 terms**, replaced **0 examples**, and
changed **0 approval flags**. The documented correction follow-up then replaced
9 examples, changed meaning/POS/dictionary metadata on 4 other records, and restored 5
previously quarantined records without adding or retiring terms. All 20 reviewed
records still need provenance resolution; no push, merge, seed or deployment was
performed by the review or correction work.
