# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-responsive.spec.ts >> Admin responsive smoke (sm) >> renders /admin/landing without horizontal overflow
- Location: e2e/admin-responsive.spec.ts:20:11

# Error details

```
Error: Admin route redirected to /login. Set PLAYWRIGHT_STORAGE_STATE to an authenticated admin storage file before running this spec.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e13]:
    - generic [ref=e14]:
      - img "FIX ASN" [ref=e17]
      - heading "Masuk ke FIX ASN" [level=2] [ref=e18]
      - paragraph [ref=e19]: Gunakan akun Google untuk melanjutkan
    - generic [ref=e20]:
      - button "Lanjutkan dengan Google" [ref=e21] [cursor=pointer]:
        - img [ref=e22]
        - text: Lanjutkan dengan Google
      - paragraph [ref=e27]:
        - text: Dengan masuk, kamu menyetujui
        - strong [ref=e28]: Syarat & Ketentuan
        - text: FIX ASN.
        - text: Butuh bantuan?
        - link "Chat WhatsApp" [ref=e29] [cursor=pointer]:
          - /url: https://wa.me/628987608379
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const viewports = [
  4  |   { name: 'sm', width: 640, height: 900 },
  5  |   { name: 'md', width: 768, height: 900 },
  6  |   { name: 'lg', width: 1024, height: 900 },
  7  |   { name: 'xl', width: 1280, height: 900 },
  8  | ];
  9  | 
  10 | const adminPaths = ['/admin', '/admin/soal', '/admin/payments', '/admin/settings', '/admin/landing'];
  11 | 
  12 | for (const viewport of viewports) {
  13 |   test.describe(`Admin responsive smoke (${viewport.name})`, () => {
  14 |     test.use({
  15 |       viewport: { width: viewport.width, height: viewport.height },
  16 |       storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
  17 |     });
  18 | 
  19 |     for (const path of adminPaths) {
  20 |       test(`renders ${path} without horizontal overflow`, async ({ page }) => {
  21 |         await page.goto(path, { waitUntil: 'networkidle' });
  22 | 
  23 |         const currentPath = new URL(page.url()).pathname;
  24 |         if (currentPath.startsWith('/login')) {
> 25 |           throw new Error(
     |                 ^ Error: Admin route redirected to /login. Set PLAYWRIGHT_STORAGE_STATE to an authenticated admin storage file before running this spec.
  26 |             'Admin route redirected to /login. Set PLAYWRIGHT_STORAGE_STATE to an authenticated admin storage file before running this spec.'
  27 |           );
  28 |         }
  29 | 
  30 |         await expect(page).toHaveURL(new RegExp(`^.*${path.replace('/', '\\/')}`));
  31 | 
  32 |         const hasHorizontalOverflow = await page.evaluate(() => {
  33 |           const body = document.body;
  34 |           const html = document.documentElement;
  35 |           return (
  36 |             body.scrollWidth > body.clientWidth + 1 ||
  37 |             html.scrollWidth > html.clientWidth + 1
  38 |           );
  39 |         });
  40 | 
  41 |         expect(hasHorizontalOverflow).toBe(false);
  42 |       });
  43 |     }
  44 |   });
  45 | }
  46 | 
```