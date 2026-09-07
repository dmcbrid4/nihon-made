# 日本まで · Nihon Made

A calm, personal Japanese study app for a journey toward JLPT N4 and a trip to Japan in January 2027.

## Run locally

Node.js 24 LTS and npm are installed on this machine through Homebrew. From the repository:

```bash
cd /Users/danmcbride/fun-projects/nihon-made
npm install
npm run dev
```

Open **http://localhost:3000**. No environment variables, database, account, or AI API key are needed. Reviews and settings persist in this browser. Use the same hostname consistently: `localhost` and `127.0.0.1` have separate browser storage.

On another machine, install Node.js 24 LTS first (`brew install node@24` on macOS, or use `.nvmrc` with nvm). Use `npm ci` to install exactly the locked dependencies.

## The first slice

- **Today:** configurable Japan countdown, a daily session, and progress based on actual reviews.
- **Study:** eight initial steps covering vocabulary, kanji, grammar, and a short reading. Reveal an answer, then select Again / Hard / Good / Easy. Ratings are saved immediately; leaving or refreshing preserves your place.
- **Collection:** browse and search 19 original starter concepts (8 vocabulary, 5 kanji, 4 grammar, 2 readings), including readings, meanings, examples, approximate JLPT levels, and learning status.
- **Progress:** review counts, completed sessions, and concepts introduced or mastered. No fabricated proficiency scores.
- **Settings:** departure date, daily time budget, time zone, and JSON history export. January 15, 2027 is an editable initial date, not an assumed itinerary.
- Responsive mobile navigation, keyboard study shortcuts (Space, then 1–4), system appearance with a saved light/dark toggle, and accessible form controls.

The starter session is about **13 minutes**, within the default 25-minute budget. It is deliberately small. A daily session prioritizes due reviews, then adds a limited selection of unseen concepts. An unfinished session can be resumed on a later day; a completed session stays complete for its study date.

## Architecture

Next.js App Router, React, TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL. The repository started with only a README.

```text
src/app/                 Routes, global styles, metadata, API handler
src/components/          Dashboard, study cards, settings, collection, progress
src/lib/study/           Typed content, validation, planning, scheduling, state transitions
src/lib/storage/         Browser and HTTP repository adapters
src/lib/server/          Supabase session, owner checks, and request validation
src/db/                  Drizzle schema, PostgreSQL repository, idempotent seed
drizzle/                 Committed SQL migration and migration metadata
tests/                   Study logic, database, access, and browser tests
```

Both storage modes implement `StudyRepository`. The pure `applyAction` transition enforces session order, completion, and idempotency. Scheduling is isolated in `scheduler.ts`; replace it with a proper SRS without changing the UI or losing review events. All API input and saved browser state are validated with Zod. A database error is surfaced instead of silently switching to browser storage.

The database has **User, StudyGoal, StudyConcept, VocabularyItem, KanjiItem, GrammarPoint, UserConceptProgress, StudySession, StudySessionItem, and Review** tables. A shared concept identity gives each review a real foreign key. Typed detail tables leave room for kanji and grammar metadata. Content is bundled with the app and mirrored to the database by the seed command; database-only content editing is not part of V1.

The PostgreSQL adapter writes each rating, concept schedule, and session completion in one transaction. A per-user row lock serializes concurrent device writes; unique constraints and action IDs prevent duplicate reviews. Browser writes use the Web Locks API when available to coordinate tabs.

For future AI, introduce a typed exercise-generation service between the planner/content layer and the UI. Its inputs should be known concept IDs, level, and travel context; its output should be a validated exercise. OpenAI, Anthropic, and Gemini adapters can implement that contract without owning review history or scheduling. No provider SDK is installed yet.

## Supabase cloud mode

Cloud mode gives the private workspace a server-backed history and email-link sign-in. Only the configured owner email(s) can use it. Browser mode remains the default when these values are empty.

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. In Supabase, enable Email provider and turn off email/password sign-ups if this is a single-owner workspace. In **Authentication → URL Configuration**, set the Site URL to the production app and add its `/auth/callback` URL plus the local development callback URL. Magic links return through this callback to establish the secure session.
3. Set all four values in `.env.local`: `DATABASE_URL` (the Supabase pooler connection string when needed), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `OWNER_EMAIL`. Use `mcbride.danny@gmail.com` for the owner account. Keep `DATABASE_URL` server-only; do not prefix it with `NEXT_PUBLIC_`. To share this deployment with other real people (e.g. family), add their emails to `OWNER_EMAILS` (comma-separated) and create a Supabase Auth user for each of them (**Authentication → Users → Add user/Invite**) -- there is no self-serve sign-up. Every account gets its own separate goal, progress, and history; nothing is shared between them.
4. Verify the connection, apply the migration, and seed the starter content:

   ```bash
   npm run db:setup
   npm run dev
   ```

`npm run db:check` verifies the connection without exposing credentials. `npm run db:setup` runs that check, then migrations and the idempotent seed. The seed can be run again without erasing reviews. After schema changes, use `npm run db:generate`, review the generated migration, then run `npm run db:migrate` and `npm run db:seed` separately.

Browser history and database history are separate until you choose **Import browser history** in Settings. Import is allowed only when the cloud account has no study activity, and the browser copy is kept.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Database tests apply the committed SQL to PGlite (PostgreSQL compiled to WebAssembly) and exercise the real Drizzle repository, seeds, transactions, and reloads. This needs no external database server. Browser tests start their own server on port 3100 and cover desktop and iPhone-sized Chromium, persistence, all ratings, reading, settings, exports, dark mode, and storage failure handling. They explicitly use browser storage. A hosted Supabase connection and physical iPhone have not been tested.

For a production run:

```bash
npm run build
npm start
```

Vercel can import the repository as a Next.js project. Set all four cloud environment variables in the Vercel project, configure the Supabase Auth callback URL for the deployment, then run `npm run db:setup` locally with the target database URL before using the deployment. Migration commands are explicit and are not run during builds. Without cloud variables, each browser keeps its own history.

## Tae Kim course mode

A third study mode, alongside N5/N4: real sentences and words mined from a
personal Anki deck ("Japanese course based on Tae Kim's grammar guide
(anime)"), each sentence card carrying its own audio clip and screenshot
pulled from real anime/drama dialogue. It shares the same concept type,
scheduler, session planner, and progress tracking as N5/N4 -- it's a third
value of the study-mode enum, not a separate system. The audio/screenshots
are copyrighted anime footage, so that media is personal-use-only,
gitignored, and never committed or deployed; see
[docs/tae-kim-mode.md](docs/tae-kim-mode.md) for what's mined, how to
regenerate it, and exactly why it's exempt from the N5/N4 corpus's
open-licensing requirements.

## Deliberate V1 limits

- The curriculum is an imported N5 → N4 study corpus undergoing a quality audit, rather than an official JLPT word or kanji list. JLPT labels are approximate; coverage counts do not establish linguistic quality. See the [vocabulary quality plan](docs/vocabulary-quality-plan.md).
- Ratings are self-assessments. “Learned” requires three consecutive Good/Easy ratings and an interval of at least seven days. Again resets that run of successful recalls. This is a placeholder policy, not validated FSRS.
- Again makes a concept due after ten minutes, but each item appears once in this daily session; it returns in the next generated session. Other initial intervals are one, three, and seven days.
- Sessions are generated locally from deterministic rules; there is no LLM integration, speaking, or itinerary import yet. Listening audio exists only in the personal-use Tae Kim mode (below), not in the N5/N4 JLPT track.
- There is no service worker or offline PWA installation flow yet. Local persistence does not mean the app can load without a network connection. Mobile layout and Apple web-app metadata provide a starting point.
- V1 loads the personal study history as one state snapshot. Pagination and archived sessions can be added when the history grows.
- JSON export and one-way browser-history import into an empty cloud account are available.

## N4 study roadmap

Work through these in order. The model and reasoning level are recommendations for the implementation work, not requirements for using the app.

- [x] **Curriculum infrastructure and N5/N4 modes** — GPT-5.6 Terra, high reasoning. The candidate catalog currently contains 730 N5 and 679 N4-only vocabulary records (1,147 of them approved and active), alongside other study content. Modes keep queues, sessions, collections, and progress distinct. The content quality work below remains incomplete.
- [x] **Vocabulary quality Phase 1: research and architecture** — Astra, high reasoning. Audit of the existing importer, defects, sources, licensing, furigana strategy, and compatibility requirements is documented in the [implementation plan](docs/vocabulary-quality-plan.md). No bulk records changed.
- [x] **Vocabulary quality Phase 2: finish candidate implementation** — mechanically complete, not linguistically complete. Canonical word-reading validation, token/lemma target matching (replacing substring search), real dictionary/attribution provenance, and an explicit approval gate are implemented and regression-tested; see [the plan's Phase 2 entry](docs/vocabulary-quality-plan.md#implementation-and-review-gates) for what this does and does not establish. 1,147 of 1,409 catalog records are approved and active; the rest are quarantined with itemized reasons in [the data-quality report](docs/data-quality-report.md).
- [x] **Vocabulary quality Phase 3: fixed-sample audit** — Astra, high reasoning. **100 / 100 inspected** (50 per level). Findings include active reading errors, wrong dictionary/target senses, misleading glosses and missing example provenance. This completes the diagnostic sample, not full-corpus certification. [Audit](docs/phase3-vocabulary-audit.md); [fixed sample](docs/phase3-vocabulary-sample.json).
- [ ] **Vocabulary quality Phase 4: finish corrections** — Terra, high reasoning. Dictionary, headword, suffix, example and ruby repairs are partially implemented. The previous “all 33 repaired” claim missed prose findings: at least six original required records remain unchanged. Apply the new holdout corrections and reconcile all original decisions. Keep work on `dev`; no production rollout.
- [x] **Vocabulary quality Phase 4: fresh holdout review** — Astra, high reasoning. [20 new records inspected](docs/phase4-holdout-review.md): 7 required corrections, 8 polish, 5 linguistic accepts; all 20 still lack example attribution. This completes the review, not release approval.
- [ ] **Vocabulary quality Phase 4: correction recheck and UI verification** — Astra, high reasoning. Recheck repaired failures, review rendered ruby across vocabulary surfaces, rerun release checks, and report remaining full-corpus uncertainty before any production rollout.
- [ ] **Collection grouping quality** — Terra, high reasoning, alongside Phase 2. Grouping/filter UI exists, but source-count grouping is not frequency evidence. Replace that basis with documented editorial priority and keep classification confidence separate.
- [ ] **Spaced repetition scheduling** — GPT-5.6 Terra, high reasoning. Replace the starter review policy with due queues, review intervals, relearning, lapse handling, and scheduling based on recall quality.
- [ ] **Listening practice** — GPT-5.6 Luna, medium reasoning. Add short N4 audio, replay controls, transcripts, comprehension checks, and transcript reveal.
- [ ] **Grammar drills** — GPT-5.6 Terra, medium reasoning. Add sentence completion, ordering, transformation, and recognition exercises.
- [ ] **Graded reading** — GPT-5.6 Luna, medium reasoning. Add practical N4 passages with comprehension questions and separate reading and vocabulary results.
- [ ] **Monthly proficiency checks** — GPT-5.6 Terra, high reasoning. Measure vocabulary, kanji, grammar, reading, and listening with a repeatable diagnostic.
- [ ] **Speaking and writing practice** — GPT-5.6 Terra, high reasoning. Add production prompts, model answers, and optional feedback.
- [ ] **Study analytics and goals** — GPT-5.6 Luna, medium reasoning. Track time, consistency, weak areas, review health, and weekly targets.
- [ ] **Progress backup and export** — GPT-5.6 Luna, medium reasoning. Improve export, restore, and recovery workflows for the private account.

The curriculum uses the [official JLPT N5/N4 level summaries](https://www.jlpt.jp/e/about/levelsummary.html) as its level-alignment source. The JLPT describes N5 through basic written phrases and slow, familiar conversations, and N4 through familiar everyday texts and somewhat slowly spoken everyday conversations. It does not make this app’s vocabulary and kanji set an official JLPT list. See [ATTRIBUTION.md](ATTRIBUTION.md) for the openly licensed vocabulary sources and example-sentence attribution.

Curriculum infrastructure and mode separation are implemented. Vocabulary quality and furigana are the immediate priority; the review scheduler follows. Its current policy remains intentionally small and deterministic while the FSRS-compatible design is prepared.

Framework references: [Next.js App Router](https://nextjs.org/docs/app) and [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql).
