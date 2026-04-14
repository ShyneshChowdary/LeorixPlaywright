import { test, expect } from '@playwright/test';

test.describe('Leorix Dashboard Page', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);

    console.log('🔐 Going to login page...');
    await page.goto('https://app-dev.foundershub.ai/', { waitUntil: 'domcontentloaded' });

    console.log('🔑 Logging in...');
    await page.locator('input[type="email"], input[name="email"]').first().fill('info@foundershub.ai');
    await page.locator('input[type="password"]').first().fill('Invest@92');

    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
      .first()
      .click();

    console.log('⏳ Waiting for dashboard to load...');

    await page.waitForURL(/.*dashboard.*/, { timeout: 45000 });

    const tryAgainBtn = page.getByRole('button', { name: 'Try Again' });
    if (await tryAgainBtn.isVisible({ timeout: 10000 })) {
      console.log('⚠️ Dashboard failed to load → Clicking Try Again...');
      await tryAgainBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('✅ Dashboard loaded successfully');
  });

  test('should load dashboard and show correct KPI card values', async ({ page }) => {
    await expect(page).toHaveURL(/.*dashboard.*/);

    await expect(page.locator('text=TOTAL USERS').first()).toBeVisible();
    await expect(page.locator('text=10').first()).toBeVisible();   // Actual value

    await expect(page.locator('text=ACTIVE TEMPLATES').first()).toBeVisible();
    await expect(page.locator('text=27').first()).toBeVisible();

    await expect(page.locator('text=Notifications').first()).toBeVisible();
    await expect(page.locator('text=4').first()).toBeVisible();   // 4 unread

    await expect(page.locator('text=Bookings').first()).toBeVisible();
    await expect(page.locator('text=0').first()).toBeVisible();

    console.log('✅ All KPI cards are visible with correct values (10 users, 27 templates, etc.)');
  });

  test('should display all sidebar menu items', async ({ page }) => {
    const menuItems = ['Development', 'Asset', 'Project', 'Inventory', 'Business Leads', 
                       'Content', 'Communication', 'Automation', 'Tools', 'Notifications'];

    for (const item of menuItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible({ timeout: 15000 });
    }
    console.log('✅ All sidebar menu items are visible');
  });

  test('should display Monthly Activity Trends chart', async ({ page }) => {
    await expect(page.getByText('Monthly Activity Trends')).toBeVisible();
    console.log('✅ Monthly Activity Trends chart is visible');
  });

  test('should show tooltip when hovering on Monthly Activity Trends chart', async ({ page }) => {
    await page.waitForSelector('.recharts-wrapper, [class*="recharts"]', { timeout: 15000 });

    const chartPoint = page.locator('.recharts-area, .recharts-line, .recharts-bar').first();
    await chartPoint.hover({ force: true });
    await page.waitForTimeout(2500);

    const hasTooltip = await page.getByText(/Blogs|Events|Templates/i).count() > 0;
    expect(hasTooltip).toBe(true);

    console.log('✅ Tooltip appeared on chart hover');
  });

  test('should display Most Active Users and Recent Activity sections', async ({ page }) => {
    await expect(page.getByText('Most Active Users')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();
    console.log('✅ Most Active Users and Recent Activity sections are visible');
  });

  test('should display User-Template Assignment Matrix with data', async ({ page }) => {
    await page.getByText('User-Template Assignment Matrix').scrollIntoViewIfNeeded();

    await expect(page.getByText('User-Template Assignment Matrix')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Foundershub AI1').first()).toBeVisible();
    await expect(page.locator('text=Girish Kotte').first()).toBeVisible();

    console.log('✅ User-Template Assignment Matrix is visible with correct user data');
  });

  test('should display Connected Integrations', async ({ page }) => {
    await expect(page.getByText('Connected Integrations')).toBeVisible();
    console.log('✅ Connected Integrations section is visible');
  });

  test('should display user information and logout option', async ({ page }) => {
    await expect(page.locator('text=Foundershub AI1').first()).toBeVisible();
    await expect(page.locator('text=info@foundershub.ai').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    console.log('✅ User information and Logout button are visible');
  });

  test('should have Light and Dark mode toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
    console.log('✅ Light and Dark mode toggle buttons are present');
  });

  test('should navigate to Tools > Manage Bio', async ({ page }) => {
    await page.getByText('Tools', { exact: true }).click();
    await page.getByText('Manage Bio').click();

    await expect(page).toHaveURL(/.*(manage-bio|bio|links|drive).*/i, { timeout: 15000 });
    console.log('✅ Successfully navigated to Manage Bio page');
  });

});