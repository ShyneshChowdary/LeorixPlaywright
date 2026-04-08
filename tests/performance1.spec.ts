import { test, Page, Request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(120_000);

const BASE_URL = 'https://app-dev.foundershub.ai';
const USERNAME = 'info@foundershub.ai';
const PASSWORD = 'Invest@92';

const PAGES_TO_TEST = [
  { name: 'Dashboard',   url: '/dashboard' },
  { name: 'CRM',         url: '/crm' },
  { name: 'Development', url: '/modules?type=development' },
  { name: 'Analytics',   url: '/analytics' },
  { name: 'Settings',    url: '/settings' },
];


const SKIP_PATTERNS = [
  '/monitoring',
  '/assets/',             
  'google-analytics',
  'hotjar', 'sentry', 'crisp', 'intercom', 'segment', 'mixpanel',
];

const API_INCLUDE_PATTERNS = [
  '/api/', '/user/', '/chat/', '/notifications/', '/workspaces/',
  'dev-api.foundershub.ai', 'chat.leorix.ai',
];

interface PageTiming {
  page: string; url: string;
  navigationMs: number; domContentMs: number; fcpMs: number;
  status: 'pass' | 'fail'; error?: string;
}

interface ApiCall {
  method: string; url: string; timestamp: number;
}

interface DuplicateGroup {
  key: string; count: number; timestamps: number[]; gapMs: number[];
  severity: 'CRITICAL' | 'WARNING';
}

interface PageApiReport {
  page: string; totalCalls: number;
  realApiCalls: number; duplicates: DuplicateGroup[];
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`;
  } catch { return rawUrl; }
}

function isNoise(url: string): boolean {
  return SKIP_PATTERNS.some(p => url.includes(p));
}

function isRealApi(url: string, resourceType: string): boolean {
  if (!['fetch', 'xhr', 'other'].includes(resourceType)) return false;
  if (isNoise(url)) return false;
  return API_INCLUDE_PATTERNS.some(p => url.includes(p));
}

function getSeverity(gapMs: number[]): 'CRITICAL' | 'WARNING' {
  return gapMs.some(g => g < 50) ? 'CRITICAL' : 'WARNING';
}

async function measurePageWithApis(
  page: Page, name: string, url: string
): Promise<{ timing: PageTiming; apiReport: PageApiReport }> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const timing: PageTiming = {
    page: name, url: fullUrl,
    navigationMs: 0, domContentMs: 0, fcpMs: 0, status: 'pass',
  };

  const apiCalls: ApiCall[] = [];
  const startTime = Date.now();

  const onRequest = (req: Request) => {
    if (isRealApi(req.url(), req.resourceType())) {
      apiCalls.push({ method: req.method(), url: req.url(), timestamp: Date.now() - startTime });
    }
  };
  page.on('request', onRequest);

  try {
    await page.goto(fullUrl, { waitUntil: 'load', timeout: 60_000 });
    await new Promise(r => setTimeout(r, 1500));

    const t = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        navigationMs: Math.round(nav.loadEventEnd - nav.startTime),
        domContentMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      };
    });
    timing.navigationMs = t.navigationMs;
    timing.domContentMs = t.domContentMs;
    timing.fcpMs = await page.evaluate(() => {
      const e = performance.getEntriesByName('first-contentful-paint');
      return e.length ? Math.round(e[0].startTime) : 0;
    });
  } catch (err: any) {
    timing.status = 'fail';
    timing.error = err.message ?? String(err);
  } finally {
    page.off('request', onRequest);
  }

  const groups: Record<string, ApiCall[]> = {};
  for (const call of apiCalls) {
    const key = `${call.method} ${normalizeUrl(call.url)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(call);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, calls] of Object.entries(groups)) {
    if (calls.length > 1) {
      const timestamps = calls.map(c => c.timestamp);
      const gapMs = timestamps.slice(1).map((ts, i) => ts - timestamps[i]);
      duplicates.push({ key, count: calls.length, timestamps, gapMs, severity: getSeverity(gapMs) });
    }
  }

  duplicates.sort((a, b) =>
    a.severity === b.severity ? b.count - a.count :
    a.severity === 'CRITICAL' ? -1 : 1
  );

  return {
    timing,
    apiReport: { page: name, totalCalls: apiCalls.length, realApiCalls: apiCalls.length, duplicates },
  };
}

function printPerfTable(timings: PageTiming[]) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊  PAGE LOAD PERFORMANCE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`${'Page'.padEnd(18)} ${'Full Load'.padStart(10)} ${'DOMReady'.padStart(10)} ${'FCP'.padStart(8)}  Status`);
  console.log('─'.repeat(62));
  for (const t of timings) {
    const load = t.status === 'fail' ? 'ERROR'         : `${t.navigationMs} ms`;
    const dom  = t.status === 'fail' ? '—'             : `${t.domContentMs} ms`;
    const fcp  = t.fcpMs             ? `${t.fcpMs} ms` : '—';
    const flag = t.status === 'fail'   ? '❌ FAIL'
               : t.navigationMs > 3000 ? '⚠️  SLOW'
               : '✅ OK';
    console.log(`${t.page.padEnd(18)} ${load.padStart(10)} ${dom.padStart(10)} ${fcp.padStart(8)}  ${flag}`);
    if (t.error) console.log(`   ↳ ${t.error}`);
  }
  const passed = timings.filter(t => t.status === 'pass');
  if (passed.length) {
    const avg = Math.round(passed.reduce((s, t) => s + t.navigationMs, 0) / passed.length);
    console.log('─'.repeat(62));
    console.log(`  Avg: ${avg} ms  |  Min: ${Math.min(...passed.map(t => t.navigationMs))} ms  |  Max: ${Math.max(...passed.map(t => t.navigationMs))} ms`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function printDuplicateTable(apiReports: PageApiReport[]) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔁  DUPLICATE API CALLS — REAL BUGS ONLY');
  console.log('  (noise filtered: /monitoring, /assets, analytics SDKs)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let critical = 0, warnings = 0;

  for (const report of apiReports) {
    console.log(`\n  📄 ${report.page}  (${report.realApiCalls} real API calls)`);

    if (report.duplicates.length === 0) {
      console.log('     ✅  No duplicate API calls'); continue;
    }

    for (const dup of report.duplicates) {
      const icon = dup.severity === 'CRITICAL' ? '🔴 CRITICAL' : '🟡 WARNING ';
      console.log(`\n     ${icon}  [×${dup.count}]  ${dup.key}`);
      console.log(`              Called at: ${dup.timestamps.map(t => `+${t}ms`).join(' → ')}`);
      console.log(`              Gaps: ${dup.gapMs.map(g => `${g}ms`).join(', ')}`);

      if (dup.severity === 'CRITICAL') {
        console.log(`⚡ Gap < 50ms = likely React StrictMode double-render or missing dependency in useEffect`);
        critical++;
      } else {
        console.log(` ⚠  Gap < 500ms = possible double useEffect / missing cache / re-mount`);
        warnings++;
      }
    }
  }

  console.log('\n' + '─'.repeat(62));
  console.log(`  🔴 CRITICAL: ${critical}   🟡 WARNING: ${warnings}`);
  if (critical === 0 && warnings === 0) {
    console.log('  ✅  No real duplicate API calls found!');
  } else {
    console.log(`  ❌  Action needed: share duplicate-api-report.json with your dev team`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function saveReports(timings: PageTiming[], apiReports: PageApiReport[]) {
  const outDir = 'test-results';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'performance-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, results: timings }, null, 2)
  );

  const dupSummary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    filteredOut: SKIP_PATTERNS,
    totalDuplicateGroups: apiReports.reduce((s, r) => s + r.duplicates.length, 0),
    pages: apiReports.map(r => ({
      page: r.page,
      realApiCalls: r.realApiCalls,
      duplicateGroups: r.duplicates.length,
      critical: r.duplicates.filter(d => d.severity === 'CRITICAL').length,
      warnings: r.duplicates.filter(d => d.severity === 'WARNING').length,
      duplicates: r.duplicates,
    })),
  };
  fs.writeFileSync(
    path.join(outDir, 'duplicate-api-report.json'),
    JSON.stringify(dupSummary, null, 2)
  );

  console.log(`  💾  Performance report    → test-results/performance-report.json`);
  console.log(`  💾  Duplicate API report  → test-results/duplicate-api-report.json`);
}

test.describe('FoundersHub – Performance + Duplicate API Detection', () => {

  test('Login → measure load times + detect duplicate API calls', async ({ page }) => {
    const timings:    PageTiming[]    = [];
    const apiReports: PageApiReport[] = [];

    console.log('\n⏱  Measuring Login page…');
    const loginResult = await measurePageWithApis(page, 'Login', '/');
    timings.push(loginResult.timing);
    apiReports.push(loginResult.apiReport);

    console.log('🔐  Logging in…');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });

    await page
      .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
      .first().fill(USERNAME);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page
      .locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")')
      .first().click();

    await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 45_000 });
    console.log('✅  Logged in\n');

    for (const { name, url } of PAGES_TO_TEST) {
      console.log(`⏱  Measuring ${name}…`);
      const result = await measurePageWithApis(page, name, url);
      timings.push(result.timing);
      apiReports.push(result.apiReport);

      const dups = result.apiReport.duplicates;
      const crit = dups.filter(d => d.severity === 'CRITICAL').length;
      const warn = dups.filter(d => d.severity === 'WARNING').length;

      if (crit > 0)       console.log(`   🔴 ${crit} CRITICAL duplicate(s) on ${name}`);
      else if (warn > 0)  console.log(`   🟡 ${warn} WARNING duplicate(s) on ${name}`);
      else                console.log(`   ✅ No duplicate real API calls on ${name}`);

      await new Promise(r => setTimeout(r, 300));
    }

    printPerfTable(timings);
    printDuplicateTable(apiReports);
    saveReports(timings, apiReports);

    for (const t of timings) {
      if (t.status === 'fail' && t.error && !t.error.includes('ERR_ABORTED')) {
        throw new Error(`Page "${t.page}" failed to load: ${t.error}`);
      }
    }

    console.log('\n✅  Test complete — check test-results/ for full reports');
  });

});