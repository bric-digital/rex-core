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

test('Service worker test: Hash generation', async ({serviceWorker}) => {
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
