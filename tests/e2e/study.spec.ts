import { expect, test } from "@playwright/test";

test("dashboard, session resume, all four ratings, completion, and real progress", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
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
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  // Card content/order comes from the curriculum data, which is actively
  // being re-audited and re-sequenced -- assert on the review mechanics
  // (reveal, rate, resume, complete), not specific vocabulary, so this test
  // doesn't need rewriting every time the curriculum changes.
  const revealButton = page.getByRole("button", {
    name: /Reveal answer|Check understanding/,
  });
  await expect(revealButton).toBeVisible();
  await expect(page.locator(".study-progress-label")).toContainText("1");
  await revealButton.click();
  await expect(page.locator("h2").first()).toBeVisible();
  await page.screenshot({
    path: `test-results/study-${testInfo.project.name}.png`,
    fullPage: true,
  });
  // Exercise all four ratings across the session, cycling through them.
  await page.getByRole("button", { name: /Again/ }).click();
  await expect(page.locator(".study-progress-label")).toContainText("2");
  await page.getByRole("link", { name: "Save & leave" }).click();
  await expect(
    page.getByRole("button", { name: "Continue session", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  // Interrupting and resuming must land on the same still-unreviewed card.
  await expect(page.locator(".study-progress-label")).toContainText("2");
  // Cycle through the four ratings, however many cards remain -- session
  // length is a pacing setting, not something this test should hardcode.
  const cycle = ["Hard", "Good", "Easy", "Good"];
  for (let i = 0; i < 20; i++) {
    if (
      await page
        .getByRole("heading", { name: "Session complete", exact: true })
        .isVisible()
        .catch(() => false)
    )
      break;
    await page
      .getByRole("button", { name: /Reveal answer|Check understanding/ })
      .click();
    // A reading/listening card shows a translation disclosure before rating
    // buttons make sense to press -- open it when present.
    const passageToggle = page.getByText("Show passage translation");
    if (await passageToggle.isVisible().catch(() => false))
      await passageToggle.click();
    await page
      .getByRole("button", { name: new RegExp(cycle[i % cycle.length]) })
      .click();
    // Completion is an async state update -- give it a beat to land before
    // the next loop check, or the last rating's click can race the "Session
    // complete" transition and leave us waiting on a reveal button that will
    // never come back.
    await page.waitForTimeout(300);
  }
  await expect(
    page.getByRole("heading", { name: "Session complete", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Session complete", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();
  // Mastery needs a 3-review streak *and* a 7-day interval (scheduler.ts) --
  // impossible to reach on a concept's very first-ever review, so a fresh
  // account's first session correctly still shows zero mastered.
  await expect(
    page.getByRole("progressbar", { name: "N5 vocabulary mastered" }),
  ).toHaveAttribute("aria-valuenow", "0");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  // Every concept the session started with got exactly one review, and real
  // per-concept progress ("introduced") was recorded for each.
  expect(state.reviews).toHaveLength(state.sessions[0].conceptIds.length);
  expect(state.progress).toHaveLength(state.sessions[0].conceptIds.length);
  expect(
    state.progress.every(
      (item: { status: string }) => item.status === "introduced",
    ),
  ).toBe(true);
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
  await expect(page.locator(".collection-item")).toHaveCount(42);
  await page.getByRole("button", { name: "All concepts" }).click();
  await page
    .getByRole("searchbox", { name: "Search concepts" })
    .fill("bicycle");
  await expect(page.locator(".collection-item")).toHaveCount(1);
  await page.locator(".collection-item summary").click();
  await expect(page.getByText("じてんしゃ", { exact: true })).toBeVisible();
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
  await expect(
    page.getByText("N4 · DAILY STUDY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "N4 collection", exact: true }),
  ).toBeVisible();
  const n4State = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nihon-made:study:v1")!),
  );
  expect(n4State.goal.studyMode).toBe("N4");

  await page.getByLabel("Active study mode").selectOption("N5");
  await expect(
    page.getByRole("heading", { name: "N5 collection", exact: true }),
  ).toBeVisible();
});

test("storage failures are visible and never advance the study card", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  // Whatever card this actually is (curriculum content/order isn't this
  // test's concern) -- just remember it so we can confirm it's still there.
  const answerHeading = await page.locator("h2").first().innerText();
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
    page.getByRole("heading", { name: answerHeading, exact: true }),
  ).toBeVisible();
});
