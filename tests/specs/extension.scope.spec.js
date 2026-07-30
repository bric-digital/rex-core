import { test, expect } from './fixtures.js';

/**
 * Configuration scope, extension context.
 *
 * The extension-context validation fetch is scoped from the same stored scope as
 * the service worker's periodic refresh, so a client that scopes its config gets
 * consistent resolution in both contexts.
 *
 * Kept in its own spec file rather than added to extension.identifier.spec.js:
 * the extension-context specs share a browser profile and run in filename order,
 * and extension.spec.js waits on a live network fetch with fixed timeouts. Extra
 * work landing ahead of it shifts that timing, so this file sorts after it.
 */
test.describe('REX Core: Configuration Scope', () => {
  test.setTimeout(60_000)

  test('Validate identifier verification applies the configuration scope.', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page).toHaveTitle(/REX Core Module Loading Test/);

    const requestedUrls = []
    page.on('request', (request) => {
      if (request.url().includes('validate-json.json')) {
        requestedUrls.push(request.url())
      }
    })

    // validateIdentifier stores whatever config the endpoint returns, and the
    // scope persists in chrome.storage.local — both live in a profile shared with
    // every other extension-context spec. Snapshot and restore both, or this test
    // silently breaks its neighbours (it did: it clobbered the stored config and
    // failed three specs).
    const identifier = await page.evaluate(async () => {
      const before = await chrome.storage.local.get(['REXConfiguration', 'rexConfigurationScope'])

      const restore = () => {
        return chrome.storage.local.set({ REXConfiguration: before.REXConfiguration })
          .then(() => {
            if (before.rexConfigurationScope === undefined) {
              return chrome.storage.local.remove('rexConfigurationScope')
            }
            return chrome.storage.local.set({ rexConfigurationScope: before.rexConfigurationScope })
          })
      }

      return new Promise((testResolve) => {
        chrome.runtime.sendMessage({
          'messageType': 'setConfigurationScope',
          'scope': { 'study': 'demo-study' }
        }, () => {
          const identifierModule = self.rexCorePlugin.fetchREXModule('REXCoreIdentifierExtensionModule')

          identifierModule.validateIdentifier('scoped-endpoint', 'http://localhost:3000/validate-json.json?id=<IDENTIFIER>')
            .then((identifier) => {
              restore().then(() => testResolve(identifier))
            })
            .catch((error) => {
              restore().then(() => testResolve(`error: ${error}`))
            })
        })
      })
    })

    expect(identifier).toEqual('scoped-endpoint')
    expect(requestedUrls.length).toBeGreaterThan(0)
    // Scope applied, and the endpoint's own id= param survives untouched.
    expect(requestedUrls[0]).toContain('study=demo-study')
    expect(requestedUrls[0]).toContain('id=scoped-endpoint')
  })
})
