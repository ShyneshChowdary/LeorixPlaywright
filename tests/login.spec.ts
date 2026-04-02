import { test, expect } from '@playwright/test';

test('Login test', async ({ page }) => {
  await page.goto('https://app-dev.foundershub.ai/login');

  await page.locator('[placeholder="Enter your email"]').fill('info@foundershub.ai');
  await page.locator('[placeholder="Enter your password"]').fill('Invest@92');
  await page.getByRole('button', { name: 'Sign in' }).click();
});





///npx playwright test tests/login.spec.ts --project=chromium --headed