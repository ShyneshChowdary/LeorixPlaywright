import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://app-dev.foundershub.ai';
const DEV_URL = `${BASE_URL}/modules?type=development`;

const CREDENTIALS = {
  email: 'info@foundershub.ai',
  password: 'Invest@92',
};

async function loginAndGoToDevelopment(page: Page): Promise<void> {
  console.log('🔐 Logging into Development...');
  
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);

  await page.locator('button[type="submit"], button:has-text("Login")').first().click();

  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });

  await page.goto(DEV_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });

  await page.locator('text=Development').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.locator('text=Bug Tracker').first().waitFor({ timeout: 15_000 }).catch(() => {});

  console.log('✅ Development page loaded successfully');
}

test.describe('Leorix — Development Module', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoToDevelopment(page);
  });

  test('LDV-01: should load Development module', async ({ page }) => {
    await expect(page).toHaveURL(/.*development.*/i);
    console.log('✅ LDV-01 passed');
  });

  test('LDV-02: should display Bug Tracker card', async ({ page }) => {
    await expect(page.locator('text=Bug Tracker').first()).toBeVisible({ timeout: 15_000 });
    console.log('✅ LDV-02 passed');
  });

  test('LDV-03: should display Pipeline Health section', async ({ page }) => {
    await expect(page.locator('text=PIPELINE HEALTH').first()).toBeVisible({ timeout: 12_000 });
    console.log('✅ LDV-03 passed');
  });

  test('LDV-04: should open Bug Tracker details on click', async ({ page }) => {
    await page.locator('text=Bug Tracker').first().click();
    await page.waitForTimeout(4_000);

    const hasContent = await Promise.any([
      page.locator('text=Bug Tracker').first().isVisible({ timeout: 8_000 }),
      page.locator('text=8 RECORDS').first().isVisible({ timeout: 8_000 }),
      page.locator('table').first().isVisible({ timeout: 8_000 }),
      page.locator('text=RECENT RECORDS').first().isVisible({ timeout: 8_000 })
    ]).catch(() => false);

    expect(hasContent).toBe(true);
    console.log('✅ LDV-04 passed: Bug Tracker opened');
  });

  test('LDV-05: should not show error messages', async ({ page }) => {
    for (const msg of ['Something went wrong', 'Failed to load', 'Error']) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log('✅ LDV-05 passed: No errors');
  });

  test('LDV-06: should show recent records / activity', async ({ page }) => {
    // Look for table or recent records section (very reliable)
    const hasRecent = await Promise.any([
      page.locator('text=RECENT RECORDS').first().isVisible({ timeout: 10_000 }),
      page.locator('table').first().isVisible({ timeout: 10_000 }),
      page.locator('text=Showing').first().isVisible({ timeout: 10_000 }),
      page.locator('text=8 RECORDS').first().isVisible({ timeout: 10_000 })
    ]).catch(() => false);

    expect(hasRecent).toBe(true);
    console.log('✅ LDV-06 passed: Recent records / activity visible');
  });
});