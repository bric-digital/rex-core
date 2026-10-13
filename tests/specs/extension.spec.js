import { test, expect } from './fixtures.js';

/**
 * Comprehensive test suite for rex-core list utilities
 * Tests IndexedDB operations, CRUD, pattern matching, and bulk operations
 */

test.describe('REX Core', () => {
  // Sum of the per-assertion waits below, plus headroom for the backoff retry.
  test.setTimeout(150_000)

  // The interface advances time_test -> network_test -> main as each screen's
  // requirements resolve. Wait on each title rather than on fixed sleeps: the
  // network_test requirement fetches a live URL with a 10s initial delay and
  // exponential backoff on failure, so any hardcoded duration is a guess that
  // fails wherever the network is slower than the developer's machine (this was
  // failing on CI while passing locally).
  test('Validate extension loaded.', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page).toHaveTitle(/REX Core Module Loading Test/, { timeout: 15000 });

    await expect(page).toHaveTitle(/REX Core Module Network Fetch Test/, { timeout: 30000 });

    await expect(page).toHaveTitle(/REX Core Module Testing Extension/, { timeout: 60000 });
  });
});
