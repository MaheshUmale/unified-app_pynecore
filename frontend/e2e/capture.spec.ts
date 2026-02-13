import { test } from '@playwright/test';

test('capture screenshots', async ({ page }) => {
  test.setTimeout(180000);

  // Set viewport to a large screen
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 1. Load Main Chart (Candle)
  console.log('Loading main chart...');
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(10000); // Wait for data to load
  await page.screenshot({ path: 'screenshot_1_candle.png' });

  // 2. 2x2 Grid Layout
  console.log('Switching to 2x2 grid...');
  await page.goto('http://localhost:5175?layout=2x2');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'screenshot_2_grid_2x2.png' });

  // 3. Renko Chart
  console.log('Switching to Renko chart...');
  await page.goto('http://localhost:5175');
  await page.waitForSelector('button:has-text("Candle")');
  await page.click('button:has-text("Candle")');
  await page.waitForSelector('button:has-text("RENKO")');
  await page.click('button:has-text("RENKO")');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_3_renko.png' });

  // 4. Tick by Tick with config
  console.log('Switching to Tick by Tick...');
  // Click the current chart type button to open menu
  const chartTypeBtn = page.locator('header button').filter({ has: page.locator('.lucide-hash, .lucide-bar-chart-2, .lucide-trending-up, .lucide-activity') }).first();
  await chartTypeBtn.click();
  await page.waitForSelector('button:has-text("Tick by Tick")');
  await page.click('button:has-text("Tick by Tick")');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_4_tick_chart.png' });

  // 5. Volume Footprint
  console.log('Switching to Footprint...');
  await chartTypeBtn.click();
  await page.waitForSelector('button:has-text("Volume Footprint")');
  await page.click('button:has-text("Volume Footprint")');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_5_footprint.png' });

  // 6. Option Chain - Table
  console.log('Opening Option Chain...');
  await page.goto('http://localhost:5175');
  await page.waitForSelector('button[title="Option Chain"]');
  await page.click('button[title="Option Chain"]');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_6_option_chain_table.png' });

  // 7. Option Chain - Analysis & Signals
  console.log('Switching to Analysis tab...');
  await page.click('button:has-text("Analysis & Signals")');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_7_option_analysis.png' });

  // 8. Bar Replay mode
  console.log('Activating Bar Replay...');
  await page.goto('http://localhost:5175');
  await page.waitForSelector('button[title="Bar Replay"]');
  await page.click('button[title="Bar Replay"]');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot_8_bar_replay.png' });
});
