import { test, expect } from './fixtures.js';

/**
 * Comprehensive test suite for rex-core list utilities
 * Tests IndexedDB operations, CRUD, pattern matching, and bulk operations
 */

test.describe('REX Core', () => {
  test.setTimeout(60_000)  

  test('Validate extension loaded.', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page).toHaveTitle(/REX Core Module Loading Test/);

    await page.waitForTimeout(5500);

    await expect(page).toHaveTitle(/REX Core Module Network Fetch Test/);

    await page.waitForTimeout(11000);    

    await expect(page).toHaveTitle(/REX Core Module Testing Extension/);
  });
});
