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

  // The extension-context validation fetch is scoped from the same stored scope
  // as the service worker's periodic refresh, so a client that scopes its config
  // gets consistent resolution in both contexts.
  test('Validate identifier verification applies the configuration scope.', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page).toHaveTitle(/REX Core Module Loading Test/);

    const requestedUrls = []
    page.on('request', (request) => {
      if (request.url().includes('validate-json.json')) {
        requestedUrls.push(request.url())
      }
    })

    const identifier = await page.evaluate(() => {
      return new Promise((testResolve) => {
        chrome.runtime.sendMessage({
          'messageType': 'setConfigurationScope',
          'scope': { 'study': 'demo-study' }
        }, () => {
          const identifierModule = self.rexCorePlugin.fetchREXModule('REXCoreIdentifierExtensionModule')

          identifierModule.validateIdentifier('scoped-endpoint', 'http://localhost:3000/validate-json.json?id=<IDENTIFIER>')
            .then((identifier) => {
              // Clear the scope again: it persists in chrome.storage.local and a
              // leaked study= would scope every later test's config fetch.
              chrome.runtime.sendMessage({
                'messageType': 'setConfigurationScope',
                'scope': { 'study': null }
              }, () => {
                testResolve(identifier)
              })
            })
            .catch((error) => {
              testResolve(`error: ${error}`)
            })
        })
      })
    })

    await expect(identifier).toEqual('scoped-endpoint')
    await expect(requestedUrls.length).toBeGreaterThan(0)
    // Scope applied, and the endpoint's own id= param survives untouched.
    await expect(requestedUrls[0]).toContain('study=demo-study')
    await expect(requestedUrls[0]).toContain('id=scoped-endpoint')
  })
})
