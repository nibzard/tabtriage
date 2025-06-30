
import { test, expect } from '@playwright/test';
import { mockTabs } from './mock-data';

test.describe('Workspace functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.route('**/api/tabs', (route) => {
      console.log('Intercepting /api/tabs');
      route.fulfill({
        status: 200,
        body: JSON.stringify(mockTabs),
      });
    });
    page.on('console', msg => console.log(msg.text()));
  });

  test('should render link cards', async ({ page }) => {
    await page.goto('http://localhost:3000/workspace');
    await page.waitForRequest('**/api/tabs');
    // Wait for the loader to disappear
    await expect(page.locator('text=Loading tabs...')).not.toBeVisible();
    
    // Now check for the cards
    await expect(page.locator('div.relative > div[draggable="true"] > div.transition-all')).not.toHaveCount(0);
  });

  test('should change thumbnail size', async ({ page }) => {
    await page.goto('http://localhost:3000/workspace');
    await page.waitForRequest('**/api/tabs');
    await expect(page.locator('text=Loading tabs...')).not.toBeVisible();
    const thumbnail = page.locator('[data-tab-screenshot]').first();
    
    // Check initial size (medium)
    await expect(thumbnail).toHaveClass(/h-32/);

    // Change to small
    await page.locator('button:has-text("Medium")').click();
    await page.locator('div[role="option"]:has-text("Small")').click();
    await expect(thumbnail).toHaveClass(/h-20/);

    // Change to large
    await page.locator('button:has-text("Small")').click();
    await page.locator('div[role="option"]:has-text("Large")').click();
    await expect(thumbnail).toHaveClass(/h-48/);
  });

  test('should toggle compact mode', async ({ page }) => {
    await page.goto('http://localhost:3000/workspace');
    await page.waitForRequest('**/api/tabs');
    await expect(page.locator('text=Loading tabs...')).not.toBeVisible();
    const cardContent = page.locator('div.transition-all > div.p-4, div.transition-all > div.p-3').first();
    
    // Check initial state (not compact)
    await expect(cardContent).toHaveClass(/p-4/);

    // Enable compact mode
    await page.locator('button:has-text("Standard")').click();
    await expect(cardContent).toHaveClass(/p-3/);

    // Disable compact mode
    await page.locator('button:has-text("Compact")').click();
    await expect(cardContent).toHaveClass(/p-4/);
  });
});
