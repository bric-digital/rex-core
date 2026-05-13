// @ts-nocheck

// Implements the necessary functionality to load the REX modules into the 
// extension's UI context.

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

import { type REXUIDefinition } from '@bric/rex-core/common'
import { rexCorePlugin, REXExtensionModule, registerREXModule } from '@bric/rex-core/extension'

rexCorePlugin.loadInitialConfigation('config.json')
  .then(function(result) {
    rexCorePlugin.refreshInterface()
  }, function (error) {
    console.log(`Error loading initial configuration: ${error}`);
 
    rexCorePlugin.refreshInterface()
  })

class MainScreenExtensionModule extends REXExtensionModule {
  setup() {}

  name():string {
    return 'MainScreenExtensionModule'
  }

  activateInterface(uiDefinition:REXUIDefinition):boolean {
    if (uiDefinition.identifier == 'main') {
      return true
    }

    return false
  }
}

registerREXModule(new MainScreenExtensionModule())

class TimeTestExtensionModule extends REXExtensionModule {
  setup() {
    window.localStorage.removeItem('time_test_timestamp')
  }

  name():string {
    return 'TimeTestExtensionModule'
  }

  activateInterface(uiDefinition:REXUIDefinition):boolean {
    if (uiDefinition.identifier == 'time_test') {
      return true
    }

    return false
  }

  async checkRequirement(requirement:string) {
    return new Promise<boolean>((resolve) => {
      if (requirement === 'did_load') {
        const now = Date.now()

        const timestamp = window.localStorage.getItem('time_test_timestamp')

        if (timestamp !== null) {
          const delay = 5000

          if (now - timestamp > delay) { // Five seconds.
            resolve(true)
          } else {
            resolve(false)
          }
        } else {
          window.localStorage.setItem('time_test_timestamp', now)

          window.setTimeout(() => {
            rexCorePlugin.refreshInterface()
          }, 5000)

          resolve(false)
        }
      } else {
        resolve(false)
      }
    })
  }
}

registerREXModule(new TimeTestExtensionModule())

class NetworkTestExtensionModule extends REXExtensionModule {
  contentObject:Blob|null = null
  startedFetch:boolean = false
  sleepDuration:Number = 10000 // 2000

  setup() {}

  name():string {
    return 'NetworkTestExtensionModule'
  }

  activateInterface(uiDefinition:REXUIDefinition):boolean {
    if (uiDefinition.identifier == 'network_test') {
      return true
    }

    return false
  }

  async checkRequirement(requirement:string) {
    return new Promise<boolean>((resolve) => {
      const retry = () => {
        window.setTimeout(() => {
          this.sleepDuration = this.sleepDuration * 2

          this.startedFetch = false

        }, this.sleepDuration)
      }

      if (requirement === 'fetched_network') {
        if (this.startedFetch === false) {
          this.startedFetch = true

          window.setTimeout(() => {
            fetch('https://api.github.com/', { signal: AbortSignal.timeout(120000) })
              .then((response: Response) => {
                if (response.ok) {
                  response.blob().then((responseBlob) => {
                    this.contentObject = responseBlob

                    rexCorePlugin.refreshInterface()
                  })
                } else {
                  retry()
                }
              }, (reason:string) => {
                retry()
              })
          }, this.sleepDuration)
        }

        if (this.contentObject !== null) {
          resolve(true)
        } else {
          resolve(false)
        }
      }

      resolve(false)  
    })
  }
}

registerREXModule(new NetworkTestExtensionModule())

