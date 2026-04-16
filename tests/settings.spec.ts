import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.leorix.com";
const INTEGRATIONS_URL = `${BASE_URL}/settings/integrations`;
const PROFILE_URL      = `${BASE_URL}/settings?tab=personal`;
const DOCUMENTS_URL    = `${BASE_URL}/settings?tab=documents`;

const CREDENTIALS = {
  email:    "info@foundershub.ai",
  password: "Invest@92",
};

async function loginAndGoTo(page: Page, targetUrl: string): Promise<void> {
  console.log('🔐 Logging into application...');
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });

  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);

  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
    .first()
    .click();

  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });

  console.log(`✅ Successfully landed on ${targetUrl}`);
}

test.describe("Leorix — Integrations Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, INTEGRATIONS_URL);
  });

  test("LSI-01: should load Integrations settings page", async ({ page }) => {
    await expect(page).toHaveURL(/.*integrations.*/);
    console.log("✅ LSI-01 passed: Integrations URL correct");
  });

  test("LSI-02: should display connected integration providers", async ({ page }) => {
    const providers = ["Gmail", "HubSpot", "LinkedIn", "Google"];
    let found = false;

    for (const p of providers) {
      if (await page.locator(`text=${p}`).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        found = true;
        console.log(`   Found integration: ${p}`);
        break;
      }
    }

    expect(found).toBe(true);
    console.log("✅ LSI-02 passed: At least one integration provider visible");
  });

  test("LSI-03: should show button to connect a new integration", async ({ page }) => {
    const btn = page.locator('button:has-text("Connect"), button:has-text("Add"), button:has-text("New")').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSI-03 passed: Connect/Add button visible");
  });

  test("LSI-04: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LSI-04 passed: No errors on Integrations page");
  });

});

test.describe("Leorix — Profile Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, PROFILE_URL);
  });

  test("LSP-01: should load Profile settings page", async ({ page }) => {
    await expect(page).toHaveURL(/.*settings.*/);
    console.log("✅ LSP-01 passed: Profile settings page loaded");
  });

  test("LSP-02: should display logged-in user email in profile form", async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    const value = await emailInput.inputValue();
    expect(value.toLowerCase()).toContain("foundershub");
    console.log(`✅ LSP-02 passed: Email field shows ${value}`);
  });

  test("LSP-03: should display user name on profile page", async ({ page }) => {
    const pageText = await page.locator("body").innerText();
    const hasName = pageText.includes("LeoRix") || 
                    pageText.includes("Foundershub") || 
                    pageText.includes("AI1");

    expect(hasName).toBe(true);
    console.log("✅ LSP-03 passed: User name is present on profile page");
  });

  test("LSP-04: should show Save or Update button on profile form", async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Submit")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSP-04 passed: Save/Update button visible");
  });

  test("LSP-05: should not show error messages on load", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load"]) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log("✅ LSP-05 passed: No errors on Profile page");
  });

});

test.describe("Leorix — Documents Settings", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, DOCUMENTS_URL);
  });

  test("LSD-01: should load Documents settings tab", async ({ page }) => {
    await expect(page).toHaveURL(/.*settings.*documents.*/);
    console.log("✅ LSD-01 passed: Documents settings URL correct");
  });

  test("LSD-02: should display Documents section heading", async ({ page }) => {
    await expect(page.locator("text=Documents").first()).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSD-02 passed: Documents heading visible");
  });

  test("LSD-03: should have Create or Add Document button", async ({ page }) => {
    const createBtn = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), button:has-text("Document")'
    ).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    console.log("✅ LSD-03 passed: Create/Add document button visible");
  });

  test("LSD-04: should display document list or empty state", async ({ page }) => {
  const possibleElements = [
    page.locator('text=Quote Templates'),
    page.locator('text=Contract Templates'),
    page.locator('text=Create New'),
    page.locator('text=No documents'),
    page.locator('[class*="template"]'),
    page.locator('[class*="card"]'),
  ];

  let isVisible = false;

  for (const el of possibleElements) {
    if (await el.first().isVisible().catch(() => false)) {
      isVisible = true;
      break;
    }
  }

  expect(isVisible).toBe(true);
  console.log("✅ LSD-04 passed: Document list or empty state visible");
});

});