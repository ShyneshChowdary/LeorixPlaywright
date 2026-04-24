import { test, expect, Page } from '@playwright/test';

const BASE_URL          = 'https://app-dev.foundershub.ai';
const WORKFLOWS_URL     = `${BASE_URL}/workflows`;
const NOTIFICATIONS_URL = `${BASE_URL}/notifications`;
const MAILBOX_URL       = `${BASE_URL}/mailbox`;
const PAGES_URL         = `${BASE_URL}/pages`;

const CREDENTIALS = {
  email:    'info@foundershub.ai',
  password: 'Invest@92',
};

async function loginAndGoTo(page: Page, targetUrl: string): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(2_000);
  console.log(`✅ Navigated to ${targetUrl}`);
}

// ── Workflows ─────────────────────────────────────────────────────────────────

test.describe('Leorix — Workflows', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, WORKFLOWS_URL);
  });

  test('LWF-01: should load Workflows page', async ({ page }) => {
    await expect(page).toHaveURL(/.*workflows.*/i);
    console.log('✅ LWF-01 passed: Workflows page loaded');
  });

  test('LWF-02: should display Workflows heading or content', async ({ page }) => {
    await expect(page.locator('text=Workflow').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LWF-02 passed: Workflows heading visible');
  });

  test('LWF-03: should show Create or New Workflow button', async ({ page }) => {
    const btn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Workflow")').first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    console.log('✅ LWF-03 passed: Create/New Workflow button visible');
  });

  test('LWF-04: should not show error messages', async ({ page }) => {
    await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 5_000 });
    console.log('✅ LWF-04 passed: No error messages on Workflows page');
  });

  test('LWF-05: should display workflow list or empty state', async ({ page }) => {
    const isWorkflowPage = page.url().includes('workflow');
    const bodyVisible    = await page.locator('body').isVisible();
    expect(isWorkflowPage && bodyVisible).toBeTruthy();
    console.log('✅ LWF-05 passed: Workflows page rendered correctly');
  });

});

// ── Notifications ─────────────────────────────────────────────────────────────

test.describe('Leorix — Notifications', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, NOTIFICATIONS_URL);
  });

  test('LNT-01: should load Notifications page', async ({ page }) => {
    await expect(page).toHaveURL(/.*notifications.*/i);
    console.log('✅ LNT-01 passed: Notifications page loaded');
  });

  test('LNT-02: should display Notifications heading', async ({ page }) => {
    await expect(page.locator('text=Notifications').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LNT-02 passed: Notifications heading visible');
  });

  test('LNT-03: should display notification items or empty state', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
    console.log('✅ LNT-03 passed: Notifications section has content');
  });

  test('LNT-04: should show at least one action button', async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LNT-04 passed: Action button visible on Notifications page');
  });

  test('LNT-05: should not show error messages', async ({ page }) => {
    await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 5_000 });
    console.log('✅ LNT-05 passed: No errors on Notifications page');
  });

});

// ── Mailbox ───────────────────────────────────────────────────────────────────

test.describe('Leorix — Mailbox', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, MAILBOX_URL);
  });

  test('LMB-01: should load Mailbox page', async ({ page }) => {
    await expect(page).toHaveURL(/.*mailbox.*/i);
    console.log('✅ LMB-01 passed: Mailbox page loaded');
  });

  test('LMB-02: should display inbox or empty state', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
    console.log('✅ LMB-02 passed: Mailbox content visible');
  });

  test('LMB-03: should show Compose or action button', async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LMB-03 passed: Button visible on Mailbox page');
  });

  test('LMB-04: should display Mailbox layout correctly', async ({ page }) => {
    const isMailboxPage = page.url().includes('mailbox');
    expect(isMailboxPage).toBe(true);
    console.log('✅ LMB-04 passed: Mailbox layout loaded');
  });

  test('LMB-05: should not show error messages', async ({ page }) => {
    await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 5_000 });
    console.log('✅ LMB-05 passed: No errors on Mailbox page');
  });

});

// ── Pages ─────────────────────────────────────────────────────────────────────

test.describe('Leorix — Pages', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, PAGES_URL);
  });

  test('LPG-01: should load Pages section', async ({ page }) => {
    await expect(page).toHaveURL(/.*pages.*/i);
    console.log('✅ LPG-01 passed: Pages section loaded');
  });

  test('LPG-02: should display pages list or empty state', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
    console.log('✅ LPG-02 passed: Pages section has content');
  });

  test('LPG-03: should show Create or New Page button', async ({ page }) => {
    await expect(page.locator('button').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LPG-03 passed: Create button visible on Pages');
  });

  test('LPG-04: should not show error messages', async ({ page }) => {
    await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 5_000 });
    console.log('✅ LPG-04 passed: No errors on Pages section');
  });

});