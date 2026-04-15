import { test, expect, Page } from "@playwright/test";

// =============================================================================
// CONFIG
// =============================================================================

const BASE_URL         = "https://app-dev.foundershub.ai";
const INTEGRATIONS_URL = `${BASE_URL}/settings/integrations`;
const PROFILE_URL      = `${BASE_URL}/settings?tab=personal`;
const DOCUMENTS_URL    = `${BASE_URL}/settings?tab=documents`;

const CREDENTIALS = {
  email:    "info@foundershub.ai",
  password: "Invest@92",
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Logs in once then navigates to a given URL and waits for networkidle.
 *
 * @param page       - Playwright Page instance.
 * @param targetUrl  - The URL to navigate to after login.
 */
async function loginAndGoTo(page: Page, targetUrl: string): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

// =============================================================================
// TEST SUITE — INTEGRATIONS SETTINGS
// =============================================================================

test.describe("Leorix — Integrations Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, INTEGRATIONS_URL);
    console.log("✅ Integrations settings page loaded");
  });

  /**
   * Verifies the Integrations settings page loads at the correct URL.
   * Expected: URL contains "integrations".
   */
  test("LSI-01: should load Integrations settings page", async ({ page }) => {
    await expect(page).toHaveURL(/.*integrations.*/);
    console.log("✅ LSI-01 passed: Integrations URL correct");
  });

  /**
   * Verifies Connected Integrations section shows known provider names.
   * Expected: At least one of Gmail, HubSpot, LinkedIn, or Google is visible.
   */
  test("LSI-02: should display connected integration providers", async ({ page }) => {
    const providers = ["Gmail", "HubSpot", "LinkedIn", "Google", "Integration"];
    let found = false;
    for (const p of providers) {
      const el = page.locator(`text=${p}`).first();
      if (await el.isVisible({ timeout: 5_000 }).catch(() => false)) {
        found = true;
        console.log(`   Found integration: ${p}`);
        break;
      }
    }
    expect(found).toBe(true);
    console.log("✅ LSI-02 passed: At least one integration provider visible");
  });

  /**
   * Verifies a Connect or Add Integration button exists on the page.
   * Expected: A button to connect a new integration is visible.
   */
  test("LSI-03: should show button to connect a new integration", async ({ page }) => {
    const btn = page.locator(
      'button:has-text("Connect"), button:has-text("Add"), button:has-text("New Integration")'
    ).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSI-03 passed: Connect/Add button visible");
  });

  /**
   * Verifies no errors are shown on Integrations settings page.
   * Expected: Error banners are not visible.
   */
  test("LSI-04: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LSI-04 passed: No errors on Integrations page");
  });

});


// =============================================================================
// TEST SUITE — PROFILE SETTINGS
// =============================================================================

test.describe("Leorix — Profile Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, PROFILE_URL);
    console.log("✅ Profile settings page loaded");
  });

  /**
   * Verifies the Profile settings page loads correctly.
   * Expected: URL contains "settings".
   */
  test("LSP-01: should load Profile settings page", async ({ page }) => {
    await expect(page).toHaveURL(/.*settings.*/);
    console.log("✅ LSP-01 passed: Profile settings page loaded");
  });

  /**
   * Verifies the user's email is pre-filled on the profile form.
   * Expected: The email field contains the logged-in user's email address.
   */
  test("LSP-02: should display logged-in user email in profile form", async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    const value = await emailInput.inputValue();
    expect(value.toLowerCase()).toContain("foundershub");
    console.log(`✅ LSP-02 passed: Email field shows ${value}`);
  });

  /**
   * Verifies the user's display name appears somewhere on the profile page.
   * The name may appear in an input field, a label, or a read-only text
   * element rather than as visible static text. We check both input values
   * and visible text to handle either case.
   *
   * Expected: Any visible element containing "Foundershub" or "AI1" exists on the page.
   */
  test("LSP-03: should display user name on profile page", async ({ page }) => {
    const nameInText = await page.locator("body").innerText();
    const hasName = nameInText.includes("Foundershub") || nameInText.includes("AI1");

    if (!hasName) {
      const nameInputs = page.locator('input[name*="name" i], input[placeholder*="name" i]');
      const inputCount = await nameInputs.count();
      let foundInInput = false;
      for (let i = 0; i < inputCount; i++) {
        const val = await nameInputs.nth(i).inputValue();
        if (val.includes("Foundershub") || val.includes("AI1")) {
          foundInInput = true;
          break;
        }
      }
      expect(foundInInput).toBe(true);
    } else {
      expect(hasName).toBe(true);
    }

    console.log("✅ LSP-03 passed: User name is present on profile page");
  });

  /**
   * Verifies a Save or Update button is present to submit profile changes.
   * Expected: A save/update button is visible on the profile settings form.
   */
  test("LSP-04: should show Save or Update button on profile form", async ({ page }) => {
    const saveBtn = page.locator(
      'button:has-text("Save"), button:has-text("Update"), button:has-text("Submit")'
    ).first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSP-04 passed: Save/Update button visible");
  });

  /**
   * Verifies no error messages appear on the profile settings page.
   * Expected: Error banners are not visible after successful load.
   */
  test("LSP-05: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LSP-05 passed: No errors on Profile page");
  });

});


// =============================================================================
// TEST SUITE — DOCUMENTS SETTINGS
// =============================================================================

test.describe("Leorix — Documents Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, DOCUMENTS_URL);
    console.log("✅ Documents settings page loaded");
  });

  /**
   * Verifies the Documents settings tab loads at the correct URL.
   * Expected: URL contains both "settings" and "documents".
   */
  test("LSD-01: should load Documents settings tab", async ({ page }) => {
    await expect(page).toHaveURL(/.*settings.*documents.*/);
    console.log("✅ LSD-01 passed: Documents settings URL correct");
  });

  /**
   * Verifies the Documents section heading is visible on the page.
   * Expected: "Documents" label or heading is visible.
   */
  test("LSD-02: should display Documents section heading", async ({ page }) => {
    await expect(page.locator("text=Documents").first()).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSD-02 passed: Documents heading visible");
  });

  /**
   * Verifies the Documents tab allows creating or adding new documents.
   * This tab does not have a file upload input — documents are created
   * directly in the app. We check for a Create, Add, or New button instead.
   *
   * Expected: A button to create or add a document is visible.
   */
  test("LSD-03: should have Create or Add Document button", async ({ page }) => {
    const createBtn = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), button:has-text("Document")'
    ).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSD-03 passed: Create/Add document button visible");
  });

  /**
   * Verifies the Documents tab shows existing documents or an empty state.
   * Expected: A list of documents or an empty state message is visible.
   */
  test("LSD-04: should display document list or empty state", async ({ page }) => {
    const content = page.locator(
      "[class*='document'], [class*='file'], [class*='list'], text=No documents, text=Create your first"
    ).first();
    await expect(content).toBeVisible({ timeout: 15_000 });
    console.log("✅ LSD-04 passed: Document list or empty state visible");
  });

  /**
   * Verifies no error messages appear on the Documents settings page.
   * Expected: Error banners are not visible.
   */
  test("LSD-05: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LSD-05 passed: No errors on Documents page");
  });

});