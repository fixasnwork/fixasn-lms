import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'sm', width: 640, height: 900 },
  { name: 'md', width: 768, height: 900 },
  { name: 'lg', width: 1024, height: 900 },
  { name: 'xl', width: 1280, height: 900 },
];

const adminPaths = ['/admin', '/admin/soal', '/admin/payments', '/admin/settings', '/admin/landing'];

for (const viewport of viewports) {
  test.describe(`Admin responsive smoke (${viewport.name})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
    });

    for (const path of adminPaths) {
      test(`renders ${path} without horizontal overflow`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' });

        const currentPath = new URL(page.url()).pathname;
        if (currentPath.startsWith('/login')) {
          throw new Error(
            'Admin route redirected to /login. Set PLAYWRIGHT_STORAGE_STATE to an authenticated admin storage file before running this spec.'
          );
        }

        await expect(page).toHaveURL(new RegExp(`^.*${path.replace('/', '\\/')}`));

        const hasHorizontalOverflow = await page.evaluate(() => {
          const body = document.body;
          const html = document.documentElement;
          return (
            body.scrollWidth > body.clientWidth + 1 ||
            html.scrollWidth > html.clientWidth + 1
          );
        });

        expect(hasHorizontalOverflow).toBe(false);
      });
    }
  });
}
