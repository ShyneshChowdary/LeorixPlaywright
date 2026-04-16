import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.leorix.com";
const DEV_URL  = `${BASE_URL}/modules?type=development`;

const CREDENTIALS = {
  email:    "info@foundershub.ai",
  password: "Invest@92",
};

async function loginAndGoToDevelopment(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(DEV_URL, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(2_000);
}

test.describe("Leorix — Development Module", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoToDevelopment(page);
    console.log("✅ Development page loaded");
  });

  test("LDV-01: should load Development module page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/.*development.*/);
    console.log("✅ LDV-01 passed: Development page loaded");
  });

  test("LDV-02: should display Bug Tracker section", async ({ page }) => {
    await expect(page.locator("text=Bug Tracker").first()).toBeVisible({ timeout: 15_000 });
    console.log("✅ LDV-02 passed: Bug Tracker visible");
  });

  test("LDV-03: should display Analytics section link", async ({ page }) => {
    await expect(page.locator("text=Analytics").first()).toBeVisible({ timeout: 15_000 });
    console.log("✅ LDV-03 passed: Analytics section visible");
  });

  test("LDV-04: should navigate to Bug Tracker on click", async ({ page }) => {
    await page.locator("text=Bug Tracker").first().click();
    await expect(page).toHaveURL(/metrics|data|bug/i, { timeout: 20_000 });
    console.log("✅ LDV-04 passed: Bug Tracker navigation works");
  });

  test("LDV-05: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LDV-05 passed: No errors on Development page");
  });

  test("LDV-06: should return to Development page on browser back", async ({ page }) => {
    await page.locator("text=Bug Tracker").first().click();
    await page.waitForURL(/metrics|data|bug/i, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/development/i, { timeout: 15_000 });
    console.log("✅ LDV-06 passed: Browser back returns to Development");
  });

});