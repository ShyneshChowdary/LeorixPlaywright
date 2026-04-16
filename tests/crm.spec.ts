import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app-dev.foundershub.ai";
const CRM_URL  = `${BASE_URL}/modules?type=crm`;

const CREDENTIALS = {
  email:    "info@foundershub.ai",
  password: "Invest@92",
};

async function loginAndGoToCRM(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(CRM_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

test.describe("Leorix — CRM Module", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoToCRM(page);
    console.log("✅ CRM page loaded");
  });

  test("LCM-01: should load CRM module page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/.*crm.*/);
    await expect(page.locator("text=Something went wrong").first()).not.toBeVisible({ timeout: 5_000 });
    console.log("✅ LCM-01 passed: CRM page loaded");
  });

  test("LCM-02: should display CRM module content", async ({ page }) => {
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
    console.log("✅ LCM-02 passed: CRM module content is rendered");
  });

  test("LCM-03: should display CRM contacts or leads list", async ({ page }) => {
    const listItems = page.locator("table tr, [class*='card'], [class*='contact'], [class*='lead']");
    await expect(listItems.first()).toBeVisible({ timeout: 15_000 });
    const count = await listItems.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ LCM-03 passed: ${count} contact/lead items visible`);
  });

  test("LCM-04: should have Create button present on CRM page", async ({ page }) => {
    const createBtn = page.locator('[aria-label*="Create"], button:has-text("Create Template")').first();
    const count = await createBtn.count();
    expect(count).toBeGreaterThan(0);
    console.log("✅ LCM-04 passed: Create button is present in DOM");
  });

  test("LCM-05: should have search or filter functionality", async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]'
    ).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    console.log("✅ LCM-05 passed: Search/filter input is visible");
  });

  test("LCM-06: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error", "Unable to connect"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LCM-06 passed: No error messages visible");
  });

});