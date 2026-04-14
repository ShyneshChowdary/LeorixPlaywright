import { test, expect, Page } from "@playwright/test";

// =============================================================================
// CONFIG
// =============================================================================

const BASE_URL = "https://app-dev.foundershub.ai";
const CRM_URL  = `${BASE_URL}/modules?type=crm`;

const CREDENTIALS = {
  email:    "info@foundershub.ai",
  password: "Invest@92",
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Logs in and navigates directly to the CRM module page.
 * Waits for the page to reach networkidle before returning.
 *
 * @param page - Playwright Page instance.
 */
async function loginAndGoToCRM(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(CRM_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

// =============================================================================
// TEST SUITE — CRM MODULE
// =============================================================================

test.describe("Leorix — CRM Module", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoToCRM(page);
    console.log("✅ CRM page loaded");
  });

  /**
   * Verifies the CRM module page loads and the URL is correct.
   * Expected: URL contains "crm" and page does not show an error.
   */
  test("LCM-01: should load CRM module page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/.*crm.*/);
    await expect(page.locator("text=Something went wrong").first()).not.toBeVisible({ timeout: 5_000 });
    console.log("✅ LCM-01 passed: CRM page loaded");
  });

  /**
   * Verifies the main CRM heading or module title is visible.
   * Expected: A heading identifying this as the CRM section is present.
   */
  test("LCM-02: should display CRM module heading", async ({ page }) => {
    const heading = page.locator("h1, h2, [class*='title'], [class*='heading']").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    console.log("✅ LCM-02 passed: CRM heading visible");
  });

  /**
   * Verifies the CRM contact list or leads table is rendered with data.
   * Expected: At least one row or card of contact data is visible.
   */
  test("LCM-03: should display CRM contacts or leads list", async ({ page }) => {
    const listItems = page.locator("table tr, [class*='card'], [class*='contact'], [class*='lead']");
    await expect(listItems.first()).toBeVisible({ timeout: 15_000 });
    const count = await listItems.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ LCM-03 passed: ${count} contact/lead items visible`);
  });

  /**
   * Verifies the Add / New Contact button is present and clickable.
   * Expected: A button to create a new contact is visible on the CRM page.
   */
  test("LCM-04: should show Add New Contact button", async ({ page }) => {
    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), [class*="add"]'
    ).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LCM-04 passed: Add/New button is visible");
  });

  /**
   * Verifies that the search or filter functionality exists on the CRM page.
   * Expected: A search input or filter control is visible.
   */
  test("LCM-05: should have search or filter functionality", async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]'
    ).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    console.log("✅ LCM-05 passed: Search/filter input is visible");
  });

  /**
   * Verifies that no error banners are shown on the CRM module page.
   * Expected: Error messages are not visible after a successful load.
   */
  test("LCM-06: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error", "Unable to connect"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LCM-06 passed: No error messages visible");
  });

});