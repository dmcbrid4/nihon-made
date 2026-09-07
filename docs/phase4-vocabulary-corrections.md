# Phase 4 — vocabulary corrections and verification

Status: ready to implement on `dev`; no automatic merge, push, seed or production
change. Phase 3's fixed 100-record sample is complete (50 N5, 50 N4). Start here,
then consult the per-record decisions in [the audit](phase3-vocabulary-audit.md).
Use **Terra, high** for implementation; **Astra, high** for independent recheck
and a fresh holdout. Work in verified, focused commits and bounded batches.

## What completion means

The sample diagnosed failures; it did not certify all 1,439 records. Original
sampling seed/IDs/hash remain in [the manifest](phase3-vocabulary-sample.json).
Chunk 1 examined `03bce1f` and was subsequently corrected by Phase 2. Chunks 2–10
reviewed the later, unchanged catalog, SHA-256
`05bae31493ca3ebc0c8f08e54c5370ca43ebe8309dcc9e270b3c258d074db7ae`.
Keep that distinction when counting outstanding fixes.

Historical decisions across the sample: **41 required corrections, 30 polish,
29 linguistic accepts**. These are overall per-record decisions across inspected
versions, not a statistical error estimate, current outstanding-issue count, or
license approval. Some polish/accept rows also specify metadata corrections.

Current unchanged counts: **734 N5 + 705 N4-only = 1,439 candidates**;
**580 N5 + 584 N4-only = 1,164 mechanically active**; 275 quarantined.
The current fixed sample contains 81 active records, 19 quarantined; 84 imported
examples (six with recovered attribution), eight editorial, eight placeholders.
These current source counts differ from historical chunk-1 records before repair.
No vocabulary examples/terms were added, removed or changed during the resumed
Phase 3 audit. All proposed sentences still need implementation and independent
review. User progress and production database were not touched.

## Prioritized implementation checklist

- [ ] **Contain known active defects.** Add explicit per-record editorial holds
  for known incorrect readings/lexical matches until repaired. Inspect the audit's
  active required rows; don't equate structural `approval.approved` with linguistic
  review. Ensure generator regeneration preserves holds/review decisions.
- [ ] **Repair canonical noun/suru representation.** Thirty active candidates
  have visible noun heads but readings ending in する, placed inside word ruby.
  IDs are listed in chunk 3. Confirm each dictionary entry; retain IDs, remove
  the annotation from the noun reading or display する outside ruby for a chosen
  verb head. Fixtures: 拝見/はいけん (`1472270`), 案内/あんない (`1154860`).
  Check retire mappings/deduplication and existing progress before changing forms.
- [ ] **Choose among dictionary candidates and intended senses.** Replace the
  first-entry `by_form.setdefault` assumption in `scripts/build-vocabulary-quality.py`.
  Consider lexical form restrictions, commonness, original source IDs and intended
  usage. Concrete wrong-entry fixtures: この → `1582920`, not 九 `1578150`;
  humble うかがう → 伺う `1305700`, not 窺う `1172230`; interval ～おき →
  置き `2854117`, not 沖 `1182500`. Preserve actual numeral/peek/sea entries.
  Gloss overlap alone is insufficient; zero overlap can still be valid (以外,
  残念). Align example sense and learner-facing POS as well as provenance.
- [ ] **Correct contextual sentence readings.** Extend the existing structured
  ruby system using reviewed contextual fixtures/overrides, not generic kanji
  substitution. Known cases: 四つ/よっつ, 六つ/むっつ, 八つ/やっつ; native-count
  十/とお; 四つ葉/よつば; 火曜日/かようび; 金曜日/きんようび;
  いちばん星/いちばんぼし; おなか空いた/すいた. Sample and affected neighboring
  IDs appear in the audit. Add positive controls preserving 日本/にっぽん,
  明日/あす, 私/わたくし, irregular compounds and okurigana. Store numeral
  reading assistance where needed; `100さい` is not a complete kana transcription.
- [ ] **Validate target lexeme/sense, not just characters or token boundaries.**
  Negative fixtures include 服/一服, 緑/緑茶, 嫌/嫌い, 港/空港, 彼/彼女,
  体/大体, はず spanning は + ずぶぬれ, duration 一月/ひとつき versus January,
  and building ビル versus the personal name Bill. Allow documented inflections,
  aliases, productive suffixes (語 in 英語; stem + 終わる) and meaningful related
  compounds only through explicit review. Do not reject all compounds indiscriminately.
- [ ] **Apply semantic/pedagogical corrections across affected groups.** Follow
  the per-record proposals, preferring ordinary first meanings, clear natural
  English and neutral initial register. Fix misleading glosses such as 忙しい
  “irritated,” お金持ち “rich man,” 習慣 “manners,” and ビル “building or bill.”
  Fixtures for translation/sense: 誰か asks whether anyone is present; たくさん
  “enough” vs “many”; など dismissive vs listing; 打つ idiom vs physical hitting.
  Keep correct short sentences and legitimate colloquial expressions where taught
  with context. Inspect proposals again rather than mechanically accepting agent prose.
- [ ] **Resolve provenance, confidence and curriculum priority.** Recover actual
  sentence attribution or replace with documented original/licensed examples.
  A source ID does not prove Japanese/English alignment or pedagogical fit. Source
  aliases (e.g. 一番/いちばん, お陰/おかげ, 此の/この) must retain original row
  identity. Shared Waller lineage is not independent JLPT consensus. Flag uncertain
  placements instead of promoting confidence from list count. Prioritize common
  foundation and prerequisites; don't infer frequency from import order. Keep
  quarantined counts visible rather than padding to a target total.

Use the existing corpus, generator, overrides, review queue, validator and ruby
component; do not create a parallel vocabulary system. Source snapshots currently
live in `/private/tmp/nihon-made-corpus` and may disappear. Follow the existing
[quality plan](vocabulary-quality-plan.md) for regeneration/provenance; don't depend
on an undocumented temporary snapshot or silently replace it with newer source data.
Keep individual corrections reproducible in generator inputs/overrides, not only
in generated JSON. Preserve user IDs/progress and verify historical-session cases.

## Verification and release gates

- [ ] Run focused tests on real failure fixtures and changed behavior; check
  generated outputs and review queue. Test that holds exclude active content and
  cannot be cleared by successful text/reading reconstruction alone.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build -- --webpack`, and `git diff --check` after integration. Fix
  failures caused by the change; distinguish any pre-existing failures with evidence.
- [ ] Astra: revisit corrected failures and manually inspect a newly fixed,
  reproducible holdout from the candidate release (suggest 20 records, 10 per level).
  Store IDs/hash before review. Do not recycle the initial sample as the holdout.
  Expand targeted checks if new systematic defects appear. This is still agent
  review, not native-speaker certification.
- [ ] Verify actual UI ruby on word cards, example sentences, collection and
  guest vocabulary surfaces, including mobile layout and display preference behavior.
  Capture examples/screenshots for simple kanji, okurigana, compound and sentence.
  Phase 3 did not perform a new screenshot, accessibility or end-to-end review.
- [ ] Regenerate quality/provenance counts: candidate/active N5, N4-only, combined;
  examples replaced; terms added/removed/deduplicated; review flags; reading
  uncertainty. Distinguish mechanically aligned from independently reviewed ruby.
  Provide before/after examples and check licensing for material actually incorporated.
- [ ] Prepare a reviewable release with unresolved entries still quarantined.
  Database/schema changes only if necessary and justified; preflight any eventual
  seed against history-preservation behavior. Production merge/deployment requires
  the user's authorization. Completing Phase 4 is not permission to push `main`.

Phase 3 verification was documentation/sample integrity checking and targeted
read-only probes. No full app test/build was rerun during these audit-only passes;
prior passing checks do not certify current linguistic quality.
