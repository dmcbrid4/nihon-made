# Kana mode

A fourth study track for complete beginners: the hiragana and katakana
syllabaries, taught from zero. Unlike N5/N4/Tae Kim, it is **not** something
you switch into via the sidebar's "Study mode" picker -- it's always
available at `/kana`, alongside whichever JLPT track is active, since kana
is foundational writing-system knowledge rather than a competing curriculum
track. An experienced learner can ignore it entirely, or mark it known in
one click and never see it again.

## Curriculum

229 kana entries total: 105 hiragana (46 basic + 20 dakuten + 5 handakuten +
33 yōon + small っ) and 124 katakana (the same 105-shaped set, plus the
long-vowel mark ー and 18 common extended combinations for foreign sounds --
ファ, ティ, ウィ, ヴ, and similar). Obsolete kana (ゐ/ゑ) are excluded. See
`src/lib/study/data/kana.json` for the canonical data and
`src/lib/study/kana.ts` for the loader/schema.

Each script is split into 13-15 curriculum stages (あ-row, か-row, ...,
dakuten/handakuten, yōon, small っ; katakana adds a long-vowel-mark stage and
an extended-combinations stage last). A stage unlocks once ~70% of the
previous stage's characters have been introduced at least once -- "a
reasonable familiarity threshold," not full mastery, so a 3-5 character row
doesn't gate progress for long. New introductions are capped at 6 characters
per queue build (`NEW_CHARACTERS_PER_QUEUE` in `kana-session.ts`), well
below vocabulary's daily caps, per the product goal of small, fast,
frequently-reviewed batches.

## Recognition and recall as separate, trackable concepts

Every kana character becomes **two** `Concept`s -- one `direction:
"recognition"` (show the symbol, ask the sound) and one `direction:
"recall"` (show the sound, ask for the symbol) -- sharing everything else
(`kanaDetails.character`, row, category, curriculum order). Each gets its
own `ConceptProgress` row through the exact same `scheduleReview` scheduler
used everywhere else in the app, so both directions genuinely contribute to
mastery without any change to the progress schema. A character counts as
"mastered" only once **both** directions are (`characterStatus` in
`kana-progress.ts`); it's "unseen" only if neither has started, and never
regresses back to "unseen" once either has.

Quizzes are multiple-choice (4 options: the correct answer plus 3
distractors), not the flip-and-self-rate flashcard used for vocabulary --
build-your-own recall confidence isn't really testable with a self-graded
flip card, and the product spec explicitly asked for genuine recognition and
recall exercises. Distractors are prioritized toward real confusion risk:
same confusion-set members first (see below), then same row, then same
category (`distractorsFor` in `kana-session.ts`). Two wrong picks reveal the
answer; the result (first-try-correct / eventually-correct / never-correct)
maps onto the existing `again`/`hard`/`good` ratings, so it flows through
`scheduleReview` completely unchanged.

## Romaji scaffolding

A brand-new character (no `ConceptProgress` yet) shows a one-time
"introduction" panel -- character + romaji together, no quiz -- immediately
before its first recognition quiz. After that, romaji and kana are never
shown paired again: recognition quizzes show only the kana (asking for the
sound), recall quizzes show only the romaji (asking for the kana). That's
the whole scaffolding-reduction mechanism: full pairing once at
introduction, then genuine one-directional recall for every review after.

## Visual-confusion pairs

`KanaDetails.confusionSet` is a plain array of characters on each entry --
symmetric, and not limited to a fixed list (any future pair can be added to
`src/lib/study/data/kana.json` without touching code). Seeded with the
product spec's required pairs (さ/き, ぬ/め, れ/わ, あ/お, シ/ツ, ソ/ン,
ク/ケ, ヌ/ス) plus a few equally well-established extras (る/ろ, し/つ,
ウ/ワ, テ/チ). Confusion-set members are always prioritized as multiple-
choice distractors when present, so a learner who mixes up さ/き keeps
getting drilled on exactly that distinction rather than random unrelated
options.

## Calibration / skipping

No adaptive placement-test quiz was built (there's no precedent for one
anywhere in this codebase, and building one is a meaningfully separate
feature). Instead, `/kana`'s "Already know kana?" section and each script's
chart detail panel offer a direct **"mark known"** shortcut, at three
granularities: one character, a whole script, or the entire kana track
("Skip Kana mode entirely"). This dispatches a new `markKanaKnown` action
that writes `ConceptProgress` rows straight to `status: "mastered"` --
bypassing the normal review streak, since this is a declared fact, not an
earned outcome. It's fully reversible in the sense that those characters
still show up in the chart and can be reviewed normally any time; nothing is
hidden or deleted.

## Progress page

`src/components/progress-kana.tsx` adds a "Kana foundations" section to
`/progress`, explicitly separate from the N5/N4 curriculum meters --
percent mastered per script, a bucket breakdown (basic / voiced /
combinations / extended) per script, and a milestone count. It deliberately
does **not** join `curriculumTypes`/`curriculumProgress`
(`src/lib/study/curriculum-progress.ts`): those are built around N5/N4
cohorts, and kana has no JLPT level. `src/lib/study/kana-progress.ts` is a
parallel module with the same cohort-counting shape, keyed by script and
curriculum bucket instead.

## Data model

`Concept.kanaDetails?: KanaDetails` (`src/lib/study/types.ts`): `character`,
`script`, `row`/`column` (gojūon position), `category`
(basic/dakuten/handakuten/yoon/small/extended), `stage`, `curriculumOrder`,
`direction`, `relatedKana` (the base character a dakuten/yōon form derives
from, e.g. か for が), and `confusionSet`. One canonical source
(`src/lib/study/data/kana.json` + `kana.ts`'s loader) feeds every UI surface
(study cards, the chart, the home summary, the Progress section) --
nothing duplicates kana data independently.

## Writing/tracing

Not built. Recognition and recall (the spec's stated priority) are
multiple-choice only; there's no drawing/stroke-order system anywhere in
this codebase to extend. The data model doesn't preclude adding one later
(a `strokeOrder` field could hang off `KanaDetails` the same way
`vocabulary?: VocabularyDetails` already hangs off `Concept`), but nothing
here assumes it's coming.

## Curriculum/session integration

Kana concepts share `Concept`, `ConceptProgress`, `scheduleReview`, and the
`StudyRepository`/browser+Postgres persistence layer with every other mode
-- but **not** `planSession` (vocabulary's queue builder) or the generic
`ReviewCard` UI, since kana's pedagogy (multiple choice, row-gating,
confusion-aware distractors, dual directions) is different enough to
warrant its own queue builder (`kana-session.ts`'s `buildKanaQueue`) and
card component (`kana-study.tsx`'s `KanaCard`). A new `startKana` action
(alongside the existing `start`) creates a normal `StudySession` row with
`mode: "kana"`, after which review submission goes through the exact same
`"review"` action/`applyAction` branch as every other mode, unchanged.

If you're using Supabase cloud mode, run migration
`drizzle/0005_add_kana_mode.sql` (`ALTER TYPE concept_type/jlpt_level ADD
VALUE 'kana'`) before opening Kana mode there. That migration was
hand-written, not `drizzle-kit generate`d as-is: this repo's
`drizzle/meta/` snapshot history had drifted out of sync with the actual
hand-authored migrations 0001-0004 (a pre-existing gap, not introduced by
this change), so a fresh `generate` run would have re-emitted several
already-applied earlier changes. The snapshot itself was still
regenerated and is now an accurate baseline for future `generate` runs.
