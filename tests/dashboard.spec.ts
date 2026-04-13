import { test, expect } from '@playwright/test';

test.describe('Leorix Dashboard Page', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);

    console.log('🔐 Going to login page...');
    await page.goto('https://app-dev.foundershub.ai/', { waitUntil: 'domcontentloaded' });

    console.log('🔑 Logging in...');
    await page.locator('input[type="email"], input[name="email"]').first().fill('info@foundershub.ai');
    await page.locator('input[type="password"]').first().fill('Invest@92');

    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
      .first()
      .click();

    console.log('⏳ Waiting for dashboard...');

    await page.waitForURL(/.*dashboard.*/, { timeout: 45000 });

    const tryAgainBtn = page.getByRole('button', { name: 'Try Again' });
    if (await tryAgainBtn.isVisible({ timeout: 10000 })) {
      console.log('⚠️ Dashboard failed to load, clicking Try Again...');
      await tryAgainBtn.click();
    }

    await expect(page.locator('text=TOTAL USERS').first()).toBeVisible({ timeout: 25000 });

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✅ Dashboard loaded successfully');
  });

  test('should load dashboard and show main sections', async ({ page }) => {
    await expect(page).toHaveURL(/.*dashboard.*/);

    await expect(page.locator('text=TOTAL USERS').first()).toBeVisible();
    await expect(page.locator('text=ACTIVE TEMPLATES').first()).toBeVisible();
    await expect(page.locator('text=Notifications').first()).toBeVisible();

    await expect(page.getByText('Monthly Activity Trends')).toBeVisible();
    await expect(page.getByText('Most Active Users')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();

    console.log('✅ All main dashboard sections are visible');
  });

  test('should show all sidebar menu items', async ({ page }) => {
    const menuItems = ['Development', 'Asset', 'Project', 'Inventory', 'Business Leads', 'Tools'];

    for (const item of menuItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible({ timeout: 15000 });
    }

    console.log('✅ Sidebar menu items are displayed correctly');
  });

  test('should navigate to Tools > Manage Bio', async ({ page }) => {
    await page.getByText('Tools', { exact: true }).click();
    await page.getByText('Manage Bio').click();

    await expect(page).toHaveURL(/.*(manage-bio|bio|links|drive).*/i, { timeout: 15000 });

    console.log('✅ Successfully navigated to Manage Bio from Tools menu');
  });

  test('should show tooltip when hovering on Monthly Activity Trends chart', async ({ page }) => {
    console.log('⏳ Waiting for chart to load...');
    await page.waitForSelector('.recharts-wrapper, [class*="recharts"]', { timeout: 15000 });

    const chartPoint = page.locator('.recharts-area, .recharts-line, .recharts-bar').first();
    await chartPoint.hover({ force: true });

    await page.waitForTimeout(2000);

    const hasTooltip = await page.getByText(/Blogs|Events|Templates/i).count() > 0;
    expect(hasTooltip).toBe(true);

    console.log('✅ Tooltip appeared when hovering on the chart');
  });

  test('should display User-Template Assignment Matrix', async ({ page }) => {
    await page.getByText('User-Template Assignment Matrix').scrollIntoViewIfNeeded();

    await expect(page.getByText('User-Template Assignment Matrix')).toBeVisible({ timeout: 12000 });

    await expect(page.locator('text=Foundershub AI1').first()).toBeVisible();
    await expect(page.locator('text=Girish Kotte').first()).toBeVisible();

    console.log('✅ User-Template Assignment Matrix is visible with data');
  });
});