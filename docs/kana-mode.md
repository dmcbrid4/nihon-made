# Kana mode

A fourth study track for complete beginners: the hiragana and katakana
syllabaries, taught from zero. Unlike N5/N4/Tae Kim, it is **not** something
you switch into via the sidebar's "Study mode" picker -- it's always
available at `/kana`, alongside whichever JLPT track is active, since kana
is foundational writing-system knowledge rather than a competing curriculum
track. An experienced learner can ignore it entirely, or mark it known in
one click and never see it again.

**Kana mode is not a daily SRS system.** There is no due date, no scheduled
queue, no row-unlocking gate. It's two customizable tools built on the same
selection UI: **Study**, free browsing with no scoring, and **Quiz**,
multiple-choice testing that's the *only* way a kana gets marked mastered.

## Curriculum

229 kana entries total: 105 hiragana (46 basic + 20 dakuten + 5 handakuten +
33 yōon + small っ) and 124 katakana (the same 105-shaped set, plus the
long-vowel mark ー and 18 common extended combinations for foreign sounds --
ファ, ティ, ウィ, ヴ, and similar). Obsolete kana (ゐ/ゑ) are excluded. See
`src/lib/study/data/kana.json` for the canonical data and
`src/lib/study/kana.ts` for the loader/schema.

Each script is split into 13-15 curriculum stages (あ-row, か-row, ...,
dakuten/handakuten, yōon, small っ; katakana adds a long-vowel-mark stage and
an extended-combinations stage last). These are pure **grouping/labels** --
used by the chart's section headings and the selector's "Select Basic /
Voiced / Combinations / Extended" shortcuts -- not a gate. A learner can
select and quiz any character in any order from day one.

## Chart / Study / Quiz

`/kana/[script]` (`kana-study.tsx`'s `KanaStudyPage`) has three tabs, all
sharing one gojūon grid layout (`kana-grid-sections.tsx`'s
`KanaGridSections`, a render-prop component parameterized by how a cell
looks/behaves, so the row/column/gap layout is defined exactly once):

- **Chart** (`kana-chart.tsx`) -- read-only reference: click a character for
  its reading, category, related-kana, confusion set, and mastery status,
  plus a one-off "mark known" button. Cells are colored by mastery status.
- **Study** (`KanaStudyBrowse` in `kana-study.tsx`) -- select characters
  (via `kana-selector.tsx`'s `KanaSelector`, the same chart re-rendered with
  checkbox-style cells and quick-select shortcuts), pick which side shows
  first, then flip through them one at a time with a plain reveal/next flow.
  Nothing here dispatches anything -- no scoring, no persistence, purely a
  practice aid.
- **Quiz** (`KanaQuizPractice` in `kana-study.tsx`) -- select characters the
  same way, choose a direction mode (recognition / recall / mixed, default
  mixed) and a length (short ~10 / medium ~20 / everything selected), then
  answer multiple-choice questions one at a time. This is the only path to
  real progress -- see below.

## Mastery: a 5-correct streak, Quiz-only

`recordKanaQuizAnswer(conceptId, correct, now, previous?)` in
`kana-progress.ts` is kana's entire mastery model, replacing the
vocabulary/kanji/grammar scheduler (`scheduler.ts`'s `scheduleReview`) for
kana entirely:

```
successStreak = correct ? (previous?.successStreak ?? 0) + 1 : 0
status = successStreak >= 5 ? "mastered" : previous ? "learning" : "introduced"
```

Every kana character is **two** `Concept`s -- one `direction: "recognition"`
(show か, ask "ka") and one `direction: "recall"` (show "ka", ask for か) --
each with its own streak. A character shows as "mastered" on the chart/
Progress page only once **both** directions reach it (`characterStatus` in
`kana-progress.ts`, unchanged); "unseen" only if neither has started.

A quiz question allows two attempts before revealing the answer
(`KanaQuizQuestion` in `kana-study.tsx`). **Any eventually-correct answer
extends the streak** -- a wrong guess followed by the right one on the same
question still counts as a success. Only fully missing a question (both
attempts wrong) resets the streak to 0. Study mode never calls
`recordKanaQuizAnswer` at all -- browsing has no effect on progress.

Each answer dispatches a new `kanaQuizAnswer` action (`{ conceptId, correct
}`) immediately, independent of any session -- unlike vocabulary's `review`
action, there's no `StudySession`/ordering to satisfy, since a quiz is a
freely (re)constructed selection, not a fixed daily queue. `applyAction`
(state.ts) writes straight to `state.progress`; `db/repository.ts`'s
`transact()` mirrors `markKanaKnown`'s upsert for the Postgres path.

## Multiple choice and confusion pairs

Distractors come from `distractorsFor` (now in `kana-quiz.ts`, formerly
`kana-session.ts`): confusion-set members first, then same-row, then
same-category, then anything else in the script. `KanaDetails.confusionSet`
is a plain, symmetric array on each entry (seeded with さ/き, ぬ/め, れ/わ,
あ/お, シ/ツ, ソ/ン, ク/ケ, ヌ/ス plus a few equally well-established extras
る/ろ, し/つ, ウ/ワ, テ/チ) -- not limited to a fixed list, since any future
pair can be added to `kana.json` without touching code. A learner who mixes
up さ/き keeps getting drilled on exactly that distinction rather than
random unrelated options.

`buildQuizQuestions(selectedIds, directionMode, length)` in `kana-quiz.ts`
is a pure function building one quiz's shuffled question list -- mixed asks
both directions per character, length cycles a small selection with fresh
reshuffles rather than running out of questions.

## Calibration / skipping

No adaptive placement-test quiz was built (there's no precedent for one
anywhere in this codebase, and building one is a meaningfully separate
feature). Instead, `/kana`'s "Already know kana?" section and each script's
chart detail panel offer a direct **"mark known"** shortcut, at three
granularities: one character, a whole script, or the entire kana track
("Skip Kana mode entirely"). This dispatches the `markKanaKnown` action,
which writes `ConceptProgress` rows straight to `status: "mastered"` --
bypassing the streak, since this is a declared fact, not an earned outcome.
It's fully reversible in the sense that those characters still show up in
the chart and can be quizzed normally any time; nothing is hidden or deleted.

## Progress page

`src/components/progress-kana.tsx` adds a "Kana foundations" section to
`/progress`, explicitly separate from the N5/N4 curriculum meters --
percent mastered per script, a bucket breakdown (basic / voiced /
combinations / extended) per script, and a milestone count. It deliberately
does **not** join `curriculumTypes`/`curriculumProgress`
(`src/lib/study/curriculum-progress.ts`): those are built around N5/N4
cohorts, and kana has no JLPT level. `src/lib/study/kana-progress.ts` is a
parallel module with the same cohort-counting shape, keyed by script and
curriculum bucket instead -- and it keeps working unchanged regardless of
*how* the underlying `ConceptProgress` rows were written (Quiz answers or
`markKanaKnown`), since it only reads `state.progress` generically.

## Data model

`Concept.kanaDetails?: KanaDetails` (`src/lib/study/types.ts`): `character`,
`script`, `row`/`column` (gojūon position), `category`
(basic/dakuten/handakuten/yoon/small/extended), `stage`, `curriculumOrder`
(pure labels/ordering, not a gate -- see above), `direction`, `relatedKana`
(the base character a dakuten/yōon form derives from, e.g. か for が), and
`confusionSet`. One canonical source (`src/lib/study/data/kana.json` +
`kana.ts`'s loader) feeds every UI surface (chart, selector, quiz, the home
summary, the Progress section) -- nothing duplicates kana data independently.

## Writing/tracing

Not built. Recognition and recall (the spec's stated priority) are
multiple-choice only; there's no drawing/stroke-order system anywhere in
this codebase to extend. The data model doesn't preclude adding one later
(a `strokeOrder` field could hang off `KanaDetails` the same way
`vocabulary?: VocabularyDetails` already hangs off `Concept`), but nothing
here assumes it's coming.

## Curriculum/session integration

Kana concepts share `Concept` and the `StudyRepository`/browser+Postgres
persistence layer with every other mode, but deliberately **not**
`planSession` (vocabulary's queue builder), `scheduleReview` (vocabulary's
scheduler), the generic `ReviewCard` UI, or `StudySession`/`state.sessions`
at all -- kana never creates a session; `kanaQuizAnswer` is a direct
progress write, same shape as `markKanaKnown`.

If you're using Supabase cloud mode, run migration
`drizzle/0005_add_kana_mode.sql` (`ALTER TYPE concept_type/jlpt_level ADD
VALUE 'kana'`) before opening Kana mode there -- kana concepts still need a
`type`/`level` in the corpus even though there's no more kana `StudySession`
mode value in practice. That migration was hand-written, not
`drizzle-kit generate`d as-is: this repo's `drizzle/meta/` snapshot history
had drifted out of sync with the actual hand-authored migrations 0001-0004
(a pre-existing gap, not introduced by this change), so a fresh `generate`
run would have re-emitted several already-applied earlier changes. The
snapshot itself was still regenerated and is now an accurate baseline for
future `generate` runs.
