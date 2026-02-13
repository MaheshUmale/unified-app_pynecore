import { test, expect } from '@playwright/test';

test('debug render', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(5000);

  const html = await page.content();
  console.log('HTML Length:', html.length);
  // console.log('HTML:', html);

  await page.screenshot({ path: 'debug_render.png' });
});
