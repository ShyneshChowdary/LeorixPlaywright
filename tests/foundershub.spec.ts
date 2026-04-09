import { test, Page, Request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.setTimeout(180_000);

const BASE_URL = "https://app-dev.foundershub.ai";

const CREDENTIALS = { email: "info@foundershub.ai",  password: "Invest@92", };

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

const NOISE_PATTERNS = [
  "/monitoring",
  "/assets/",
  "google-analytics",
  "hotjar",
  "sentry",
  "intercom",
  "segment",
  "mixpanel",
  "crisp",
];

const API_DOMAINS = [
  "dev-api.foundershub.ai",
  "chat.leorix.ai",
];

const API_PATH_PATTERNS = [
  "/api/",
  "/user/",
  "/chat/",
  "/notifications/",
  "/workspaces/",
];

const THRESHOLDS = {
  slowMs:     3000,
  criticalMs: 5000,
  dupGapCriticalMs: 50,
  dupGapWarningMs:  500,
  deferredWaitMs:   1500,
};


interface PageTimingResult {
  name:         string;
  url:          string;
  fullLoadMs:   number;
  domReadyMs:   number;
  fcpMs:        number;
  status:       "pass" | "slow" | "fail";
  error?:       string;
}

interface ApiCallRecord {
  method:      string;
  url:         string;
  timestampMs: number;
}

interface DuplicateGroup {
  key:        string;
  count:      number;
  timestamps: number[];
  gapsMs:     number[];
  severity:   "critical" | "warning";
}

interface PageApiResult {
  name:           string;
  totalApiCalls:  number;
  duplicates:     DuplicateGroup[];
}

interface FullReport {
  generatedAt:  string;
  baseUrl:      string;
  timings:      PageTimingResult[];
  apiResults:   PageApiResult[];
}


function isNoise(url: string): boolean {
  return NOISE_PATTERNS.some((pattern) => url.includes(pattern));
}

function isTrackedApiCall(url: string, resourceType: string): boolean {
  if (!["fetch", "xhr", "other"].includes(resourceType)) return false;
  if (isNoise(url)) return false;
  const matchesDomain  = API_DOMAINS.some((d) => url.includes(d));
  const matchesPath    = API_PATH_PATTERNS.some((p) => url.includes(p));
  return matchesDomain || matchesPath;
}

function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

function classifyDuplicateSeverity(gapsMs: number[]): "critical" | "warning" {
  return gapsMs.some((g) => g < THRESHOLDS.dupGapCriticalMs) ? "critical" : "warning";
}

function classifyPageStatus(loadMs: number): "pass" | "slow" | "fail" {
  if (loadMs >= THRESHOLDS.criticalMs) return "fail";
  if (loadMs >= THRESHOLDS.slowMs)     return "slow";
  return "pass";
}


async function collectNavigationTiming(page: Page): Promise<{ fullLoadMs: number; domReadyMs: number }> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      fullLoadMs: Math.round(nav.loadEventEnd - nav.startTime),
      domReadyMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    };
  });
}

async function collectFcp(page: Page): Promise<number> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByName("first-contentful-paint");
    return entries.length ? Math.round(entries[0].startTime) : 0;
  });
}

function findDuplicates(calls: ApiCallRecord[]): DuplicateGroup[] {
  const grouped: Record<string, ApiCallRecord[]> = {};

  for (const call of calls) {
    const key = `${call.method} ${normalizeUrl(call.url)}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(call);
  }

  const duplicates: DuplicateGroup[] = [];

  for (const [key, records] of Object.entries(grouped)) {
    if (records.length < 2) continue;

    const timestamps = records.map((r) => r.timestampMs);
    const gapsMs     = timestamps.slice(1).map((ts, i) => ts - timestamps[i]);

    duplicates.push({
      key,
      count:     records.length,
      timestamps,
      gapsMs,
      severity:  classifyDuplicateSeverity(gapsMs),
    });
  }

  return duplicates.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return b.count - a.count;
  });
}

async function measurePage(
  page:     Page,
  name:     string,
  pageUrl:  string
): Promise<{ timing: PageTimingResult; apiResult: PageApiResult }> {
  const fullUrl   = pageUrl.startsWith("http") ? pageUrl : `${BASE_URL}${pageUrl}`;
  const apiCalls: ApiCallRecord[] = [];
  const startMs   = Date.now();

  const requestHandler = (req: Request) => {
    if (isTrackedApiCall(req.url(), req.resourceType())) {
      apiCalls.push({
        method:      req.method(),
        url:         req.url(),
        timestampMs: Date.now() - startMs,
      });
    }
  };

  page.on("request", requestHandler);

  const timing: PageTimingResult = {
    name,
    url:        fullUrl,
    fullLoadMs: 0,
    domReadyMs: 0,
    fcpMs:      0,
    status:     "pass",
  };

  try {
    await page.goto(fullUrl, { waitUntil: "load", timeout: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, THRESHOLDS.deferredWaitMs));

    const navTiming  = await collectNavigationTiming(page);
    timing.fullLoadMs = navTiming.fullLoadMs;
    timing.domReadyMs = navTiming.domReadyMs;
    timing.fcpMs      = await collectFcp(page);
    timing.status     = classifyPageStatus(timing.fullLoadMs);

  } catch (err: unknown) {
    timing.status = "fail";
    timing.error  = err instanceof Error ? err.message : String(err);
  } finally {
    page.off("request", requestHandler);
  }

  const apiResult: PageApiResult = {
    name,
    totalApiCalls: apiCalls.length,
    duplicates:    findDuplicates(apiCalls),
  };

  return { timing, apiResult };
}

async function performLogin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "load" });

  await page
    .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
    .first()
    .fill(CREDENTIALS.email);

  await page
    .locator('input[type="password"]')
    .first()
    .fill(CREDENTIALS.password);

  await page
    .locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")')
    .first()
    .click();

  await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 45_000 });
}


function printPerformanceTable(timings: PageTimingResult[]): void {
  const LINE = "─".repeat(68);
  const HEAVY = "━".repeat(68);

  console.log(`\n${HEAVY}`);
  console.log("  📊  PAGE LOAD PERFORMANCE REPORT");
  console.log(HEAVY);
  console.log(
    `${"Page".padEnd(20)} ${"Full Load".padStart(10)} ${"DOM Ready".padStart(10)} ${"FCP".padStart(8)}  Status`
  );
  console.log(LINE);

  for (const t of timings) {
    const load   = t.status === "fail" ? "ERROR"          : `${t.fullLoadMs} ms`;
    const dom    = t.status === "fail" ? "—"              : `${t.domReadyMs} ms`;
    const fcp    = t.fcpMs             ? `${t.fcpMs} ms`  : "—";
    const status =
      t.status === "fail" ? "❌  FAIL" :
      t.status === "slow" ? "⚠️   SLOW" :
      "✅  OK";

    console.log(
      `${t.name.padEnd(20)} ${load.padStart(10)} ${dom.padStart(10)} ${fcp.padStart(8)}  ${status}`
    );
    if (t.error) console.log(`   ↳ ${t.error}`);
  }

  const passed = timings.filter((t) => t.status !== "fail");
  if (passed.length) {
    const avg = Math.round(passed.reduce((s, t) => s + t.fullLoadMs, 0) / passed.length);
    const min = Math.min(...passed.map((t) => t.fullLoadMs));
    const max = Math.max(...passed.map((t) => t.fullLoadMs));
    console.log(LINE);
    console.log(`  Avg: ${avg} ms  |  Min: ${min} ms  |  Max: ${max} ms`);
  }

  console.log(`${HEAVY}\n`);
}

function printDuplicateApiTable(apiResults: PageApiResult[]): void {
  const LINE  = "─".repeat(68);
  const HEAVY = "━".repeat(68);

  console.log(`\n${HEAVY}`);
  console.log("  🔁  DUPLICATE API CALLS REPORT  (noise filtered)");
  console.log(HEAVY);

  let criticalCount = 0;
  let warningCount  = 0;

  for (const result of apiResults) {
    console.log(`\n  📄 ${result.name}  (${result.totalApiCalls} API calls tracked)`);

    if (result.duplicates.length === 0) {
      console.log("     ✅  No duplicate API calls detected");
      continue;
    }

    for (const dup of result.duplicates) {
      const icon = dup.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING ";
      console.log(`\n     ${icon}  [×${dup.count}]  ${dup.key}`);
      console.log(`              Timestamps : ${dup.timestamps.map((t) => `+${t}ms`).join(" → ")}`);
      console.log(`              Gaps       : ${dup.gapsMs.map((g) => `${g}ms`).join(", ")}`);

      if (dup.severity === "critical") {
        console.log("              Cause      : Likely React StrictMode double-render or missing useEffect dependency");
        criticalCount++;
      } else {
        console.log("              Cause      : Likely two components fetching independently — move to shared context");
        warningCount++;
      }
    }
  }

  console.log(`\n${LINE}`);
  console.log(`  🔴 Critical: ${criticalCount}   🟡 Warning: ${warningCount}`);

  if (criticalCount === 0 && warningCount === 0) {
    console.log("  ✅  No duplicate API calls found across any page");
  } else {
    console.log("  ℹ️   Share duplicate-api-report.json with the dev team for fixes");
  }

  console.log(`${HEAVY}\n`);
}

function saveReports(report: FullReport): void {
  const outputDir = "test-results";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const perfPath = path.join(outputDir, "performance-report.json");
  fs.writeFileSync(
    perfPath,
    JSON.stringify({ generatedAt: report.generatedAt, baseUrl: report.baseUrl, results: report.timings }, null, 2)
  );

  const dupReport = {
    generatedAt:         report.generatedAt,
    baseUrl:             report.baseUrl,
    filteredPatterns:    NOISE_PATTERNS,
    totalDuplicateGroups: report.apiResults.reduce((s, r) => s + r.duplicates.length, 0),
    pages: report.apiResults.map((r) => ({
      page:           r.name,
      totalApiCalls:  r.totalApiCalls,
      duplicateCount: r.duplicates.length,
      critical:       r.duplicates.filter((d) => d.severity === "critical").length,
      warnings:       r.duplicates.filter((d) => d.severity === "warning").length,
      duplicates:     r.duplicates,
    })),
  };

  const dupPath = path.join(outputDir, "duplicate-api-report.json");
  fs.writeFileSync(dupPath, JSON.stringify(dupReport, null, 2));

  console.log(`  💾  Performance report    →  ${perfPath}`);
  console.log(`  💾  Duplicate API report  →  ${dupPath}`);
}


test.describe("FoundersHub — Performance & Duplicate API Suite", () => {

  test("Full site audit: page load timings + duplicate API detection", async ({ page }) => {
    const timings:    PageTimingResult[] = [];
    const apiResults: PageApiResult[]    = [];

    console.log("\n🔐  Logging in to FoundersHub...");
    await performLogin(page);
    console.log("✅  Login successful\n");

    for (const { name, url } of PAGES) {
      console.log(`⏱   Measuring → ${name}`);

      const { timing, apiResult } = await measurePage(page, name, url);

      timings.push(timing);
      apiResults.push(apiResult);

      const dupCount  = apiResult.duplicates.length;
      const critCount = apiResult.duplicates.filter((d) => d.severity === "critical").length;

      if (critCount > 0) {
        console.log(`    🔴  ${critCount} critical duplicate(s)`);
      } else if (dupCount > 0) {
        console.log(`    🟡  ${dupCount} warning duplicate(s)`);
      } else {
        console.log(`    ✅  No duplicates`);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    printPerformanceTable(timings);
    printDuplicateApiTable(apiResults);

    const report: FullReport = {
      generatedAt: new Date().toISOString(),
      baseUrl:     BASE_URL,
      timings,
      apiResults,
    };

    saveReports(report);

    for (const t of timings) {
      if (t.status === "fail" && t.error && !t.error.includes("ERR_ABORTED")) {
        throw new Error(`Page "${t.name}" failed to load: ${t.error}`);
      }
    }

    console.log("\n✅  Audit complete — reports saved to test-results/\n");
  });

});