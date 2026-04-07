import { test, expect } from '@playwright/test';

test('Development test', async ({ page }) => {

  await page.goto('https://app-dev.foundershub.ai/login');

  await page.locator('[placeholder="Enter your email"]').fill('info@foundershub.ai');
  await page.locator('[placeholder="Enter your password"]').fill('Invest@92');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/dashboard/);

  await expect(page.getByText('Development').first()).toHaveCount(1);

  await page.getByText('Development').first().click();
  await page.waitForURL('**https://app-dev.foundershub.ai/modules?type=development');

  await page.goBack();
  await expect(page).toHaveURL(/dashboard/);

  await page.getByText('Development').first().click();
  await page.waitForURL('**https://app-dev.foundershub.ai/modules?type=development');

  await expect(page.getByText('Bug Tracker').first()).toHaveCount(1);

  await page.getByText('Bug Tracker').first().click();
  await page.waitForURL('**https://app-dev.foundershub.ai/metrics/c810aabe-a032-435d-876f-73d12d3b274f/data')

  await page.goBack();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/modules?type=development');

  await page.getByText('Analytics').first().click();

});