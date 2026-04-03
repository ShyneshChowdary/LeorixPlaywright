import { test, expect } from '@playwright/test';

test('Development test', async ({ page }) => {

  await page.goto('https://app-dev.foundershub.ai/login');

  await page.locator('[placeholder="Enter your email"]').fill('info@foundershub.ai');
  await page.locator('[placeholder="Enter your password"]').fill('Invest@92');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/dashboard/);

  await page.getByText('CRM').first().click();
  await page.waitForURL('https://app-dev.foundershub.ai/modules?type=crm');

  //await expect(page.getByText('Ai Analysis').first()).toHaveCount(1);

  await page.getByText('Ai Analysis').first().click();
  await page.waitForURL('https://app-dev.foundershub.ai/metrics/ai-analysis');

  await page.goBack();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/modules?type=crm');

  await expect(page.getByText('List').first()).toHaveCount(1);
  await page.getByText('List').first().click();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/modules?type=crm');

  await page.getByText('Grid').first().click();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/modules?type=crm');

  await page.getByText('Prospects').first().click();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/metrics/7fbb96a7-0b10-46ee-bde4-3e2e50888e70/data');

  await page.getByText('Visualization').first().click();
  await expect(page).toHaveURL('https://app-dev.foundershub.ai/metrics/7fbb96a7-0b10-46ee-bde4-3e2e50888e70/visualizations');

});