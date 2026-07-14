// @ts-nocheck

import { test, expect } from './fixtures.js';

test('Service worker test: Set identifier', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      return new Promise<any>((testResolve) => {
        serviceWorker.evaluate(async () => {
          return new Promise<any>((testResolve) => {
            self.rexCorePlugin.handleMessage({
              'messageType': 'setIdentifier',
              'identifier': 'i-am-rex'
            }, this, (response:any) => {
              testResolve('i-am-rex')
            })
          })
        })
        .then((workerResponse) => {
          expect(workerResponse).toEqual('i-am-rex')

          resolve()
        })
      })
    }, 2500)
  })
})

test('Service worker test: Local configuration mode fetches the bundled config', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      serviceWorker.evaluate(async () => {
        return new Promise<any>((testResolve) => {
          // Point at the bundled config.json via the rex-config:// scheme. This
          // resolves to a chrome-extension:// URL and is fetched from the bundle
          // with no remote server involved.
          const localConfig = { configuration_url: 'rex-config:///config.json' }

          self.rexCorePlugin.updateConfiguration(localConfig)
            .then(() => {
              self.rexCorePlugin.handleMessage({
                'messageType': 'refreshConfiguration'
              }, this, (response:any) => {
                testResolve(response)
              })
            })
        })
      })
      .then((workerResponse) => {
        expect(workerResponse).toMatchObject({ identifier: 'rex-core-test' })

        resolve()
      })
    }, 2500)
  })
})

test('Service worker test: Hash generation (default)', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      return new Promise<any>((testResolve) => {
        serviceWorker.evaluate(async () => {
          return new Promise<any>((testResolve) => {
            self.rexCorePlugin.generateHash('hello world')
            .then((hashString:string) => {
              testResolve(hashString)
            })
          })
        })
        .then((workerResponse) => {
          expect(workerResponse).toEqual('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')

          resolve()
        })
      })
    }, 1000)
  })
})

test('Service worker test: Hash generation (SHA-256)', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      return new Promise<any>((testResolve) => {
        serviceWorker.evaluate(async () => {
          return new Promise<any>((testResolve) => {
            self.rexCorePlugin.generateHash('hello world', 'SHA-256')
            .then((hashString:string) => {
              testResolve(hashString)
            })
          })
        })
        .then((workerResponse) => {
          expect(workerResponse).toEqual('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')

          resolve()
        })
      })
    }, 1000)
  })
})

test('Service worker test: Hash generation (SHA-512)', async ({serviceWorker}) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      return new Promise<any>((testResolve) => {
        serviceWorker.evaluate(async () => {
          return new Promise<any>((testResolve) => {
            self.rexCorePlugin.generateHash('hello world', 'SHA-512')
            .then((hashString:string) => {
              testResolve(hashString)
            })
          })
        })
        .then((workerResponse) => {
          expect(workerResponse).toEqual('309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f')

          resolve()
        })
      })
    }, 1000)
  })
})
