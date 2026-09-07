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

test("hiragana study: new-character intro, recognition quiz, recall quiz, and real progress", async ({
  page,
}, testInfo) => {
  await page.goto("/kana/hiragana");
  await expect(page.getByRole("heading", { name: "Hiragana", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start practicing" }).click();

  // First card is the intro panel for a brand-new character.
  await expect(page.getByText("A NEW CHARACTER")).toBeVisible();
  await page.screenshot({
    path: `test-results/kana-intro-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Got it/ }).click();

  // Recognition quiz: symbol shown, choose the romaji.
  await expect(page.getByText("WHAT SOUND IS THIS?")).toBeVisible();
  const kanaHeading = page.locator(".kana-character");
  const character = await kanaHeading.textContent();
  expect(character?.trim().length).toBeGreaterThan(0);
  await page.screenshot({
    path: `test-results/kana-recognition-quiz-${testInfo.project.name}.png`,
    fullPage: true,
  });

  // Answer every remaining card in the session: click through any "new
  // character" intro panel, then pick options until correct, so the
  // session reaches completion deterministically.
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("heading", { name: "A little more legible." }).isVisible()) break;
    const gotIt = page.getByRole("button", { name: /Got it/ });
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click();
      continue;
    }
    const options = page.locator(".kana-option");
    const count = await options.count();
    let settled = false;
    for (let j = 0; j < count; j++) {
      const option = options.nth(j);
      if (!(await option.isEnabled())) break; // this attempt cycle already resolved
      await option.click();
      if (
        (await page.locator(".kana-option-correct").count()) ||
        (await page.locator(".kana-feedback-incorrect").count())
      ) {
        settled = true;
        break;
      }
    }
    if (!settled) break;
    await page.waitForTimeout(1300);
  }
  await expect(page.getByRole("heading", { name: "A little more legible." })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  expect(state.reviews.length).toBeGreaterThan(0);
  expect(state.sessions[0].mode).toBe("kana");
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
