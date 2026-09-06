# Spaced-repetition scheduler design

This note defines the next scheduler increment without changing the existing review-history contract.

## State transitions

- A card with no progress is `unseen`.
- Its first review creates `introduced` progress.
- A subsequent review keeps it in `learning` while the learner is building a successful streak.
- A card becomes `mastered` only after the scheduler's configured success threshold and a stable interval.
- `again` is a lapse: it resets the successful streak, returns the card to `learning`, and schedules a short relearning step.
- `hard` records a difficult recall and keeps the card in `learning`; `good` and `easy` advance the successful streak with progressively longer intervals.

The UI status names and the persisted `user_concept_progress` row remain stable. A future scheduler may add algorithm metadata to the content of that row, but it must not reinterpret historical ratings.

## Queue and interval policy

The planner should select due cards first, ordered by due time, then unseen cards ordered by curriculum sequence. It must filter both groups by the active N5 or N4 mode and keep the daily time budget. A card should appear at most once in a generated session.

The replacement scheduler should use a documented algorithm (preferably FSRS or a similarly tested model), with explicit minimum intervals, same-day relearning steps, review-date calculations in UTC, and a deterministic clock injected into tests. Rating mapping must be consistent across browser and PostgreSQL repositories.

## Lapses and compatibility

Lapses must preserve the review event, reset or reduce scheduling stability, and create a future due date rather than silently removing the card. Existing `introduced`, `learning`, and `mastered` rows must load unchanged. Existing sessions and reviews remain authoritative history; rescheduling only updates the current progress row.

## Migration and rollout

Implement the algorithm behind the existing `scheduleReview` interface first. Add migration columns only when the algorithm needs persisted fields, with defaults that preserve current rows. Run the pure state tests, PGlite repository tests, and browser tests before seeding or deploying. Roll out behind the current deterministic behavior until interval and lapse results are reviewed against representative histories.
