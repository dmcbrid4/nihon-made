import { expect, test } from "@playwright/test";

test("Progress page shows the N4 journey: countdown, curriculum meters, knowledge state, history, kanji grid, and pacing", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/progress");

  await expect(page.getByText("N4 TARGET")).toBeVisible();
  await expect(page.getByText(/days? remaining/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "N4 curriculum progress" }),
  ).toBeVisible();
  await expect(page.getByText("Overall curriculum progress")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vocabulary", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kanji", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Grammar", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "What you know" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /mastered, .* learning, .* introduced, .* unseen/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Kanji knowledge map/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Pacing toward/ }),
  ).toBeVisible();
  await expect(page.getByText(/^Status: /)).toBeVisible();

  await page.screenshot({
    path: `test-results/progress-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("the target date can be edited from the Progress page and the countdown updates", async ({
  page,
}) => {
  await page.goto("/progress");
  await page.getByRole("button", { name: "Edit target date" }).click();
  await page.getByLabel("Target date", { exact: true }).fill("2027-01-22");
  await page.getByRole("button", { name: "Save target date" }).click();
  await expect(
    page.getByText("Target: January 22, 2027", { exact: true }),
  ).toBeVisible();
});

test("a kanji cell links into the collection filtered to that character", async ({
  page,
}) => {
  await page.goto("/progress");
  const firstKanji = page.locator(".kanji-cell").first();
  const expression = await firstKanji.textContent();
  await firstKanji.click();
  await expect(page).toHaveURL(/\/collection\?type=kanji&level=(N5|N4)&q=/);
  await expect(page.locator(".collection-item")).toHaveCount(1);
  await expect(
    page.locator(".collection-item").getByText(expression!, { exact: true }),
  ).toBeVisible();
});
