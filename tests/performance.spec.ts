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
  { name: 'Workflows', url: 'https://app-dev.foundershub.ai/workflows' },
  { name: 'Notifications', url: 'https://app-dev.foundershub.ai/notifications' },
  { name: 'Documents', url: 'https://app-dev.foundershub.ai/settings?tab=documents' },
  { name: 'User Management', url: 'https://app-dev.foundershub.ai/admin/users' },
];

test.describe('Performance + API Tests', () => {

  test('Check performance and duplicate APIs', async ({ page }) => {

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

      const apiCalls = new Map<string, number>(); // store API calls

      page.on('request', (request) => {
        const url = request.url();

        if (url.includes('/api')) {
          apiCalls.set(url, (apiCalls.get(url) || 0) + 1);
        }
      });

      const start = Date.now();

      try {
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: FAIL + 2000 });

        const time = Date.now() - start;

        let status = 'PASS';
        if (time > FAIL) status = 'FAIL';
        else if (time > SLOW) status = 'SLOW';

        console.log(`\n${status} ${p.name}: ${time} ms`);

        let hasDuplicates = false;

        for (const [url, count] of apiCalls.entries()) {
          if (count > 1) {
            hasDuplicates = true;
            console.log(` Duplicate API: ${url} → called ${count} times`);
          }
        }

        if (!hasDuplicates) {
          console.log(' ✅ No duplicate API calls');
        }

      } catch (error) {
        console.log(`FAIL ${p.name}: Timeout/Error`);
      }
      page.removeAllListeners('request');
    }

  });

});