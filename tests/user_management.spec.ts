import { test, expect, Page } from '@playwright/test';

const BASE_URL      = 'https://app-dev.foundershub.ai';
const ADMIN_URL     = `${BASE_URL}/admin/users`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;

const CREDENTIALS = {
  email:    'info@foundershub.ai',
  password: 'Invest@92',
};

const INVALID_CREDENTIALS = {
  email:    'wrong@example.com',
  password: 'WrongPassword123',
};

async function attemptLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
}

async function loginAndGoTo(page: Page, targetUrl: string): Promise<void> {
  await attemptLogin(page, CREDENTIALS.email, CREDENTIALS.password);
  await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(2_000);
}

// ── Login & Logout ────────────────────────────────────────────────────────────

test.describe('Leorix — Login & Logout', () => {

  test('LLL-01: should login with valid credentials and reach dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    await attemptLogin(page, CREDENTIALS.email, CREDENTIALS.password);
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 45_000 });
    await expect(page.locator('text=Welcome back').first()).toBeVisible({ timeout: 10_000 });
    console.log('✅ LLL-01 passed: Valid login redirects to dashboard');
  });

  test('LLL-02: should show error or stay on login with invalid credentials', async ({ page }) => {
    test.setTimeout(60_000);
    await attemptLogin(page, INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
    await page.waitForTimeout(3_000);
    const stayedOnLogin = !page.url().includes('dashboard');
    expect(stayedOnLogin).toBe(true);
    console.log('✅ LLL-02 passed: Invalid credentials did not reach dashboard');
  });

  test('LLL-03: should not submit when email is empty', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
    await page.locator('button[type="submit"], button:has-text("Login")').first().click();
    await page.waitForTimeout(2_000);
    const stayedOnLogin = !page.url().includes('dashboard');
    expect(stayedOnLogin).toBe(true);
    console.log('✅ LLL-03 passed: Empty email prevented login submission');
  });

  test('LLL-04: should logout and redirect away from dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    await attemptLogin(page, CREDENTIALS.email, CREDENTIALS.password);
    await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });

    const logoutBtn = page.getByRole('button', { name: 'Logout' });
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    await page.waitForTimeout(3_000);
    const redirectedAway = !page.url().includes('dashboard');
    expect(redirectedAway).toBe(true);
    console.log('✅ LLL-04 passed: Logout redirects away from dashboard');
  });

  test('LLL-05: should not access dashboard after logging out', async ({ page }) => {
    test.setTimeout(60_000);
    await attemptLogin(page, CREDENTIALS.email, CREDENTIALS.password);
    await page.waitForURL(/.*dashboard.*/, { timeout: 45_000 });

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForTimeout(2_000);

    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3_000);

    const notOnDashboard = !page.url().includes('dashboard');
    expect(notOnDashboard).toBe(true);
    console.log('✅ LLL-05 passed: Session cleared — dashboard inaccessible after logout');
  });

});

// ── User Management ───────────────────────────────────────────────────────────

test.describe('Leorix — User Management', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAndGoTo(page, ADMIN_URL);
    console.log('✅ User Management page loaded');
  });

  test('LUM-01: should load User Management page', async ({ page }) => {
    await expect(page).toHaveURL(/.*admin.*users.*/i);
    console.log('✅ LUM-01 passed: User Management page loaded');
  });

  test('LUM-02: should display a list of users', async ({ page }) => {
    const rows = page.locator("table tr, [class*='user'], [class*='member']");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ LUM-02 passed: ${count} user row(s) visible`);
  });

  test('LUM-03: should display the admin user in the list', async ({ page }) => {
    const userVisible = await page.locator('text=info@foundershub.ai')
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    expect(userVisible).toBeTruthy();
    console.log('✅ LUM-03 passed: Admin user visible in list');
  });

  test('LUM-04: should show user management action buttons', async ({ page }) => {
    const actionsExist =
      await page.locator('button').count() > 0 ||
      await page.locator('[role="button"]').count() > 0;
    expect(actionsExist).toBeTruthy();
    console.log('✅ LUM-04 passed: User management action buttons available');
  });

  test('LUM-05: should have search input to filter users', async ({ page }) => {
    const search = page.locator(
      'input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="user" i]'
    ).first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    console.log('✅ LUM-05 passed: User search input visible');
  });

  test('LUM-06: should not show error messages on load', async ({ page }) => {
    for (const msg of ['Something went wrong', 'Failed to load', 'Forbidden', 'Unauthorized']) {
      await expect(page.locator(`text=${msg}`).first()).not.toBeVisible({ timeout: 5_000 });
    }
    console.log('✅ LUM-06 passed: No errors on User Management page');
  });

});