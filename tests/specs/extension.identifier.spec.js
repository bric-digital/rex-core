import { test, expect } from './fixtures.js';

/**
 * Comprehensive test suite for rex-core list utilities
 * Tests IndexedDB operations, CRUD, pattern matching, and bulk operations
 */

test.describe('REX Core: Identifier Verification', () => {
  test.setTimeout(60_000)  

  test('Validate identifier verification.', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page).toHaveTitle(/REX Core Module Loading Test/);

    // Listen for all console events and handle errors
    page.on('console', msg => {
      console.log(msg);
    })

    const payload = await page.evaluate(() => {
      return new Promise((testResolve) => {
        const payload = {}

        const identifierModule = self.rexCorePlugin.fetchREXModule('REXCoreIdentifierExtensionModule')

        identifierModule.validateIdentifier('working-endpoint', 'http://localhost:3000/validate-json.json?id=<IDENTIFIER>')
           .then((identifier) => {

            payload['with-json'] = identifier

            identifierModule.validateIdentifier('broken-endpoint', 'http://localhost:3000/validate-no-json.json?id=<IDENTIFIER>')
              .then((brokenIdentifier) => {
                payload['without-json'] = brokenIdentifier

                testResolve(payload)
              })
              .catch((error) => {
                payload['error'] = `${error}`

                payload['without-json'] = 'expected-error'

                testResolve(payload)
              })
          })
          .catch((error) => {
            payload['error'] = `${error}`

            testResolve(payload)
          })
      })
    })
    
    await expect(payload['with-json']).toEqual('working-endpoint')
    await expect(payload['without-json']).toEqual('expected-error')
    await expect(payload['error']).toEqual('Received non-JSON response: SyntaxError: Unexpected token \'b\', "broken-endpoint" is not valid JSON')
  })
})
