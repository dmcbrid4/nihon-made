# Vocabulary quality: audit and implementation plan

> Phase 2 completion pass (2026-09-06): the four systematic gaps the first
> Phase 3 audit chunk found — no canonical word-reading validation, substring
> target matching, cosmetic provenance, and no approval gate — are now
> implemented and covered by regression tests. See "Implementation and review
> gates" below for exactly what this pass does and does not establish. The
> [Phase 3 audit](phase3-vocabulary-audit.md) and its 10 already-reviewed
> records remain the authoritative line-by-line findings for the IDs it
> covers; this pass applies their required/polish corrections and continues
> the same kind of structural cleanup, but does not substitute for the
> remaining 90-record sample.

Phase 1 completed research and architecture on 2026-09-06. Phase 2 produced a
candidate implementation on `dev`: structured source/review metadata, stored
word and sentence ruby, validation, a review queue, and retirement safeguards.
The first Phase 3 chunk found that sense reconciliation, provenance, reading
validation, and approval gating still needed work. This pass closes those
four gaps mechanically (see below) and applies the specific corrections the
Phase 3 chunk 1 report already decided. It changed no production database or
deployment. Phase 3's remaining 90-record sample and Phase 4 still need to
run; this is not a claim that the corpus is linguistically certified.

## Baseline and reproducibility

Audited repository baseline: `9b303c3`. The active vocabulary source is
`src/lib/study/data/jlpt-n5-n4-vocabulary.json`, SHA-256:
`72c8ece09094bfc20829f6427ad94c322bdbbb0cf119262b769ef3bb987457ba`.

| Baseline measurement                                       | Count |
| ---------------------------------------------------------- | ----: |
| N5 records                                                 |   742 |
| Additional N4 records                                      |   710 |
| Total distinct expression + reading pairs, NFKC-normalized | 1,452 |
| Exact duplicate pairs                                      |     0 |
| Placeholder examples (`exampleFallback`)                   |   149 |
| Repeated Japanese example groups                           |    82 |
| Repeated examples beyond the first occurrence              |    92 |
| Examples shorter than eight Unicode code points            |   656 |
| Readings containing kanji                                  |     1 |
| Readings containing whitespace/annotations                 |    12 |
| Records listing only one inclusion source                  |   163 |
| Records with structured word/sentence furigana             |     0 |

Short or shared examples are review flags, not proof of bad Japanese. Exact
pair uniqueness does not establish semantic uniqueness: spelling variants,
annotated readings, and combined entries conceal duplicates. The count of
semantically distinct, suitable teaching items is therefore not yet known.

## Existing architecture and origin

| File or area                                             | Role and finding                                                                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build-jlpt-vocabulary.py`                       | Imports OpenJLPT, Waller, and Open Anki; enriches from JMdict/example JSON; generates the active JSON.                                                          |
| `src/lib/study/jlpt-vocabulary.ts`                       | Converts JSON into curriculum drafts using a type assertion. Discards per-record source arrays and assigns commonality from source count.                       |
| `src/lib/study/content.ts`                               | Combines active vocabulary with other content. Legacy starter/expanded vocabulary supplies IDs where expression and reading match. Assigns curriculum sequence. |
| `src/lib/study/curriculum-expansion.ts`                  | Existing draft types/content; retain the integration rather than creating another vocabulary system.                                                            |
| `src/lib/study/types.ts`                                 | Shared Concept, progress, review, session, and goal types. No structured furigana.                                                                              |
| `src/db/schema.ts`, `src/db/seed-content.ts`             | Concept content uses JSONB; vocabulary table supplies related POS. Seed upserts content and preserves retired rows referenced by history.                       |
| `src/lib/study/planner.ts`, `state.ts`                   | Mode-specific due selection and new-card sequence; review actions require known active concept IDs.                                                             |
| `src/components/` review, collection, session components | Vocabulary and examples render as plain text; a separate reading does not provide furigana.                                                                     |
| Existing tests                                           | Cover content presence/counts and study behavior, but do not establish lexical sense, sentence quality, or ruby correctness.                                    |

Meanings, readings, and level assignments are principally imported, with
heuristic merging and POS inference. Most examples are imported; 149 are
locally generated metalinguistic templates. Repository evidence does not prove
whether upstream authors used machine generation. Do not label all bad
examples AI-generated without evidence.

Confirmed generator problems:

- OpenJLPT glosses and its first example take precedence without sense checks.
- Dictionary lookup can take the first homograph; spelling/reading and sense
  restrictions are not fully respected.
- Same-reading candidates can merge on any shared English gloss token.
- Fallback POS guesses from a final い or defaults to noun.
- Example selection lacks token, lemma, sense, register, or teaching-level checks.
- Sentence IDs, attribution, and per-field provenance are lost.
- Sequential generated IDs and legacy spelling-based ID mapping are unsafe
  identifiers for a future canonical-spelling rewrite.
- Source overlap is called commonality without frequency evidence; vocabulary
  sequence does not establish a useful frequency/prerequisite progression.

## Confirmed quality defects

IDs below have prefix `v-jlpt-`. All nine rows in this table were applied in
the Phase 2 completion pass (2026-09-06): each was replaced, retired, or
merged as described, and is covered by a regression test in
`tests/vocabulary-quality.test.ts` (the target-matching cases) or by direct
inspection of the active record. This is still one agent's editorial pass,
not externally certified translation; Phase 3 review of these IDs continues
to apply independently.

| ID        | Current problem                                                                               | Required correction                                                                                       |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `n4-0003` | あかちゃん, “infant”; わたち、あかちゃん。 / “I'm baby.”                                      | Prefer 赤ちゃん, あかちゃん, “baby; infant”; candidate 赤ちゃんが寝ています。 / “The baby is sleeping.”   |
| `n5-0082` | せっけん means “economy,” but its sentence concerns washing hands with soap.                  | Select the soap sense, e.g. natural 石けん; preserve the proper reading and review the existing sentence. |
| `n5-0017` | いす / chair paired with 私は先払いする。 / “I pay the money in advance.”                     | Replace the example; a substring inside 払いする does not demonstrate 椅子.                               |
| `n5-0043` | かける / call by phone paired with 出かけるの？                                               | Match the intended lexical sense, not a substring of 出かける.                                            |
| `n5-0090` | それ / that paired with 話がそれた。                                                          | Replace example: inflected 逸れる is a different word.                                                    |
| `n5-0055` | グラム / gram paired with a sentence about パングラム.                                        | Use a quantity/weight example.                                                                            |
| `n4-0690` | いただく has kanji 頂く in its reading field, noun POS, and overlaps another いただく record. | Resolve against `n4-0014`, correct spelling/reading/POS, explicitly retire any duplicate.                 |
| `n4-0070` | しかる has “a particular” but Godan verb POS; 叱る also exists separately.                    | Resolve the homograph/sense before teaching or merging it.                                                |
| `n4-0706` | 回る、回す combines different verbs and is labeled noun.                                      | Resolve individual lexemes against existing records; do not keep a combined noun card.                    |

Other review targets: annotated readings such as けっこん (する), alternate
number readings placed in one reading field, historical cassette-radio
variants, and hostile/register-inappropriate examples. No exhaustive manual
audit or random 100-record audit has occurred in Phase 1.

## Source decisions and licensing

The [JLPT FAQ](https://www.jlpt.jp/e/faq/) explains the absence of published
post-2010 vocabulary specifications. All item levels remain informed community
classifications; official proficiency descriptions provide alignment, not a
vocabulary membership list.

| Source researched                                                                                                                  | Decision and redistribution requirements                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [JMdict / EDRDG](https://www.edrdg.org/edrdg/licence.html), via [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) | Primary lexical authority for spellings, readings, POS, and selected senses. Derived data is CC BY-SA 4.0; retain attribution, licence, changes, and source revision. Use the full dictionary, not only common entries.                                                                   |
| [Waller/Tanos sharing terms](https://www.tanos.co.uk/jlpt/sharing/)                                                                | Community coverage baseline. Site grants CC BY for non-sale material but does not specify a version on that page. Existing attribution's claim of BY 4.0 is unsupported and must be corrected during implementation. Do not import paid material.                                         |
| [OpenJLPT notice](https://github.com/evanclan/OpenJLPT/blob/main/NOTICE.md)                                                        | CC BY-SA 4.0 derived material; useful crosswalk/candidate input. Its level lineage includes Waller, so agreement is not independent confirmation. Do not trust examples unreviewed.                                                                                                       |
| [Open Anki JLPT decks](https://github.com/jamsinclair/open-anki-jlpt-decks)                                                        | Repository MIT licence is insufficient to describe every upstream data right. Acknowledged deck ancestry also reaches Tanos. Preserve upstream attribution; do not count it as another independent classification vote.                                                                   |
| [Tatoeba terms](https://tatoeba.org/en/terms_of_use)                                                                               | Optional example candidates. Default text licence is CC BY 2.0 FR; preserve sentence-specific licence, Japanese and English IDs, attribution and links, including adaptations. Audio is separate. Where metadata cannot be recovered, replace the example instead of assuming compliance. |
| [Tanaka Corpus](https://www.edrdg.org/wiki/Tanaka_Corpus.html)                                                                     | Candidate examples only. Its own guidance cautions about naturalness and representativeness. Corpus membership does not establish beginner suitability.                                                                                                                                   |
| [JmdictFurigana](https://github.com/Doublevil/JmdictFurigana)                                                                      | Preferred exact expression + reading segmentation candidates. Output data follows JMdict's CC BY-SA licence; MIT applies to software. Lookup results still need validation and ambiguity review.                                                                                          |
| [fugashi](https://github.com/polm/fugashi), [UniDic-lite](https://github.com/polm/unidic-lite)                                     | Offline sentence-analysis candidates only. Preserve tool/dictionary licences separately; UniDic-lite documents BSD dictionary data and separate wrapper licensing. Tokenizer readings require review.                                                                                     |
| [JLPT Sensei N5](https://jlptsensei.com/jlpt-n5-vocabulary-list/) and [N4](https://jlptsensei.com/jlpt-n4-vocabulary-list/)        | Inspected as another coverage reference; no approved redistribution basis or proven independent list lineage established. Do not copy its definitions/examples into the repository.                                                                                                       |

No new source data was incorporated in Phase 1. Existing aggregate attribution
does not prove sentence-level attribution is sufficient. Phase 2 must repair
that gap before release. Keep code licensing separate from derived lexical data.

Feasibility research used local JMdict snapshots dated 2026-08-31 (schema
3.6.2), JmdictFurigana `2.3.1+2026-08-25`, and temporary fugashi 1.5.2 /
UniDic-lite 1.0.8. No project dependencies were installed. These are candidate
inputs, not a committed reproducible source manifest: Phase 2 must pin URLs,
revisions, hashes, licences, and download commands. Temporary files are not
durable dependencies.

## Proposed record architecture

Extend the existing JSON records and Concept content; retain expression,
reading, meaning, level, example, and exampleMeaning for compatibility. Add a
validated vocabulary metadata structure, with a source registry to avoid
repeating licence text in every card:

```ts
type RubySegment = { text: string; reading: string | null };

// Proposed fields; implement with strict runtime validation in Phase 2.
type VocabularyDetails = {
  expressionFurigana: RubySegment[];
  exampleFurigana: RubySegment[];
  exampleReading: string;
  secondaryMeanings: string[];
  itemKind: "word" | "expression" | "phrase";
  linkedKanji: string[];
  priority: { rank: number; reason: string };
  dictionary: { sourceId: string; entryId: string; senseIds: string[] };
  classification: {
    confidence: "high" | "medium" | "low";
    evidence: { sourceId: string; lineage: string; level: "N5" | "N4" }[];
    reason: string;
  };
  exampleSourceId: string; // Registry includes JA/EN attribution and licence.
  targetSpans: { start: number; end: number; surface: string; lemma: string }[];
  review: {
    lexical: "pending" | "reviewed";
    example: "pending" | "reviewed";
    furigana: "pending" | "reviewed";
    reviewer: string | null; // Distinguish automated, agent, and human review.
    notes: string[];
  };
};
```

Use documented Unicode code-point offsets for target spans. Store selected
sense identity with its pinned dictionary revision; sense indexes alone are
not stable across releases. Preserve source evidence for each changed field
and explicit overrides. Example provenance must distinguish imported,
adapted, and newly authored examples; record authorship/review honestly.

Validate word/readings against dictionary restrictions, common kana usage,
and the selected sense. Keep one useful primary meaning with limited
secondary meanings. Separate する annotations and alternate readings from
canonical kana. Do not force unusual kanji onto normally kana-written words.

Existing JSONB can hold these fields: update Concept typing, the schema's
content type, adapter and seed serialization. No SQL migration is expected
for content metadata. Do not change the SRS model or production database in
this work. If implementation finds a real schema need, document it explicitly.

## Furigana design

Build one reusable React component that renders semantic `ruby`/`rt` from
stored segments, never injected HTML or browser-side reading guesses.

| Case               | Stored segments (text → ruby reading)                  |
| ------------------ | ------------------------------------------------------ |
| Simple kanji       | 水 → みず                                              |
| Okurigana          | 食 → た; べる → null                                   |
| Compound           | 図書館 → としょかん                                    |
| Irregular compound | 今日 → きょう                                          |
| Sentence           | 赤 → あか; ちゃんが → null; 寝 → ね; ています。 → null |

The sentence example reconstructs 赤ちゃんが寝ています。 The word's canonical
reading remains separate from its ruby segments. Compound-level readings are
valid; do not distribute kana evenly across kanji. For mixed kana/kanji words,
leave confidently aligned okurigana outside ruby. Uncertain alignment enters
the review report rather than receiving guessed segmentation.

Use exact dictionary form + reading to retrieve word segments. Offline
sentence tokenization can propose inflected readings; prefer orthographic
kana over pronunciation fields, which can alter particles or long vowels.
Review contextual readings, names, counters, inflections, and homographs.
Persist corrected spans so future builds reproduce decisions.

Default to Always. Give the component an extensible display mode API; a
persisted Always / hover-or-tap / Hidden preference can follow later without
rewriting data. Future reveal must work on keyboard and touch as well as
hover. Keep annotations legible without clipping or changing Japanese text.
Use the component for vocabulary prompts, examples, collection entries,
completion summaries, and guest vocabulary surfaces where applicable. Test
mobile wrapping, dark mode, and assistive-technology behavior. Preserve quiz
answer behavior; furigana availability is intentional reading assistance.

## Curriculum, confidence, and progress compatibility

- Snapshot actual active concept IDs, including legacy ID remaps, before
  canonicalization. Keep an ID for a corrected spelling of the same lexeme;
  never regenerate IDs from list position.
- Maintain explicit aliases and retirement reasons. A duplicate can be retired,
  but an incorrect homograph must not transfer mastery to a different meaning.
  Preserve original review events and historical concepts.
- Referenced retired database rows already survive seeding. Add an explicit
  runtime historical lookup/retirement policy: pending sessions must skip
  retired unanswered items safely without inventing reviews or getting stuck.
  Test both local and cloud history. Do not reset progress to simplify cleanup.
- Preserve introduced / learning / mastered behavior and implicit unseen.
  Viewing a card must not award mastery. Corrected content alone awards none.
- Keep N5 and N4-only modes, their queues and sessions, plus cumulative progress
  totals. N4 proficiency requires both sets; do not silently change mode scope.
- Separate source confidence from curriculum priority. Shared lineage counts
  once; disagreement requires a reason and review flag. High confidence needs
  stronger independent evidence and editorial review, not three file names.
- Replace unsupported essential/common source-count labels with documented
  editorial priority. Dictionary commonness flags are supporting evidence,
  not a numerical frequency ranking.
- Order foundations around useful requests, core verbs, people, numbers/time,
  food, home, travel, and everyday activities, then broader N4 usage. Use
  reviewed prerequisites and lexical usefulness, not kana sorting or quotas.
  Due reviews retain precedence over new-item priority.

## Implementation and review gates

1. **Phase 1 — Astra, high: complete.** This audit and architecture handoff.
2. **Phase 2 — candidate implementation and gap closure: mechanically
   complete, not linguistically complete.** The first audit chunk found four
   systematic gaps; this pass closes each one in code, with a regression test
   or a report field per gap:
   - Canonical word-reading validation now compares the ruby's phonetic
     reconstruction to the stored reading (not just its display text), both
     at generation time and in `validateVocabularyDataset()`.
   - Target matching is token/lemma-aligned (fugashi + UniDic-lite) instead
     of a bare substring search, with multi-token and phrase/conjugation
     handling. Applied against the real corpus, this rejected roughly 140
     additional records beyond the ones already known, almost all the same
     bug class as 服/一服: a short word matching only inside an unrelated
     longer compound (猛犬/犬, 彼女/女, 似合う/合う, and similar).
   - Provenance now separates dictionary sense lookup (a real full-JMdict
     entry/sense match, scored by gloss overlap with the stored meaning),
     ruby sourcing (JmdictFurigana vs. generated), and example attribution
     (recovered Tatoeba sentence IDs from the full JMdict examples snapshot,
     not the common-only subset) into distinct fields. Each source's *own*
     raw list is now cross-checked for its actually observed level, instead
     of copying the record's assigned level into every source's evidence.
   - An explicit mechanical approval gate (`vocabulary.approval`) now decides
     what reaches `vocabularyCorpus`: not a placeholder example, a validated
     word reading, complete sentence tokenization, a clean reading format,
     and a resolved target span. Unapproved records stay in the full catalog
     for reporting and Phase 3/4 review; see `docs/data-quality-report.md`.
   - Nine records from the "Confirmed quality defects" table were corrected
     or retired, and the ten records from Phase 3 chunk 1 had their
     required/polish corrections applied. A handful of further structural
     defects the new validator surfaced along the way (annotated readings,
     a missing お, a combined 見る/観る field, three more duplicate pairs)
     were also fixed or retired.
   - Net result: catalog 734 N5 + 705 N4-only = 1439 candidates (13 retired
     total). **Approved/active 580 N5 + 584 N4-only = 1164** reach the app;
     the remaining candidates are quarantined pending correction, mostly for
     a placeholder example (130) or a target span the stricter matcher
     could not confirm (142) — see the "Why records are not approved" table
     in `docs/data-quality-report.md`. This is below the 700–800/level goal;
     that goal is explicitly conditional on quality ("only where quality and
     coverage justify inclusion"), and the shortfall is concrete, itemized
     work for Phase 3/4, not a hidden gap.
   - What this pass does **not** establish: line-by-line linguistic review of
     the ~1164 approved records. Mechanical approval means the example is
     real and the target word is validated to actually appear in it, not
     that a human or agent has read the sentence for naturalness, register,
     or JLPT-appropriateness. That is Phase 3's job.
   Do not push or seed production automatically.
3. **Phase 3 — Astra, high: in progress (20/100; resume sample position 11 per level).** Inspect a reproducible
   random 100 records (50 per level, fixed recorded seed), plus targeted
   high-risk cases. The first twenty are documented in
   `docs/phase3-vocabulary-audit.md`; eight subsequent chunks remain.
   Chunk 2 identifies active contextual counter-reading errors and an
   example-sense mismatch despite mechanical approval; prioritize these in Phase 4. Log
   individual judgments for meanings, natural Japanese/English, target sense,
   reading/ruby, grammar level, and provenance. Identify systematic correction
   rules. This review is not interchangeable with structural validation.
4. **Phase 4 — Terra, high: pending.** Apply corrections across affected groups,
   rerun checks, revisit failed samples and a fresh holdout. Report residual
   uncertainties; prepare a reviewable release before any production rollout.

In Phase 2, keep unresolved candidates outside the approved active deck.
Replace unsuitable examples rather than shipping placeholders. Report both
catalog size and approved active size; aim for 700–800 per level only where
quality and coverage justify inclusion. Existing 1,452 rows are not a quota.

Required automated checks and review report:

- Strict record validation, nonempty reading/meaning/example translation,
  valid N5/N4, unique IDs and normalized expression + reading pairs.
- Ruby text reconstructs the exact display text; readings reconstruct canonical
  kana after a documented kana normalization. Preserve punctuation and long
  vowels; don't normalize away errors. Kana-only tokens have no redundant ruby.
- Word and sentence ruby checks are separate; dictionary checks and linguistic
  review are separate from structural checks. Test okurigana and irregulars.
- Target spans match the sentence and a documented lemma/inflected form.
  Regression fixtures must reject the chair, telephone, pronoun and gram
  substring mistakes. Token presence alone cannot establish the right sense.
- Flag identical term/example, unusually short/complex examples, duplicate
  sentences, classification conflicts, and uncertain segments. Shared examples
  require a justified exception; length alone is not a naturalness verdict.
- Test stable IDs, retirement/resumption, preservation of historical reviews,
  unchanged mastery rules, mode isolation, cumulative counts, and new-card order.
- Generate `data-quality-report.md` with IDs, issue categories, review decisions,
  source conflicts, and reproducible sample IDs/seed. Count automated structural
  validity separately from linguistically reviewed furigana.
- Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build -- --webpack`, and `git diff --check` after implementation.
  Add rendered examples/screenshots for simple kanji, okurigana, compounds,
  and sentences. Check relevant vocabulary surfaces rather than only one card.

Final Phase 4 report must include exact N5/N4-only/combined counts, prior and
new sources/licences, examples replaced, terms added/removed, duplicates
retired, records flagged, reviewed versus uncertain furigana counts,
before/after examples, sample findings, and test/build results. Compute deltas
against the baseline identity registry; a spelling correction is not a new
term. Do not claim full linguistic verification from a passing script or a
100-record sample.

## Remaining research limits

Independent, openly reusable JLPT classification corroboration remains weaker
than the apparent three-list agreement suggests. No source researched here
justifies calling the entire inventory high-confidence. Sentence attribution
recovery and a full semantic duplicate audit also remain implementation work.
No records have yet been added, removed, replaced, or linguistically certified
by this phase; the Phase 3 sample and Phase 4 final measurements remain due.
