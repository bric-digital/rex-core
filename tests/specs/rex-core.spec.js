import { test, expect } from '@playwright/test';

/**
 * Comprehensive test suite for rex-core list utilities
 * Tests IndexedDB operations, CRUD, pattern matching, and bulk operations
 */

test.describe('REX Core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.testUtilitiesReady === true);

    await page.waitForTimeout(100); // Give time for DB to clear
  });
});
