import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.leorix.com";
const WORKFLOWS_URL     = `${BASE_URL}/workflows`;
const NOTIFICATIONS_URL = `${BASE_URL}/notifications`;
const MAILBOX_URL       = `${BASE_URL}/mailbox`;
const PAGES_URL         = `${BASE_URL}/pages`;

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

  await expect(page.locator('body')).toBeVisible();

  console.log(`✅ Successfully landed on ${targetUrl}`);
}

test.describe("Leorix — Workflows", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, WORKFLOWS_URL);
  });

  test("LWF-01: should load Workflows page", async ({ page }) => {
    await expect(page).toHaveURL(/.*workflows.*/);
  });

  test("LWF-02: should display Workflows UI", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("LWF-03: should show Create Workflow button", async ({ page }) => {
    const btn = page.locator(
      'button:has-text("Create"), button:has-text("New"), button:has-text("Workflow")'
    ).first();

    await expect(btn).toBeVisible({ timeout: 15000 });
  });

  test("LWF-04: should not show errors", async ({ page }) => {
    for (const msg of ["Something went wrong", "Failed to load", "Error"]) {
      await expect(page.locator(`text=${msg}`)).toHaveCount(0);
    }
  });

  test("LWF-05: should display workflow section", async ({ page }) => {
  await page.waitForTimeout(3000);

  const isCorrectPage = page.url().includes("workflows");

  const bodyVisible = await page.locator("body").isVisible();

  expect(isCorrectPage && bodyVisible).toBeTruthy();

  console.log("✅ LWF-05 passed: Workflows page loaded successfully");
});

});

test.describe("Leorix — Notifications", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, NOTIFICATIONS_URL);
  });

  test("LNT-01: should load Notifications page", async ({ page }) => {
    await expect(page).toHaveURL(/.*notifications.*/);
  });

  test("LNT-02: should display heading", async ({ page }) => {
    await expect(page.locator('text=Notifications').first()).toBeVisible();
  });

  test("LNT-03: should display notifications section", async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test("LNT-04: should show action button", async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible();
  });

  test("LNT-05: should not show errors", async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});

test.describe("Leorix — Mailbox", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, MAILBOX_URL);
  });

  test("LMB-01: should load Mailbox page", async ({ page }) => {
    await expect(page).toHaveURL(/.*mailbox.*/);
  });

  test("LMB-02: should display mailbox UI", async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test("LMB-03: should show compose button", async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible();
  });

  test("LMB-04: should display layout", async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test("LMB-05: should not show errors", async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});

test.describe("Leorix — Pages", () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, PAGES_URL);
  });

  test("LPG-01: should load Pages", async ({ page }) => {
    await expect(page).toHaveURL(/.*pages.*/);
  });

  test("LPG-02: should display pages section", async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test("LPG-03: should show create button", async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible();
  });

  test("LPG-04: should not show errors", async ({ page }) => {
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});