# REX Core Test Suite

These tests evaluate the core functions of the REX Core module and are intended to serve as a template for submodule authors writing their own tests. The included files validate that both the extension is loading (`[specs/extension.spec.js](specs/extension.spec.js)`) as well that the service worker is initialized properly (`[specs/service-worker.spec.js](specs/service-worker.spec.js)`).

A template for the testing extension is in the `[extension](extension)` folder and is used by the `npm run test` command(s) to build an extension with the REX Core module loaded, load it into [a Playwright testing environment](https://playwright.dev/), and test the extension as loaded in addition to any additional unit and other tests.

To build the testing extension and run the tests, from the `rex-core` root folder, run `npm run test`.
