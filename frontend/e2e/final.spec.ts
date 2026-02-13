import { test, expect } from '@playwright/test';

test('verify advanced features', async ({ page }) => {
  await page.goto('http://localhost:5173/?symbol=NSE:NIFTY&layout=2x2');

  // Wait for the chart containers
  await page.waitForSelector('.tv-chart-container', { state: 'visible', timeout: 30000 });

  const containers = page.locator('.tv-chart-container');
  await expect(containers).toHaveCount(4);

  // Verify Deep Linking worked for first pane (Technical name is often blue-400 span)
  await expect(page.getByText('NSE:NIFTY').first()).toBeVisible();

  // Open Options Chain
  await page.getByTitle('Option Chain').click();
  await expect(page.getByText(/Option Chain:/)).toBeVisible();
  await expect(page.getByText('PCR:')).toBeVisible();

  await page.screenshot({ path: 'final_dashboard.png', fullPage: true });
});
