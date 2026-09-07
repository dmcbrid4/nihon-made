import { expect, test } from "@playwright/test";

test("kana home shows separate hiragana/katakana progress and links into study", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Kana", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kana foundations." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hiragana", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Katakana", exact: true })).toBeVisible();
  await expect(page.getByText("0 / 46 basic kana mastered")).toHaveCount(2);
  await page.screenshot({
    path: `test-results/kana-home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("hiragana Study: select from the chart, browse without any scoring", async ({
  page,
}, testInfo) => {
  await page.goto("/kana/hiragana");
  await expect(page.getByRole("heading", { name: "Hiragana", exact: true })).toBeVisible();
  // Study tab is the default; select a few characters from the chart.
  await page.getByRole("button", { name: "Select Basic" }).click();
  await expect(page.locator(".kana-selector-count")).toHaveText("46 selected");
  await page.screenshot({
    path: `test-results/kana-study-select-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Study 46 selected/ }).click();
  await expect(page.getByText("WHAT SOUND IS THIS?")).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-study-browse-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reveal" }).click();
  await expect(page.locator(".answer-main h2")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("WHAT SOUND IS THIS?")).toBeVisible();
  // Browsing writes nothing to progress -- no scoring, no persistence.
  // Nothing has dispatched at all yet, so the storage key may not even exist.
  const raw = await page.evaluate(() => localStorage.getItem("nihon-made:study:v1"));
  if (raw) expect(JSON.parse(raw).progress).toHaveLength(0);
});

test("hiragana Quiz: select one character, answer correctly 5 times, it masters", async ({
  page,
}, testInfo) => {
  await page.goto("/kana/hiragana");
  await page.getByRole("button", { name: "Quiz", exact: true }).click();
  await page.locator(".kana-cell", { hasText: "あ" }).first().click();
  await expect(page.locator(".kana-selector-count")).toHaveText("1 selected");
  await page.getByRole("button", { name: "Recognition only", exact: true }).click();
  await page.getByRole("button", { name: "Short (~10)", exact: true }).click();
  await page.screenshot({
    path: `test-results/kana-quiz-configure-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Start quiz/ }).click();
  await expect(page.getByText("WHAT SOUND IS THIS?")).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-quiz-question-${testInfo.project.name}.png`,
    fullPage: true,
  });

  // Every question is the same character (recognition only, one selected) --
  // answer correctly enough times in a row to cross the 5-streak mastery bar.
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText("WHAT SOUND IS THIS?")).toBeVisible();
    await page.getByRole("button", { name: "a", exact: true }).click();
    await expect(page.locator(".kana-option-correct")).toBeVisible();
    await page.waitForTimeout(750);
  }
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  const progress = state.progress.find((p: { conceptId: string }) =>
    p.conceptId.startsWith("kana-h-a-a-recognition"),
  );
  expect(progress.successStreak).toBeGreaterThanOrEqual(5);
  expect(progress.status).toBe("mastered");
  expect(state.sessions).toHaveLength(0); // quiz answers aren't session-bound

  // Finish the remaining questions to reach the results screen.
  for (let i = 0; i < 5; i++) {
    if (await page.getByRole("heading", { name: /^\d+ \/ \d+$/ }).isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "a", exact: true }).click();
    await page.waitForTimeout(750);
  }
  await expect(page.getByText("QUIZ COMPLETE")).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-quiz-results-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("kana chart renders a gojūon grid and shows character detail on click", async ({
  page,
}, testInfo) => {
  await page.goto("/kana/hiragana?tab=chart");
  await page.getByRole("button", { name: "Chart", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Basic kana" })).toBeVisible();
  await page.locator(".kana-cell", { hasText: "あ" }).first().click();
  await expect(page.locator(".kana-detail-character")).toHaveText("あ");
  await expect(page.getByText("Status: Unseen")).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-chart-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("marking a script known reflects immediately in progress, and Kana shows on the Progress page", async ({
  page,
}, testInfo) => {
  await page.goto("/kana");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Mark Hiragana known" }).click();
  await expect(page.getByText("all of Hiragana marked as known.")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await page.waitForURL("/progress");
  await expect(page.getByRole("heading", { name: "Kana foundations", level: 2 })).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-progress-section-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  expect(state.progress.length).toBe(105 * 2); // every hiragana character, both directions
  expect(state.progress.every((item: { status: string }) => item.status === "mastered")).toBe(true);
});
