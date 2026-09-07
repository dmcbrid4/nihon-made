import { expect, test } from "@playwright/test";

test("dashboard, session resume, all four ratings, completion, and real progress", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little closer to Japan." }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "N5 vocabulary mastered" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Start Today’s Japanese" }).click();
  await expect(
    page.getByRole("heading", { name: "間に合う", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("to be in time; to make it in time", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  await expect(
    page.getByRole("heading", { name: "to be in time; to make it in time" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/study-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Again/ }).click();
  await expect(
    page.getByRole("heading", { name: "乗り換える", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Save & leave" }).click();
  await expect(
    page.getByRole("button", { name: "Continue Today’s Japanese" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continue Today’s Japanese" }).click();
  await expect(
    page.getByRole("heading", { name: "乗り換える", exact: true }),
  ).toBeVisible();
  for (const rating of ["Hard", "Good", "Easy", "Good", "Good", "Good"]) {
    await page.getByRole("button", { name: /Reveal answer/ }).click();
    await page.getByRole("button", { name: new RegExp(rating) }).click();
  }
  await expect(
    page.getByText("What time will you meet your friend?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Check understanding/ }).click();
  await page.getByText("Show passage translation").click();
  await expect(page.getByText(/Tomorrow, I’m going to Tokyo/)).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(
    page.getByRole("heading", { name: "A little more understood." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little more understood." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(
    page.getByRole("progressbar", { name: "N5 vocabulary mastered" }),
  ).toHaveAttribute("aria-valuenow", "4");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  expect(state.reviews).toHaveLength(8);
  expect(state.sessions[0].completedAt).toBeTruthy();
  expect(errors).toEqual([]);
});

test("settings, countdown, dark mode, collection filtering, and history export", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("N4 target date").fill("2027-01-22");
  await page.getByLabel("Daily study budget").selectOption("10");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Your settings are saved.");
  await page.reload();
  await expect(page.getByLabel("N4 target date")).toHaveValue("2027-01-22");
  await expect(page.getByLabel("Daily study budget")).toHaveValue("10");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export study history" }).click();
  expect((await download).suggestedFilename()).toBe(
    "nihon-made-study-history.json",
  );
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(
    page.getByText("Target: January 22, 2027", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle light and dark mode" })
    .filter({ visible: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await page.getByRole("button", { name: "Kanji", exact: true }).click();
  await expect(page.locator(".collection-item")).toHaveCount(5);
  await page.getByRole("button", { name: "All concepts" }).click();
  await page
    .getByRole("searchbox", { name: "Search concepts" })
    .fill("reservation");
  await expect(page.locator(".collection-item")).toHaveCount(1);
  await page.locator(".collection-item summary").click();
  await expect(page.getByText("よやく", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("study modes keep the N5 and N4 queues and collection separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Active study mode").selectOption("N4");
  await expect(page.getByRole("heading", { name: "N4 Japanese study" })).toBeVisible();
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "N4 collection." })).toBeVisible();
  const n4State = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  expect(n4State.goal.studyMode).toBe("N4");

  await page.getByLabel("Active study mode").selectOption("N5");
  await expect(page.getByRole("heading", { name: "N5 collection." })).toBeVisible();
});

test("storage failures are visible and never advance the study card", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Today’s Japanese" }).click();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Storage quota exceeded",
  );
  await expect(
    page.getByRole("heading", { name: "間に合う", exact: true }),
  ).toBeVisible();
});
