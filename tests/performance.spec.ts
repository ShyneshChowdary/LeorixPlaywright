import { test, expect } from '@playwright/test';

const SLOW = 3000;
const FAIL = 8000;

const pages = [
    { name: 'Dashboard', url: 'https://app-dev.foundershub.ai/dashboard'},
    { name: 'CRM', url: 'https://app-dev.foundershub.ai/modules?type=crm'},
    { name: 'Development', url: 'https://app-dev.foundershub.ai/modules?type=development'},
    { name: 'Pages', url: 'https://app-dev.foundershub.ai/pages'},
    { name: 'Mailbox', url: 'https://app-dev.foundershub.ai/mailbox'},
    { name: 'Integrations', url: 'https://app-dev.foundershub.ai/settings/integrations'},
    { name: 'profile', url: 'https://app-dev.foundershub.ai/settings?tab=personal'},
];

const BASE_URL = 'https://app-dev.foundershub.ai';

test.describe('Performance Tests', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"]', 'info@foundershub.ai');
    await page.fill('input[name="password"]', 'Invest@92');

    const loginStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    await page.waitForLoadState('networkidle');

  const loginTime = Date.now() - loginStart;
  console.log(`Login → Dashboard: ${loginTime} ms`);

  expect(page.url()).toContain('/dashboard');

  for (const p of page) {
    const url = `${BASE_URL}${p.path}`;

    const start = Date.now();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const time = Date.now() - start;

    let status = 'PASS';
    if (time > FAIL) status = 'FAIL';
    else if (time > SLOW) status = 'SLOW';

    console.log(`${status} ${p.name}: ${time} ms`);
  }
}); 