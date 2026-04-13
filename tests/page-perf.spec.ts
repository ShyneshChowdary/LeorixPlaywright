import { test, expect, Page, Request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://app-dev.foundershub.ai";
const API_URL  = "https://dev-api.foundershub.ai";

const CREDENTIALS = {
  email: "info@foundershub.ai",
  password: "Invest@92",
};

const PAGES = [
  { name: "Dashboard",       url: "/dashboard" },
  { name: "CRM",             url: "/modules?type=crm" },
  { name: "Development",     url: "/modules?type=development" },
  { name: "Pages",           url: "/pages" },
  { name: "Mailbox",         url: "/mailbox" },
  { name: "Integrations",    url: "/settings/integrations" },
  { name: "Profile",         url: "/settings?tab=personal" },
  { name: "Workflows",       url: "/workflows" },
  { name: "Notifications",   url: "/notifications" },
  { name: "Documents",       url: "/settings?tab=documents" },
  { name: "User Management", url: "/admin/users" },
];

const RATE_LIMIT_ENDPOINTS = [
  { name: "User Details",        path: "/user/user_details/" },
  { name: "Notifications Count", path: "/api/notifications/unread_count/" },
  { name: "Workspaces",          path: "/user/workspaces/" },
];

const NOISE_PATTERNS = [
  "/monitoring", "/assets/", "google-analytics", "hotjar", "sentry",
  "crisp", "intercom", "segment", "mixpanel"
];

const API_MATCH_PATTERNS = [
  "/api/", "/user/", "/chat/", "/notifications/", "/workspaces/",
  "dev-api.foundershub.ai", "chat.leorix.ai"
];

const THRESHOLDS = {
  slowPageMs: 3000,
  failPageMs: 8000,
  criticalDuplicateGap: 50,
  rateLimitRequests: 60,
};

interface PageTiming {
  name: string;
  url: string;
  fullLoadMs: number;
  domReadyMs: number;
  fcpMs: number;
  status: "pass" | "slow" | "fail";
  error?: string;
}

interface ApiCall {
  method: string;
  url: string;
  timestampMs: number;
}

interface DuplicateGroup {
  key: string;
  count: number;
  timestamps: number[];
  gapsMs: number[];
  severity: "CRITICAL" | "WARNING";
}

interface PageApiResult {
  name: string;
  totalApiCalls: number;
  duplicates: DuplicateGroup[];
}

interface RateLimitResult {
  endpoint: string;
  totalRequests: number;
  got429: boolean;
  first429At: number | null;
  verdict: "PROTECTED" | "UNPROTECTED";
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return rawUrl;
  }
}

function isNoise(url: string): boolean {
  return NOISE_PATTERNS.some(p => url.includes(p));
}

function isRealApiCall(url: string, resourceType: string): boolean {
  if (!["fetch", "xhr", "other"].includes(resourceType)) return false;
  if (isNoise(url)) return false;
  return API_MATCH_PATTERNS.some(p => url.includes(p));
}

function getDuplicateSeverity(gaps: number[]): "CRITICAL" | "WARNING" {
  return gaps.some(g => g < THRESHOLDS.criticalDuplicateGap) ? "CRITICAL" : "WARNING";
}

async function measurePage(page: Page, name: string, url: string) {
  const fullUrl = `${BASE_URL}${url}`;
  const apiCalls: ApiCall[] = [];
  const startTime = Date.now();

  const onRequest = (req: Request) => {
    if (isRealApiCall(req.url(), req.resourceType())) {
      apiCalls.push({
        method: req.method(),
        url: req.url(),
        timestampMs: Date.now() - startTime
      });
    }
  };

  page.on("request", onRequest);

  const timing: PageTiming = {
    name,
    url: fullUrl,
    fullLoadMs: 0,
    domReadyMs: 0,
    fcpMs: 0,
    status: "pass"
  };

  try {
    await page.goto(fullUrl, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1500);

    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        fullLoadMs: Math.round(nav.loadEventEnd - nav.startTime),
        domReadyMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      };
    });

    timing.fullLoadMs = perfData.fullLoadMs;
    timing.domReadyMs = perfData.domReadyMs;

    timing.fcpMs = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint");
      return fcp.length ? Math.round(fcp[0].startTime) : 0;
    });

    if (timing.fullLoadMs >= THRESHOLDS.failPageMs) timing.status = "fail";
    else if (timing.fullLoadMs >= THRESHOLDS.slowPageMs) timing.status = "slow";

  } catch (err: any) {
    timing.status = "fail";
    timing.error = err.message;
  } finally {
    page.off("request", onRequest);
  }

  const duplicates = findDuplicates(apiCalls);

  return { timing, apiResult: { name, totalApiCalls: apiCalls.length, duplicates } };
}

function findDuplicates(calls: ApiCall[]): DuplicateGroup[] {
  const groups: Record<string, ApiCall[]> = {};

  calls.forEach(call => {
    const key = `${call.method} ${normalizeUrl(call.url)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(call);
  });

  const duplicates: DuplicateGroup[] = [];

  Object.entries(groups).forEach(([key, records]) => {
    if (records.length < 2) return;
    const timestamps = records.map(r => r.timestampMs);
    const gapsMs = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    duplicates.push({
      key,
      count: records.length,
      timestamps,
      gapsMs,
      severity: getDuplicateSeverity(gapsMs)
    });
  });

  return duplicates.sort((a, b) => a.severity === "CRITICAL" ? -1 : 1);
}

function printPerformanceTable(timings: PageTiming[]) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📊  PAGE LOAD PERFORMANCE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Page                    Full Load     DOM Ready       FCP    Status`);
  console.log(`──────────────────────────────────────────────────────────────────────`);

  let total = 0;
  let count = 0;
  let minLoad = Infinity;
  let maxLoad = 0;

  timings.forEach(t => {
    const loadStr = t.status === "fail" ? "ERROR" : `${t.fullLoadMs} ms`;
    const domStr  = t.status === "fail" ? "—" : `${t.domReadyMs} ms`;
    const fcpStr  = t.fcpMs > 0 ? `${t.fcpMs} ms` : "—";
    const status  = t.status === "fail" ? "❌ FAIL" : t.fullLoadMs > 3000 ? "⚠️ SLOW" : "✅ OK";

    console.log(
      `${t.name.padEnd(22)} ${loadStr.padStart(12)} ${domStr.padStart(12)} ${fcpStr.padStart(8)}  ${status}`
    );

    if (t.status !== "fail") {
      total += t.fullLoadMs;
      count++;
      minLoad = Math.min(minLoad, t.fullLoadMs);
      maxLoad = Math.max(maxLoad, t.fullLoadMs);
    }
  });

  console.log(`──────────────────────────────────────────────────────────────────────`);

  if (count > 0) {
    const avg = Math.round(total / count);
    console.log(`  Avg: ${avg} ms | Min: ${minLoad} ms | Max: ${maxLoad} ms`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

async function testRateLimiting(page: Page) {
  console.log(`\n🚦 Starting Rate Limiting Test...\n`);

  const apiContext = page.context().request;
  const results: RateLimitResult[] = [];

  for (const ep of RATE_LIMIT_ENDPOINTS) {
    console.log(`   Probing → ${ep.name}`);

    let got429 = false;
    let first429At = null;
    let sent = 0;

    for (let i = 1; i <= THRESHOLDS.rateLimitRequests; i++) {
      try {
        const res = await apiContext.get(`${API_URL}${ep.path}`, { timeout: 10000 });
        sent++;

        if (res.status() === 429) {
          got429 = true;
          first429At = i;
          break;
        }
      } catch {
        break;
      }
    }

    const verdict = got429 ? "PROTECTED" : "UNPROTECTED";
    results.push({ endpoint: ep.name, totalRequests: sent, got429, first429At, verdict });

    if (got429) {
      console.log(`   ✅ Rate limited at request #${first429At}`);
    } else {
      console.log(`   ❌ No 429 after ${sent} requests — UNPROTECTED`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  🚦 RATE LIMITING SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  results.forEach(r => {
    const status = r.got429 ? "✅ PROTECTED" : "❌ UNPROTECTED";
    console.log(`  ${r.endpoint.padEnd(25)} → ${status} (${r.totalRequests} requests)`);
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

test.describe("FoundersHub — Full Site Audit", () => {

  test("Page load performance + duplicate API detection", async ({ page }) => {
    test.setTimeout(180_000);

    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(CREDENTIALS.email);
    await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
    await page.locator('button[type="submit"], button:has-text("Login")').first().click();
    await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 45000 });
    console.log("✅ Login successful\n");

    const timings: PageTiming[] = [];
    const apiResults: PageApiResult[] = [];

    for (const p of PAGES) {
      console.log(`⏱ Measuring → ${p.name}`);
      const { timing, apiResult } = await measurePage(page, p.name, p.url);

      timings.push(timing);
      apiResults.push(apiResult);

      const critical = apiResult.duplicates.filter(d => d.severity === "CRITICAL").length;
      if (critical > 0) {
        console.log(`    🔴 ${critical} critical duplicate(s)`);
      } else {
        console.log(`    ✅ No critical duplicates`);
      }

      await page.waitForTimeout(400);
    }

    printPerformanceTable(timings);
    await testRateLimiting(page);

    console.log("✅ Performance audit completed successfully!\n");
  });
});