import { test, expect } from '@playwright/test';

test.describe('Tryout page performance', () => {
  test('measures load performance on /tryout', async ({ page }) => {
    // Collect all network requests
    const requests: { url: string; method: string; status: number; timing?: number }[] = [];

    page.on('request', (req) => {
      if (req.url().includes('localhost:3000')) {
        requests.push({
          url: req.url().replace('http://localhost:3000', ''),
          method: req.method(),
          status: 0,
        });
      }
    });

    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('localhost:3000')) {
        const entry = requests.find((r) => r.url === url.replace('http://localhost:3000', ''));
        if (entry) {
          entry.status = res.status();
          // Get timing from performance entries
        }
      }
    });

    // Navigate and measure
    const startTime = Date.now();
    await page.goto('/tryout', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log(`\n=== Page Load: ${loadTime}ms ===`);

    // Get performance entries from the browser
    const perfEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((e) => ({
        name: e.name.replace('http://localhost:3000', ''),
        duration: Math.round(e.duration),
        startTime: Math.round(e.startTime),
        transferSize: Math.round(e.transferSize / 1024) + 'KB',
      }));
    });

    // Filter to just our API calls
    const apiCalls = perfEntries.filter((e) => e.name.startsWith('/api/'));

    console.log('\n=== API Calls (order by start time) ===');
    for (const call of apiCalls) {
      const bar = '█'.repeat(Math.max(1, Math.round(call.duration / 50)));
      console.log(
        `  ${call.startTime.toString().padStart(5)}ms  ${call.duration.toString().padStart(5)}ms  ${call.transferSize.padStart(6)}  ${call.name}  ${bar}`
      );
    }

    // Get DOM content loaded timing
    const domTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        domComplete: Math.round(nav.domComplete - nav.startTime),
        loadEvent: Math.round(nav.loadEventEnd - nav.startTime),
        domInteractive: Math.round(nav.domInteractive - nav.startTime),
      };
    });

    console.log('\n=== DOM Timing ===');
    console.log(`  DOM Interactive:  ${domTiming.domInteractive}ms`);
    console.log(`  DOM Content Loaded: ${domTiming.domContentLoaded}ms`);
    console.log(`  DOM Complete:     ${domTiming.domComplete}ms`);
    console.log(`  Load Event:       ${domTiming.loadEvent}ms`);

    // Check for any failed requests
    const failedRequests = requests.filter((r) => r.status >= 400);
    if (failedRequests.length > 0) {
      console.log('\n=== Failed Requests ===');
      for (const req of failedRequests) {
        console.log(`  ${req.status} ${req.method} ${req.url}`);
      }
    }

    // Slowest API call
    const slowest = apiCalls.reduce(
      (max, c) => (c.duration > max.duration ? c : max),
      { duration: 0, name: 'none' }
    );
    if (slowest.name !== 'none') {
      console.log(`\n=== Slowest: ${slowest.name} (${slowest.duration}ms) ===`);
    }

    // Assert page loaded
    await expect(page.getByRole('heading', { name: /Tryout SKD/i })).toBeVisible();
  });
});
