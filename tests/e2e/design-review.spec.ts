import { expect, test } from "@playwright/test";

test("session breakdown includes listening and review progress survives a reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".session-row").filter({ hasText: "Listening" }),
  ).toContainText("1 clip");
  await expect(page.locator(".skill-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  await page.getByRole("button", { name: /Good/ }).click();
  await page.getByRole("link", { name: "Save & leave" }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue session", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".session-index dl")).toContainText(
    "Cards reviewed1",
  );
  await expect(
    page.getByRole("progressbar", { name: "N5 vocabulary mastered" }),
  ).toHaveAttribute("aria-valuenow", "0");
  expect(errors).toEqual([]);
});

test("the theme-1/theme-2 switcher persists across routes and reloads without touching study progress", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar .identity-bookplate")).toBeVisible();
  const history = await page.evaluate(() =>
    localStorage.getItem("nihon-made:study:v1"),
  );
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.locator(".design-option")).toHaveCount(2);
  const theme1 = page.getByRole("button", { name: /Theme 1/ });
  await theme1.click();
  await expect(theme1).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-design", "1");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-design", "1");
  await expect(theme1).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Toggle light and dark mode" })
    .filter({ visible: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-design", "1");
  await page.goto("/guest");
  await expect(
    page.locator(".guest-sidebar .identity-bookplate"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guest demo", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("nihon-made:study:v1")),
  ).toBe(history);
  const theme2 = page.getByRole("button", { name: /Theme 2/ });
  await page.goto("/settings");
  await theme2.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-design", "1");
});

test("mode controls and independent pace sliders remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Active study mode").selectOption("N4");
  await expect(
    page.getByRole("heading", { name: "N4 progress", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "N4 collection", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.locator('.new-card-pacing input[type="range"]'),
  ).toHaveCount(3);
  for (const [mode, value] of [
    ["N5", "12"],
    ["N4", "15"],
    ["tae-kim", "18"],
  ]) {
    await page.locator(`#new-cards-${mode}`).fill(value);
  }
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Your settings are saved.");
  await page.reload();
  for (const [mode, value] of [
    ["N5", "12"],
    ["N4", "15"],
    ["tae-kim", "18"],
  ]) {
    await expect(page.locator(`#new-cards-${mode}`)).toHaveValue(value);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
