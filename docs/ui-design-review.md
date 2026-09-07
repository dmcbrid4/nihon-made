# UI design review — September 7, 2026

## Release boundary

The earlier vocabulary corrections and per-mode pace sliders are pushed to
`main` and `dev` at `4c91ea5`. Supabase migration `0007` was applied. After
explicit approval, the content seed was synced; a read-only comparison found
all 4,553 bundled concept records present and matching their stored fields.
The seed preserves referenced learner history.

The design work starts at `2250f83` on local `dev`. It has **not** been pushed
or merged. Wait for visual feedback before publishing these changes.

## Findings and changes

| Finding | Change |
| --- | --- |
| Motivational copy in navigation, Settings, and completion screens | Plain page names, actions, and factual saved-progress messages |
| Repeated mode labels, fake avatar, and decorative sidebar/footer content | Simpler navigation and a labeled mode selector |
| Blue graph-paper background and many rounded, colored tiles | Warm off-white paper, dark ink, restrained red/green, quieter borders |
| Small text inside oversized cards | Larger text and a session summary alongside the main card |
| Listening absent from the planned-session breakdown | Listening now appears whenever listening cards are scheduled |
| Material count included every course | Reference count follows the active course |
| Progress layouts reserved unused columns | Four skill columns, with vocabulary filling its available width |
| Crowded mobile mode selector and narrow Settings overflow | A separate header row for the selector and shrinkable Settings panels |

The existing scheduler, mastery rules, curriculum, APIs, and storage remain in
place. A single review still does not mark a vocabulary item mastered.

## Local preview

Start with browser-only storage so experimenting does not affect cloud history:

```sh
env DATABASE_URL= SUPABASE_URL= SUPABASE_PUBLISHABLE_KEY= OWNER_EMAIL= APP_PASSWORD= npm run dev -- --port 3000
```

- App: http://127.0.0.1:3000
- Logo comparison: http://127.0.0.1:3000/design-preview

Three SVG treatments share the same wordmark: **Bookplate** (default),
**Margin**, and **Index**. Selecting one updates the sidebar, guest header, and
sign-in mark in this browser. The favicon currently uses Bookplate. Selection
is stored separately from study history. The comparison route calls
`notFound()` outside development and its sidebar link is development-only.

## Verification

- `npm test`: 66 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build -- --webpack`: passed.
- `npx playwright test tests/e2e/design-review.spec.ts`: 6 passed across
  desktop and mobile. Covers session resume, mastery remaining zero after one
  rating, independent pace settings, mode navigation, logo persistence, guest
  branding, and theme selection.
- `git diff --check`: passed.
- Inspected desktop/mobile Today, dark Today, all three logos, and expanded
  mobile Collection screenshots. Checked Today, Collection, Settings,
  Progress, Guest, and Logo options at 320px and 768px; fixed the one Settings
  overflow and verified no remaining horizontal overflow there. No browser
  page errors were observed in that sweep.

The older `tests/e2e/study.spec.ts` contains pre-existing obsolete copy and
fixed-deck assumptions. It was not counted as passing or rewritten during
this visual pass. These focused tests do not constitute a new production
authentication or full curriculum audit.

## Next feedback

Choose a logo and review the typography, warmth, density, and phone layout.
Continue adjustments on `dev`; do not publish until the design is accepted.

## Resolution — September 7, 2026

Bookplate is the logo; the other two options and the `/design-preview`
comparison route were removed (`BrandMark` no longer takes a `variant`).
Rather than replacing the original design outright, both looks now ship
together: a "Theme 1 / Theme 2" switcher in Settings (`design-theme.tsx`,
`data-design` attribute on `<html>`, alongside the existing `data-theme`
light/dark attribute) lets a learner pick the original graph-paper/blue-ink
look or this warmer one, same as the light/dark toggle. Theme 2 (this
design) is the default for everyone. The switch covers palette, shadow,
paper texture, and the typographic/spacing rules in `editorial.css`; it does
not revert the copy and layout simplifications from the findings table above
(those apply either way).
