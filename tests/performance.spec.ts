import { test, expect } from '@playwright/test';

const SLOW = 3000;
const FAIL = 8000;

const pages = [
  { name: 'Dashboard', url: 'https://app-dev.foundershub.ai/dashboard' },
  { name: 'CRM', url: 'https://app-dev.foundershub.ai/modules?type=crm' },
  { name: 'Development', url: 'https://app-dev.foundershub.ai/modules?type=development' },
  { name: 'Pages', url: 'https://app-dev.foundershub.ai/pages' },
  { name: 'Mailbox', url: 'https://app-dev.foundershub.ai/mailbox' },
  { name: 'Integrations', url: 'https://app-dev.foundershub.ai/settings/integrations' },
  { name: 'Profile', url: 'https://app-dev.foundershub.ai/settings?tab=personal' },
];

test.describe('Performance Tests', () => {

  test('Check performance', async ({ page }) => {

    await page.goto('https://app-dev.foundershub.ai/login');

    await page.fill('input[name="email"]', 'info@foundershub.ai');
    await page.fill('input[name="password"]', 'Invest@92');

    const loginStart = Date.now();

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    await page.waitForLoadState('networkidle');

    const loginTime = Date.now() - loginStart;
    console.log(`Login → Dashboard: ${loginTime} ms`);

    expect(page.url()).toContain('/dashboard');

    for (const p of pages) {
      const start = Date.now();

      try {
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: FAIL + 2000 });

        const time = Date.now() - start;

        let status = 'PASS';
        if (time > FAIL) status = 'FAIL';
        else if (time > SLOW) status = 'SLOW';

        console.log(`${status} ${p.name}: ${time} ms`);

      } catch (error) {
        console.log(`FAIL ${p.name}: Timeout/Error`);
      }
    }

  });

});