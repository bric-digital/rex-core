// @ts-nocheck

// Implements the necessary functionality to load the REX modules into the 
// extension background service worker context.

import rexCorePlugin, { registerREXModule } from '@bric/rex-core/service-worker'

console.log(`Imported ${rexCorePlugin} into service worker context...`)

self['rexCorePlugin'] = rexCorePlugin
self['registerREXModule'] = registerREXModule

rexCorePlugin.setup()
