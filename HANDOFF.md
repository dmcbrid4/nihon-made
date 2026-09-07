# Session handoff — 日本まで / Nihon Made

**Current status (September 7):** the per-mode pace sliders and audited
vocabulary fixes were pushed and merged into `main` at `4c91ea5`. Migration
`0007_add_per_mode_new_cards.sql` was applied. The separately approved content
sync is complete: all 4,553 bundled concepts match Supabase. Referenced learner
history is preserved by the seed workflow. Do not rerun this as pending work.

The anti-AI design pass is committed locally on `dev` at `2250f83`, not pushed
or merged. See `docs/ui-design-review.md` for findings, verification, and restart
instructions. The local app is at http://127.0.0.1:3000 and the three logo choices
are at http://127.0.0.1:3000/design-preview. Browser-only preview storage is
separate from production history. Await the user's visual feedback before
publishing the design. The older sections below are historical; their claims
that pacing is deferred or the branches are synchronized are superseded here.

## Instructions for Claude

Continue from `dev` at `36a128e`. Do not switch to `main`, force-reset either
branch, or push/merge the design commits. Read `docs/ui-design-review.md` first.
The next user decision is visual feedback on the local preview: the three logo
treatments, typography, warmth, density, and phone layout.

If adjustments are requested, keep them on `dev`, make a focused commit, and
rerun relevant checks. Do not seed Supabase again: the approved sync is
complete and preserves learner history. Do not begin the vocabulary audit or a
spaced-repetition rewrite as part of this handoff. If the design is ready for
release, stop at a reviewable commit and ask the user before publishing it to
`main`.

## Kana mode, mastery-model fix, and session controls — 2026-09-07

A separate, unrelated-to-vocabulary session (commits `2b31463`..`107e3e7`
on `main`, 12:35–15:13). Built a new "Kana" study mode for absolute
beginners from scratch, iterated on it twice in production based on real
bugs, then added two independent study-session features. Everything
below is merged to `main` and pushed; `dev` and `main` are in sync at
`107e3e7`. One task was explicitly scoped but deliberately **not**
built — see "Deferred: per-mode new-cards-per-day" at the end, which is
a **future Claude task**, not started.

### 1. Kana mode, initial build (`2b31463`)

A fourth study track (`"kana"` in `StudyMode`, alongside `N5`/`N4`/
`tae-kim`) for learners who don't know hiragana/katakana yet, built
from a detailed spec: full gojūon coverage (105 hiragana + 124
katakana entries), staged curriculum grouping, recognition (kana→sound)
and recall (sound→kana) tracked as **two separate `Concept`s per
character** (`kanaConceptId(entryId, direction)` in
`src/lib/study/kana.ts`), romaji scaffolding, confusion-pair-aware
distractors (`KanaDetails.confusionSet` in `kana.json`), a kana chart
(`kana-chart.tsx`), a Kana home screen, Progress-page integration
(`progress-kana.tsx`), completion milestones, and a "mark this
known"/skip shortcut for learners who already know some kana
(`markKanaKnown` action). Data: `src/lib/study/data/kana.json` +
loader `kana.ts`. Migration `drizzle/0005_add_kana_mode.sql` adds
`'kana'` to both the `concept_type` and `jlpt_level` Postgres enums.

This first version modeled Kana Study as a daily SRS session — a
due-date queue (`buildKanaQueue`), started via a `startKana` action
into a real `StudySession`, mastery computed by the generic vocabulary
scheduler (3-good-streak + 7-day interval). That model got replaced
two commits later; see below.

### 2. Kana Quiz mode + Study/Quiz rework (`b09b41a`, `87050b1`)

User feedback after seeing the first version: Kana isn't a daily SRS
system — "just customizable quizzes and studies to learn the kana at
your own pace," with Study mode carrying **no** scoring at all and
Quiz mode as the only path to mastery, via an explicit rule: **a
streak of 5 correct answers in a row masters a kana** (any
eventually-correct answer, even after an earlier wrong guess on the
same question, extends the streak; only a fully missed question resets
it to 0).

This required removing the SRS-session machinery entirely, not just
adding a quiz on top:
- **Removed**: the `startKana` action, `buildKanaQueue`,
  `currentKanaSession`, `maxUnlockedStage` (row-gating) — kana never
  creates a `StudySession` at all now.
- **Added**: `recordKanaQuizAnswer(conceptId, correct, now, previous)`
  in `kana-progress.ts` (the whole mastery model:
  `successStreak = correct ? previous.successStreak + 1 : 0`,
  `mastered` at streak ≥ 5), a new direct/non-session-bound
  `kanaQuizAnswer` action (mirrors `markKanaKnown`'s pattern, not the
  ordered `review` action), and `src/lib/study/kana-quiz.ts`
  (`buildQuizQuestions(selectedIds, directionMode, length)` — pure,
  unit-tested question-list builder; `distractorsFor` moved here from
  the deleted `kana-session.ts`).
- **New UI**: `/kana/[script]` now has three tabs — **Chart**
  (read-only reference), **Study** (`KanaStudyBrowse`: pick characters
  from a chart-based multi-select, then flip through them with zero
  scoring/dispatch — purely presentational), **Quiz**
  (`KanaQuizPractice`: same selector, plus direction filter
  Mixed/Recognition-only/Recall-only and length Short~10/Medium~20/All,
  multiple-choice questions, live streak-building, results screen with
  "retry missed"). The gojūon grid layout itself was extracted into
  `kana-grid-sections.tsx` so the read-only Chart and the new
  `KanaSelector` (checkbox-style multi-select reusing the same grid)
  don't duplicate the row/column layout code.

### 3. Two post-deploy bugs from "I don't see Kana mode" (no code changes — production infra only)

After merging/pushing the above, the user reported not seeing Kana
mode at all. Diagnosis (via `WebFetch` against the live production URL
and its `/guest` sub-route, since Vercel CLI/`gh` were both
unauthenticated in this sandbox) showed the code *was* deployed and
working — the real issue was that Kana had been added as a **separate
standalone sidebar nav link**, not as a fourth option in the existing
N5/N4/Tae-Kim "STUDY MODE" picker where the user expected it. Fixed in
`8bae265`: removed the `/kana` nav-link entry from `app-shell.tsx`,
added `"kana"` as a 4th `<option>` in the STUDY MODE `<select>` (both
`app-shell.tsx` and `settings.tsx`), and made `Dashboard`/`/study`/
`/collection`/`ProgressOverview` all kana-aware — `Dashboard` renders
`<KanaHome>` directly instead of the vocabulary session flow when
`goal.studyMode === "kana"`; `/study` and `/collection` redirect to
`/kana` (`/kana?tab=chart` for collection) via a `useRouter().replace`
`useEffect`, since neither has a kana-shaped UI. Also added a proactive
defense-in-depth guard to `planner.ts`'s `planSession`
(`if (state.goal.studyMode === "kana") return [];`) — once `"kana"`
became a real, persistable `goal.studyMode` value, the generic
vocabulary scheduler would otherwise have started treating quizzed
kana concepts as "due" (since `recordKanaQuizAnswer` sets
`dueAt: now`) and leaking them into the generic `ReviewCard` UI, which
has no rendering support for `kanaDetails`-only concepts. This was
caught by code-path analysis, not a user report.

Once that shipped, the user then hit a real runtime error selecting
Kana mode in production. Root cause, found by querying the production
Postgres database directly (`node --env-file=.env.local --import tsx`
one-off scripts against `pg_enum`/`study_concepts`): **migration
`0005_add_kana_mode.sql` had never been run against production** — the
`jlpt_level`/`concept_type` enums only had `N5`/`N4`/`tae-kim`, so
writing `study_mode = 'kana'` to `study_goals` failed outright. Fixed
by running `npm run db:migrate` against production. A **second**,
related gap surfaced right after: `study_concepts` had **zero** rows
with a `kana-` prefixed id — the kana concepts had never been seeded,
so any progress write (quiz answers, mark-known) would fail a foreign-key
constraint against `user_concept_progress.concept_id`. Fixed by running
`npm run db:seed` against production (idempotent upsert via
`seedContent()` in `src/db/seed-content.ts` — safe to rerun, never
deletes anything referenced by real user history), which added exactly
458 kana concept rows (229 characters × 2 directions). The seed script
itself hung *after* finishing its actual work (data was already fully
written and verified before the hang was noticed) — killed the
process; no data loss, confirmed by direct row-count query afterward.

**Process note for future work**: this repo has **no CI and no
automatic migration/seed step on deploy** — `npm run db:migrate` and
`npm run db:seed` are both manual, local commands run against whatever
`DATABASE_URL` is in `.env.local`. Any schema change or newly-added
concept type needs both run against production by hand after merging,
or the exact two bugs above will recur. Worth automating at some point
(see "Known gaps" below).

### 4. Mastery-model fix: either direction masters a kana (`a10cdb7`)

User reported quizzing あ/い/う/え/お correctly many times (streak well
past 5) but the chart still showed them as "Introduced," not
"Mastered." Root cause: `characterStatus()` in `kana-progress.ts`
combined a character's two directions by requiring **both**
recognition and recall to independently reach `mastered` before the
character-level badge (chart cell color, "N/46 mastered" counters,
milestones) showed mastered — the user had only quizzed recognition,
so recall stayed untouched at "unseen," pinning the combined status at
"introduced" no matter how many correct recognition answers piled up.
This was a real design ambiguity (not obviously a "bug" — dual
recognition/recall tracking was part of the original spec), so it was
put to the user directly: keep both-required, or let either direction
alone be enough. Chose **either direction is enough** — matches the
literal original mastery rule ("a streak of five correct answers for a
kana results in it being mastered," not "...in one specific
direction"). `characterStatus` now takes `Math.max(rank(recognition),
rank(recall))` instead of requiring both at rank 3. Updated
`tests/kana.test.ts` and `docs/kana-mode.md` to match.

**Process slip, caught and corrected same session**: this commit was
made directly on `main` instead of `dev` by mistake. Caught
immediately after by checking `git branch --show-current`; fixed by
checking out `dev` and fast-forward-merging `main` into it
(`8bae265..a10cdb7` fast-forward, no divergent history), so both
branches stayed in sync with no lost work. No repeat of this mistake
in the rest of the session.

### 5. Mobile bug: tapped quiz answer stayed highlighted on the next card (`3480ea8`)

Reported as "the same box you tapped remains highlighted... until you
tap a new one," seen on mobile. Root cause: `.kana-option:hover` in
`src/styles/study.css` applied the same green "correct-looking"
highlight used for real feedback states. Touch devices don't clear
`:hover` on tap-release — the browser pins it to that screen
*position* and reapplies it to whatever new button renders there on
the next question (each `KanaQuizQuestion` fully remounts per
question, so it's a literal new DOM element getting the stale hover,
not a stale state bug in the React code). Fixed by scoping the hover
rule to `@media (hover: hover) and (pointer: fine)`, so it only ever
applies on real mouse/trackpad devices; the actual right/wrong
feedback styling (`.kana-option-correct`/`.kana-option-wrong`, driven
by React state, not `:hover`) was untouched and unaffected.

### 6. Discussed and declined: a kanji section inside Kana mode

User asked whether it'd be worth adding N5/N4 kanji browsing/quizzing
inside Kana mode, reusing its chart/selector/quiz UI. Recommended
against, for three reasons: (1) the app only has 87 curated kanji
today (42 N5 + 45 N4) against a true N5+N4 list of roughly 300, so
"all the kanji" is mostly an unstarted content-authoring project, not
a UI-reuse job; (2) kanji have multiple readings/meanings and no
natural 2D grid the way kana's 5×10 gojūon table does, so the chart/
selector UI wouldn't actually transfer; (3) kanji already live in the
N5/N4 SRS queue today — a second, unscheduled quiz tracker for the
same kanji would reproduce the exact "two systems disagree on
mastered" problem just fixed in §4, at a bigger scale. User agreed;
**no code changes**, purely a planning discussion.

### 7. Feature: new-cards-per-day slider (`c29b6dc`)

Daily new-card volume was a hardcoded, non-configurable split in
`planner.ts`: `{ vocabulary: 4, kanji: 2, grammar: 1, reading: 1,
listening: 1 }` (9/day total). Added `goal.newCardsPerDay` (integer,
5–25, default 9) and a range-slider control in Settings, next to the
existing daily-minutes/study-mode controls. `planner.ts`'s
`scaledNewCardLimits(newCardsPerDay)` scales each type proportionally
from that historical 9-card split (`vocabulary` keeps ~44% of the
total, `kanji` ~22%, `grammar`/`reading`/`listening` ~11% each,
floored at 1), so the **default value of 9 reproduces today's exact
behavior** — existing users see no change unless they move the
slider. This is a single value shared across N5/N4/Tae-Kim (same
architecture as `dailyMinutes` — one `goal` record, not per-mode); Kana
mode ignores it entirely since it has no daily queue. New Postgres
column: `study_goals.new_cards_per_day integer not null default 9`
(`drizzle/0006_add_new_cards_per_day.sql`), applied to production via
`npm run db:migrate` as part of this same work (existing rows got the
default automatically). New tests: `newCardsPerDay scales the per-type
new-card split proportionally` in `tests/study.test.ts`.

### 8. Feature: "Repeat today's lesson" (`107e3e7`)

User wanted a way to fully redo a finished session — explicitly "it
should just take you back in time to before you did the lesson," not
a no-stakes replay (an earlier design that was proposed and rejected:
re-showing today's cards without touching progress, mirroring Kana's
Study mode — the user wanted a real undo, not a practice-only replay).

Implementation is a genuine undo, not a soft reset: a new
`repeatSession` action (`{ sessionId }`) in `applyAction`
(`state.ts`) deletes the session's reviews and the session record
itself, then **rewinds every reviewed concept's progress to exactly
what it was beforehand** — not some default, the actual prior state —
by replaying that concept's *remaining* review history (every review
except the ones being undone) through `scheduleReview` in
chronological order. This works because `scheduleReview` is a pure
function of `(rating, reviewedAt, previousProgress)`, and
`state.reviews` is a complete, append-only event log — so replaying it
deterministically reconstructs the exact `ConceptProgress` that
existed at any point in a concept's history. New helper:
`progressAsOf(conceptId, reviews)` in `scheduler.ts`. A concept with
no earlier reviews (the common case — most of a session is new
material) goes back to having **no progress row at all**, i.e. fully
unseen, not a reset-to-zero placeholder.

`db/repository.ts`'s Postgres path mirrors this exactly: deletes
`reviews` rows for the session **before** deleting the `study_sessions`
row (`reviews.sessionId` has no `ON DELETE CASCADE`, unlike
`study_session_items`, which cascades automatically), then either
deletes or upserts each affected `user_concept_progress` row depending
on whether the concept still has any history left. No new migration —
this only reuses existing tables with new query patterns. Verified
against real Postgres (PGlite) in `tests/database.test.ts`,
specifically to exercise that delete-ordering requirement.

UI: a "Repeat today's lesson" button (repeat icon, `lucide-react`'s
`RotateCcw`) with a `window.confirm` guard, in two places — the
dashboard's today-card (next to "View today's session") and the
session-complete screen in `study-session.tsx` (next to "Back to
Today"). Both just dispatch the action; since both components read
session state fresh from `state` on every render, the UI naturally
falls back to the "start a session" screen once the dispatch resolves
— no manual navigation needed.

### Historical scope: per-mode new-cards-per-day — implemented later on `dev`

User asked whether the new-cards-per-day slider (§7) could be made
**independent per study mode** (a different value for N5 vs. N4 vs.
Tae Kim) instead of one shared value. This was scoped in conversation
but explicitly deferred at the time — the user was down to ~6% of a
usage window and chose not to risk a half-finished migration. The later update
above supersedes this historical state: `goal.newCardsPerDay` is now a per-mode
record in the working `dev` branch.

What it would take, for whoever picks this up:

- **Shape change**: `goal.newCardsPerDay` goes from a single
  `z.number()` to a per-mode record, e.g.
  `z.object({ N5: z.number()..., N4: ..., "tae-kim": ... })` in
  `types.ts`. Kana doesn't need an entry (it has no queue).
  `initialState()` and `planner.ts`'s call site need matching updates
  (index into the record by `state.goal.studyMode` instead of reading
  a bare number) — these two parts are trivial.
- **The real cost is the database layer.** Today
  `study_goals.new_cards_per_day` is one flat integer column, and
  `db/repository.ts`'s `.set(next.goal)` for the `"goal"` action works
  *only* because the `StudyGoal` JS shape currently matches the DB row
  shape field-for-field. Splitting into three columns (e.g.
  `new_cards_per_day_n5`, `_n4`, `_tae_kim`) breaks that 1:1 mapping —
  this repo has **no existing precedent** for a nested JS value backed
  by multiple flat DB columns, so this would be new plumbing, not a
  reuse of an existing pattern: a small flatten step when writing the
  goal (nested record → 3 columns) and an unflatten step when loading
  (3 columns → nested record, before `stateSchema.parse(...)` in
  `transact()`), plus the same flattening in `importState`.
- **Migration**: add the 2 new columns, backfill them from the
  existing single column for current users (e.g.
  `UPDATE study_goals SET new_cards_per_day_n4 = new_cards_per_day,
  new_cards_per_day_tae_kim = new_cards_per_day` after adding the
  columns with `DEFAULT 9`), then decide whether to drop the original
  column or repurpose it as the N5 value.
- **Settings UI**: three sliders instead of one (mechanical, low
  effort — same input, tripled with distinct state/ids/labels).
- **Tests**: `newCardsPerDay scales the per-type new-card split
  proportionally` (`study.test.ts`) and the Postgres round-trip test
  in `database.test.ts` both need updating for the new shape, and the
  new migration needs to be added to `tests/database.test.ts`'s
  hardcoded migration-file list (see the pattern already used for
  `0005`/`0006`).

Rough sizing given this session's pace: about 1.5–2× the effort the
single shared slider took (§7), with the DB mapping layer being the
only genuinely new architecture, not just more of an existing pattern.
**Do not start this without the user's explicit go-ahead** — it was
deferred on request, not because of any blocker in the design.

## Current vocabulary audit update — 2026-09-07

Phase 3's original 100-record audit is complete. Phase 4 has five local
implementation/documentation commits through `829f5e6` on `dev`, but corrections
are **not complete**. The fresh 20-record holdout found 7 required corrections,
8 polish decisions and 5 linguistic accepts; all 20 examples lack recovered
attribution. At least six required records from the original audit were missed
by the previous “all 33 repaired” summary. Start with
[the holdout findings and next correction batch](docs/phase4-holdout-review.md),
then [the release checklist](docs/phase4-vocabulary-corrections.md).
This audit changed documentation only; no production seed, push or merge.
The owner reports that the repository is now private. The branch-sync and
public-repository statements in the historical session account below describe
that earlier session, not the current state.

## Historical session account

Context dump for picking up this repo cold. Covers one long working
session: what changed, why, what's live, and what's still open. The
project's own `README.md` covers setup/architecture generically; this
file is specifically "what happened recently and what to know before
touching it."

Repo: `dmcbrid4/nihon-made` (currently **public** on GitHub — the owner
intends to flip it private at some point; be aware of that until it
happens, see "Known gaps" below). Two long-lived branches: `dev`
(working branch) and `main` (production, auto-deployed by Vercel on
push). Every change in this session went `dev` → verified → merged into
`main` with a plain `Merge dev into main` commit → pushed. Both
branches are currently in sync at commit `a9a40b6`.

## What this app is

A personal JLPT N5/N4 study app (flashcards, spaced repetition,
progress tracking) plus a separate personal-use "Tae Kim" study mode
mined from an anime-illustrated grammar-guide Anki deck. Next.js 16
(Turbopack) App Router, Drizzle ORM + Postgres (Supabase) for optional
cloud sync, browser localStorage as the zero-config default. Node's
built-in test runner (`node --test` via `tsx`) for unit tests,
Playwright for e2e.

**Important:** this Next.js version (16.3.4) is new enough that its
APIs/conventions may not match training-data assumptions. Before
writing Next-specific code, check `node_modules/next/dist/docs/`.

## What got done, in order

### 1. Vocabulary quality Phase 2
Fixed four systematic defect classes in the N5/N4 vocabulary pipeline
(`scripts/build-vocabulary-quality.py`): a validation gap, a
substring-vs-token target-matching bug, provenance tracking, and an
approval gate that now actually excludes unvetted records from the
live app. See `docs/vocabulary-quality-plan.md` and
`docs/phase3-vocabulary-audit.md`. **Phase 3 (manual audit of a 100-record
sample) is now complete — 100 of 100 reviewed (Codex continuation, 2026-09-07). See docs/phase4-vocabulary-corrections.md for next steps.**
At that point Phase 4 had not started; see the current update above for the
subsequent partial corrections and fresh holdout results.

### 2. Tae Kim course mode
A third study mode (`"tae-kim"` alongside `"N5"`/`"N4"` in
`StudyMode`) mined from a personal Anki deck of real anime/drama
dialogue. Mining script: `scripts/mine-tae-kim-deck.py` → outputs
`src/lib/study/data/tae-kim-deck.json` (committed, text only) plus
~113MB of audio/screenshots in `public/tae-kim/media/` (**committed to
git** — this was a deliberate call once the repo goes private; see
`docs/tae-kim-mode.md` for the full reasoning). Loader:
`src/lib/study/tae-kim.ts`. This content is personal-use only
(copyrighted anime clips) — that's the reason the repo needs to go
private eventually, not just a nice-to-have.

### 3. Progress page rebuild
The `/progress` page went from a thin stats page to the actual "how
close am I to N4" dashboard the product is supposed to answer. New
files, all under `src/components/progress-*.tsx` and
`src/lib/study/{curriculum-progress,progress-metrics}.ts`:

- **Countdown** (`progress-countdown.tsx`): target-date countdown,
  inline-editable, pace-status badge. Restored from a dashboard
  feature removed earlier in git history (`38581bc`), rebuilt smaller
  and moved to Progress per explicit direction (not the home page).
- **Curriculum meters** (`progress-curriculum.tsx`): N5/N4-only/combined
  mastery for vocabulary, kanji, and grammar, computed live from the
  real curriculum data (`curriculum-progress.ts` — generalizes what
  `vocabulary-progress.ts` used to do vocabulary-only).
- **Knowledge-state breakdown** (`progress-knowledge.tsx`): stacked bar
  of mastered/learning/introduced/unseen across the whole curriculum.
  **Note:** there is no calibration/"known baseline" feature in this
  app (checked `types.ts`/`state.ts` — only `introduced → learning →
  mastered` plus implicit `unseen` exist). Don't invent one; the UI
  copy is explicit about this.
- **History chart** (`progress-history-chart.tsx`): mastered
  vocabulary/kanji over time, reconstructed by *replaying* every past
  review through the existing `scheduleReview` scheduler
  (`progress-metrics.ts`'s `masteryHistory`) — no new history table,
  no fabricated data. Empty state is handled explicitly.
- **Kanji grid** (`progress-kanji-grid.tsx`): all N5+N4 kanji, colored
  by status, links into `/collection?type=kanji&q=<char>` (required
  adding query-param support to `CollectionView` — wrapped the page in
  `<Suspense>` per Next's `useSearchParams()` requirement).
- **Pacing** (`progress-pacing.tsx`): remaining items, required pace,
  7-day actual pace (only shown once 7 real days of history exist),
  status, estimated completion date. All in `progress-metrics.ts`'s
  `pacing()`.

No schema changes — everything derives from existing
`state.progress`/`state.reviews`. 11 new unit tests in
`tests/progress-metrics.test.ts`, 6 new Playwright checks in
`tests/e2e/progress.spec.ts`.

Also fixed a real CSS bug found via screenshot review: badge-color
classes (`.pace-ahead` etc.) weren't scoped to `.pace-badge`, so they
leaked onto the unrelated `.pace-status` text and painted a stray
gray background band.

### 4. Smaller polish
- **Autoplay**: review cards with audio (Tae Kim mode) autoplay on
  mount, since `ReviewCard` already remounts per card
  (`key={concept.id}`). Swallows the browser's autoplay-block on the
  very first card of a session.
- **Session history, expandable**: the Progress page's "Recent
  practice" list now expands per-session to show every card + rating,
  reusing markup already built for the same-day completion screen.
- **Guest mode rating step**: `/guest/study` previously had no
  again/hard/good/easy step, unlike the real flow. Added it (reusing
  `intervalFor` and the real `rating-*` CSS), plus a completion screen
  listing each card's rating.
- **Guest flashcard font size**: was a fixed 76px regardless of
  viewport, wrapping mid-word on mobile. Switched to the same
  `clamp()` pattern the real review card already used.

### 5. Multi-user auth
Originally the whole app was hard-gated to one `OWNER_EMAIL`. The
database schema was already fully per-user (`userId` on every table,
auto-provisioned on first load in `PostgresRepository`), so this was
purely an authorization-layer change, in two steps:

**Step one — static allowlist.** Added `OWNER_EMAILS` (comma-separated,
optional, alongside `OWNER_EMAIL`) in `src/lib/server/config.ts`.
Still required each new person to already have a Supabase Auth user
created for them by hand (Supabase dashboard).

**Step two — self-serve invite password.** Added `INVITE_PASSWORD`
(optional env var). `/sign-in` has a third "New here" tab: any email +
the correct invite password creates a real account immediately
(`shouldCreateUser: true` on the OTP call). This required rethinking
`isOwner()`: it no longer checks a specific email list at all — it
just verifies the Supabase session is real/confirmed/non-anonymous.
The actual gate moved entirely to account-*creation* time
(`canRequestAccess()`: pre-approved email OR correct invite password).
Password-based sign-in (`/auth/password`) deliberately stays
restricted to the static email list, since invite-password accounts
only ever get magic-link access.

The invite password value itself lives in `.env.local` (gitignored,
never committed) and in Vercel's project env vars — **not** repeated
in this file. If you need it, ask the project owner or check those two
places.

## Current deployment state

Everything above is merged to `main` and pushed (`a9a40b6`) — Vercel
should have already redeployed from it. `dev` and `main` are in sync,
nothing outstanding on either branch except the routine
`next-env.d.ts` churn (auto-regenerated by `next dev`/`next build`;
harmless, gets re-added by whichever command ran most recently, see
the note at the top of `AGENTS.md`).

## Known gaps / good next steps

- **Repo is still public.** Tae Kim mode's audio/screenshots (real
  copyrighted anime clips) are committed. This was accepted
  deliberately, on the explicit condition that the repo gets made
  private "at some point." It has not happened yet as of this commit.
  Flag this if it's been a while.
- **~289 stale `study_concepts` DB rows** from an earlier
  intermittent-network seed failure (unrelated to any of the work
  above) never got cleaned up by the retire-cleanup step. Low risk —
  the retire logic explicitly protects anything referenced by real
  user history — but it's a loose end. Diagnosed extensively earlier
  in this session; root cause was flaky connectivity to Supabase's
  pooler, not a code bug.
- **Vocabulary Phase 3 fixed sample is complete**: 100/100 reviewed.
  Phase 4 applies corrections and reruns checks; start with
  `docs/phase4-vocabulary-corrections.md`. The dataset was unchanged at the end
  of that audit; subsequent partial Phase 4 corrections are described above.
- **No calibration/placement flow.** An early product idea (fast
  Know-it/Kinda-know-it/Don't-know-it triage to seed a "known
  baseline" before real study starts) was discussed but never built.
  If it gets built later, the Progress page's knowledge-state
  breakdown should be revisited — it currently explicitly says there's
  no such state.
- **Tae Kim mode pacing**: currently capped at the same 4
  new-vocab/1-new-listening-per-day rate as N5/N4, which would take
  1.5+ years to get through the full mined deck. Never explicitly
  addressed — worth a quick decision.
- **A handful of pre-existing e2e assertions are stale**
  (`tests/e2e/study.spec.ts`): an old dashboard heading string, a kanji
  count that's since grown, a renamed button label. Found while
  verifying the Progress page work; explicitly left alone as
  out-of-scope for that task. `npx playwright test` will show these
  failing — they predate this session's work.
- **No abuse protection on the invite-password endpoint**
  (`/auth/code`) beyond Supabase's own OTP-resend rate limit. Fine for
  a small shared-password, family-scale use case (discussed
  explicitly); would need real rate-limiting before this could be
  trusted at any larger scale.

## Testing conventions, if you're adding more

## Claude handoff: bounded linguistic holdout review

While waiting for the OpenAI usage reset, Claude may provide an independent
linguistic review. This is a review-only task. Do not ask Claude to bulk-edit
the JSON, regenerate the corpus, change the schema, commit, push, merge, seed
Supabase, or deploy.

Give Claude these files first:

- `docs/phase4-holdout-review.md` — current findings and correction priorities;
- `docs/phase4-holdout-sample.json` — the 20-record sample already reviewed;
- `src/lib/study/data/jlpt-n5-n4-vocabulary.json` — current records;
- `docs/phase3-vocabulary-audit.md` and `docs/phase3-vocabulary-sample.json` —
  the original audit and its exclusion list.

Ask Claude to review a **new, reproducible sample of 30–40 active records**,
roughly half N5 and half N4, excluding both existing samples. Save the selected
IDs and dataset hash before reading details. Inspect each record's Japanese,
kana, primary meaning, POS, example naturalness, translation, word ruby,
sentence ruby, target alignment, dictionary/source evidence, and register.
Pay special attention to the known patterns: contextual readings, compounds
that contain but do not teach a target, wrong POS, wrong dictionary sense,
placeholder or unattributed examples, and kana-only words forced into kanji.

Require this compact output, with one row per record:

`record ID | level | severity (required/polish/accept) | issue | proposed correction | confidence`

Also request a short summary of systematic patterns, records needing native
speaker review, and any disagreement with the existing holdout report. Claude
may suggest original example sentences, but should label them as proposals and
not imply that dictionary or textbook examples are redistributable. No sentence
should be copied from a paid resource. Treat JLPT levels as provisional because
there is no current official public vocabulary list.

When the report is returned, bring it back here for comparison. We will resolve
disagreements, apply only justified changes through the existing generator and
overrides, add focused tests, and commit one bounded correction batch on `dev`.
Do not treat Claude's review as release approval; the repository still needs
provenance resolution, rendered UI furigana checks, and the final test/build
gates described in `docs/phase4-holdout-review.md`.

- `npm test` — Node's built-in test runner via `tsx`, fast, no browser.
  Put new pure-logic tests here (see `tests/progress-metrics.test.ts`
  or `tests/config.test.ts` for the current style: real curriculum
  data via `concepts` import rather than hand-hardcoded IDs where
  possible, since IDs can get remapped by the vocabulary-corpus
  pipeline).
- `npx playwright test` — real browser, desktop + mobile projects.
  **Before running locally**, make sure no stale dev server is
  holding `.next/dev/lock` (Next 16 allows only one dev server per
  project dir; `rm -f .next/dev/lock` if a run times out waiting for
  the webServer). `playwright.config.ts`'s `webServer.env` clears
  cloud-mode env vars so tests run in fast browser-storage mode by
  default.
- Always run `npx eslint .`, `npx tsc --noEmit -p tsconfig.json`, and
  `npm run build` before considering a change done — this repo has no
  CI configured, so these are the only checks that exist.

## Claude's bounded linguistic holdout review — results (2026-09-07)

Completed the review-only task requested above. **No JSON, generator,
schema, database, or app changes were made; nothing was committed,
pushed, merged, seeded, or deployed.**

**Sample:** 36 active records (18 N5, 18 N4), selected the same way as
the existing manifests — sort SHA-256(seed + NUL + record ID) ascending
per level, take the first N — with a fresh seed
`nihon-made-claude-holdout-2026-09-07`, excluding all 120 IDs already
used by the Phase 3 (100) and Phase 4 holdout (20) samples. Manifest
saved to the session scratchpad before reading any record details (not
committed to the repo, per the review-only instruction). Baseline
commit `75f3c96b837adedfc88c4b68d5b0c6a94e08c1e8`; dataset SHA-256
`bc0a3ba60f3a8ffd0cae051d9c8e3aabfe3b24ea3d5ccba79c3b6717c9ea7971` —
identical to Phase 4's recorded hash, confirming the corpus hasn't
changed since that baseline.

**Method:** cross-checked every stored `provenance.dictionary.senseIds`
pointer against the local JMdict snapshot
(`/private/tmp/nihon-made-corpus/jmdict/jmdict-examples-eng-3.6.2.json`,
full 218,672-entry release) — reading each entry's actual sense list
and comparing it to what the stored example sentence demonstrates.

**Result: 10 required, 11 polish, 15 accept**, out of 36.

### Required corrections

| ID / word | Issue | Proposed correction |
| --- | --- | --- |
| `v-jlpt-n5-0547` 二十歳 | Word ruby correctly teaches はたち, but the example's sentence ruby renders it as にじゅうさい — JMdict's own kana list for this entry is `[はたち, にじゅっさい, にじっさい]`; にじゅうさい matches neither the taught reading nor the dictionary's listed alternate. | Original proposal: 娘は今日、二十歳になりました。/ "My daughter turned 20 today." (demonstrates はたち directly) |
| `v-jlpt-n5-0280` 近く | Stored sense `1242160:0` ("near; vicinity"), but the example ７時近くだ demonstrates sense `1242160:1` (n-suf, "nearly, close to"). | Correct the sense pointer to `:1`, or replace with: 駅の近くに住んでいます。/ "I live near the station." |
| `v-jlpt-n5-0104` つける | Stored sense `1495770:12` ("to turn on") correctly matches the taught meaning, but the example 格好つけるな demonstrates the unrelated idiom 格好をつける ("to put on airs"), not sense 12. | Original proposal: 部屋の電気をつけてください。/ "Please turn on the light in the room." |
| `v-jlpt-n5-0215` 横 | Stored sense `1180570:1` ("width, breadth"); example 横に座って demonstrates sense `1180570:3` ("beside, next to") instead. | Example is fine — just correct the sense pointer from `:1` to `:3`. |
| `v-jlpt-n5-0646` 頼む | Stored sense `1548370:0` ("to ask"); example 後で頼むよ demonstrates sense `1548370:1` ("to order/reserve"). | Example is fine — expand meaning to "to ask; to order" and add sense pointer `:1`. |
| `v-jlpt-n4-0516` 動く | Stored sense `1451210:0` ("to move, stir"); example 心が動くね demonstrates sense `1451210:3` ("to be touched/influenced", idiomatic). | Replace with 電車が動き出した。/ "The train started moving." — or keep the idiom and retag sense `:3`. |
| `v-jlpt-n4-0286` 向かう | Stacked issues: stored sense `1604800:0` ("to face") vs. example's actual sense `1604800:1` ("to head towards"); translation invents "rides" (not in the Japanese); 悪魔の宴 ("devil's banquet") is unusually dramatic/obscure for N4. | Original proposal: 彼女は駅に向かっている。/ "She is heading to the station." |
| `v-jlpt-n4-0046` くださる | Stored sense `1184280:0` ("to give"); example 最寄駅で降ろしてくださる？ demonstrates sense `1184280:1` (〜てくださる, "to kindly do for one"). | Example is fine — expand meaning to include "to kindly do (something) for one" and add sense pointer `:1`. |
| `v-jlpt-n4-0390` 場合 | Translation number mismatch: それは極端な場合だ is singular; exampleMeaning reads "They are the extreme cases" (plural). | English fix only: "That's an extreme case." |
| `v-jlpt-n4-0015` いっぱい | POS tagged "suru verb" — checked all 8 senses of entry `1165670` directly; none carry a `vs` tag. いっぱい has no suru-verb usage. Sense selection itself (`:2`, "full") is correct. | Change POS to "na-adjective" or "adverb"; no example change needed. |

### Polish

`v-jlpt-n5-0625` 木 (blunt な-prohibition register; loose translation), `v-jlpt-n5-0511` 朝 (POS omits "noun" — JMdict tags `n, adv` together, example itself proves noun use), `v-jlpt-n5-0157` ポスト (gloss "post" ambiguous vs. the far more common "mailbox" sense; internally consistent otherwise), `v-jlpt-n4-0018` うそ (sentence ruby 言う→ゆう is a dictionary-attested but non-standard casual reading vs. textbook いう; POS omits "noun"), `v-jlpt-n4-0268` 建てる (壁を建てる is attested but an unusual collocation for routine construction — recommend native check), `v-jlpt-n4-0285` 公務員 (私→わたくし is unexpectedly formal for a plain です sentence), `v-jlpt-n4-0518` 道具 (blunt な-prohibition register), `v-jlpt-n4-0282` 交通 (POS "suru verb" has real but marginal dictionary support — `vs` is tagged on the sense, but 交通する is essentially unused in modern speech for "traffic"; example shows zero verbal use), `v-jlpt-n4-0469` 男性 (POS omits "noun" — same class as 朝), `v-jlpt-n4-0355` 趣味 (example only shows the word inside the compound 多趣味, not standalone), `v-jlpt-n4-0021` うん (translation "Fine" loosely renders うん "yeah").

### Accept (no correction identified)

`v-jlpt-n5-0039` お弁当, `v-jlpt-n5-0572` 八日, `v-jlpt-n5-0632` 薬, `v-jlpt-n5-0030` お金, `v-jlpt-n5-0379` 時間, `v-jlpt-n5-0383` 自転車, `v-jlpt-n5-0392` 車, `v-jlpt-n5-0634` 有名, `v-jlpt-n5-0318` 交差点, `v-jlpt-n5-0370` 子供, `v-jlpt-n4-0067` サンドイッチ, `v-jlpt-n4-0115` なるほど, `v-jlpt-n4-0276` 見物, `v-jlpt-n4-0580` 法律, `v-jlpt-n4-0529` 背中 — all checked directly against the full JMdict entry; stored sense matches what the example demonstrates.

### Systematic pattern

**7 of the 10 required findings share one root cause** (近く, つける,
横, 頼む, 動く, 向かう, くださる): `provenance.dictionary.senseIds`
appears to be selected by gloss-overlap against the stored `meaning`
text, but nothing cross-checks that the *example sentence* actually
demonstrates that specific sense. Word, reading, and target span are
all correct in every one of these — the mechanical approval gate has
nothing to catch, since it validates spans/readings, not
sense-to-example alignment. This is the same defect class Phase 4
found in isolated records (受ける, 浅い), but it showed up roughly
twice as often here (7/36 ≈ 19% vs. 2/20 = 10% there) — worth treating
as a systemic gap in the sense-selection step, not a couple of
one-offs. Suggested regression check: for single-sense records, verify
the stored sense's gloss is actually reflected in the example's
context, not just in the headword's `meaning` field.

Secondary (Polish-tier, already-known pattern): temporal/relational
nouns tagged with a single non-noun POS (朝, うそ, 男性, 交通's
suru-tag) when JMdict lists `noun` alongside that POS on the same
sense — same class as 夕方/毎日/急行 from Phase 4.

### Worth a native-speaker pass

二十歳 (にじゅっさい vs. はたち naturalness in casual dialogue),
建てる (壁を建てる naturalness outside a border-wall context), うそ
(ゆう vs. いう for 言う without a register note), 交通 (how rare
交通する actually is in contemporary speech).

### Relationship to existing reports

Zero ID overlap with the Phase 3 (100) or Phase 4 holdout (20)
samples, so nothing here directly contradicts them. It corroborates
Phase 4's core finding rather than conflicting with it: the
"dictionary sense stored ≠ sense the example demonstrates" defect
class Phase 4 flagged in isolated records turns up at a higher rate
across this independent sample — evidence it's systemic, not a couple
of one-offs.

All proposed replacement sentences above are original editorial
candidates, not imported quotations, and are not pre-cleared for
provenance/licensing. This is agent review, not release approval or
native-speaker certification.
