import { test, expect } from '@playwright/test';

test('Development test', async ({ page }) => {

  await page.goto('https://app-dev.foundershub.ai/login');

  await page.locator('[placeholder="Enter your email"]').fill('info@foundershub.ai');
  await page.locator('[placeholder="Enter your password"]').fill('Invest@92');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/dashboard/);

  await page.getByText('CRM').first().click();
  await page.waitForURL('**https://app-dev.foundershub.ai/modules?type=crm');

  await expect(page.getByText('Ai Analysis').first()).toHaveCount(1);

  await page.getByText('Ai Analysis').first().click();
  await page.waitForURL('**https://app-dev.foundershub.ai/metrics/ai-analysis');

  await expect(page.getByText('Data Quality Heat Map').first()).toHaveCount(1);

});