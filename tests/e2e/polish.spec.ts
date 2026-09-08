import { expect, test } from "@playwright/test";

test("auth pages stay outside the study shell and password controls are explicit", async ({
  page,
}) => {
  await page.goto("/sign-in");

  await expect(page.locator(".auth-page")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Email link" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Password", exact: true }).click();
  await expect(page.getByRole("button", { name: "Password", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Show password" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");

  await page.goto("/auth/set-password");
  await expect(page.locator(".auth-page")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

test("mobile settings stacks the independent study paces", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");

  const first = page.locator("#new-cards-N5");
  const second = page.locator("#new-cards-N4");
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
