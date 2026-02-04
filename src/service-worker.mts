import { type REXConfiguration } from "./extension.mjs"

export interface REXConfigurationResponse {
  REXConfiguration:REXConfiguration
}

export interface REXIdentifierResponse {
  rexIdentifier:string
}

export class REXServiceWorkerModule {
  instantiationTarget:string

  constructor() {
    if (new.target === REXServiceWorkerModule) {
      throw new Error('Cannot be instantiated')
    }

    this.instantiationTarget = new.target.toString()
  }

  setup() {
    console.log(`TODO: Implement in ${this.instantiationTarget}...`)
  }

  logEvent(event:object) {
    if (event !== undefined) {
      console.log('REXServiceWorkerModule: implement "logEvent" in subclass...')
    }
  }

  moduleName() {
    return 'REXServiceWorkerModule'
  }

  handleMessage(message:any, sender:any, sendResponse:(response:any) => void):boolean { // eslint-disable-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    return false
  }

  toString():string {
    return this.moduleName()
  }

  refreshConfiguration() {
    // Can be overridden by subclasses to activate latest configurations...
  }

  configurationDetails():any {// eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      module_name: {
        enabled: 'Boolean, true if module is active, false otherwise.',
        other_params: 'Add JSON-serializable parameters to extend configuration.'
      }
    }
  }
}

const registeredExtensionModules:REXServiceWorkerModule[] = []

export function registerREXModule(rexModule:REXServiceWorkerModule) {
  if (!registeredExtensionModules.includes(rexModule)) {
    registeredExtensionModules.push(rexModule)

    rexModule.setup()
  }
}

export function dispatchEvent(event: { name: string; [key: string]: unknown }) {
  for (const extensionModule of registeredExtensionModules) {
    if (extensionModule.logEvent !== undefined) {
      extensionModule.logEvent(event)
    }
  }
}

const rexCorePlugin = { // TODO rename to "engine" or something...
  openExtensionWindow: () => {
    const optionsUrl = chrome.runtime.getURL('index.html')

    chrome.tabs.query({}, function (extensionTabs) {
      if (extensionTabs !== undefined) {
        for (const extensionTab of extensionTabs) {
          if (optionsUrl === extensionTab.url) {
            chrome.windows.remove(extensionTab.windowId)
          }
        }
      }

      chrome.windows.create({
        height: 480,
        width: 640,
        type: 'panel',
        url: chrome.runtime.getURL('index.html')
      })
    })
  },
  setup: () => {
    chrome.runtime.onInstalled.addListener(function (details:object) { // eslint-disable-line @typescript-eslint/no-unused-vars
      rexCorePlugin.openExtensionWindow()
    })

    chrome.action.onClicked.addListener(function (tab) { // eslint-disable-line @typescript-eslint/no-unused-vars
      rexCorePlugin.openExtensionWindow()
    })

    const loadedScripts = new Set()

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
      if (changeInfo.status === 'complete') {
        loadedScripts.delete(`${tabId}-${tab.url}`)
      } else if (changeInfo.status === 'loading' && loadedScripts.has(`${tabId}-${tab.url}`) === false) {
        loadedScripts.add(`${tabId}-${tab.url}`)

        if (tab.url !== undefined && (tab.url.startsWith('https://') || tab.url.startsWith('http://'))) {
          chrome.scripting.executeScript({
            target: {
            tabId: tabId,
            allFrames: true
            },
            files: ['/js/browser/bundle.js']
          }, function (result) { // eslint-disable-line @typescript-eslint/no-unused-vars
            console.log('[rex-core] Content script loaded.')
          })
        }
      }
    })

    chrome.runtime.onMessage.addListener(rexCorePlugin.handleMessage)
  },
  handleMessage: (message:any, sender:any, sendResponse:(response:any) => void):boolean => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (message.messageType == 'loadInitialConfiguration') {
      rexCorePlugin.initializeConfiguration(message.configuration)
        .then((response:string) => {
          sendResponse(response)
        })

      return true
    }

    if (message.messageType == 'updateConfiguration') {
      rexCorePlugin.updateConfiguration(message.configuration)
        .then((response:string) => {
          sendResponse(response)
        })

      return true
    }

    if (message.messageType === 'fetchConfiguration') {
      rexCorePlugin.fetchConfiguration()
        .then((configuration:REXConfiguration) => {
          sendResponse(configuration)
        })

      return true
    }

    if (message.messageType === 'refreshConfiguration') {
      rexCorePlugin.fetchConfiguration()
        .then((configuration:REXConfiguration) => {
          console.log('[rex-core] Fetched configuration:')
          console.log(configuration)

          chrome.storage.local.get('rexIdentifier')
            .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const idResponse:REXIdentifierResponse = response as REXIdentifierResponse
              const identifier = idResponse.rexIdentifier

              const configUrlStr = configuration['configuration_url'] as string

              const configUrl:URL = new URL(configUrlStr.replaceAll('<IDENTIFIER>', identifier))

              fetch(configUrl)
                .then((response: Response) => {
                  if (response.ok) {
                    response.json().then((jsonData:REXConfiguration) => {
                      console.log(`${configUrl}:`)
                      console.log(jsonData)

                      rexCorePlugin.updateConfiguration(jsonData)
                        .then((response:string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
                          for (const extensionModule of registeredExtensionModules) {
                            extensionModule.refreshConfiguration()
                          }

                          sendResponse(jsonData)
                        })
                    })
                } else {
                  sendResponse(null)
                }
              })
          })
        })

      return true
    }

    if (message.messageType === 'setIdentifier') {
      chrome.storage.local.set({
        rexIdentifier: message.identifier
      }).then(() => {
        sendResponse(message.identifier)
      })

      return true
    }

    if (message.messageType == 'getIdentifier') {
      chrome.storage.local.get('rexIdentifier')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idResponse:REXIdentifierResponse = response as REXIdentifierResponse
          sendResponse(idResponse.rexIdentifier)
        })

      return true
    }

    if (message.messageType == 'openWindow') {
      const optionsUrl = chrome.runtime.getURL('index.html')

      chrome.tabs.query({})
        .then((extensionTabs:chrome.tabs.Tab[]) => {
          for (let i = 0; i < extensionTabs.length; i++) {
            const extensionTab = extensionTabs[i]

            if (extensionTab !== undefined) {
              if (optionsUrl === extensionTab.url) {
                chrome.windows.remove(extensionTab.windowId)
              }
            }
          }

          chrome.windows.create({
            height: 480,
            width: 640,
            type: 'panel',
            url: chrome.runtime.getURL('index.html')
          }).then((newWindow:chrome.windows.Window | undefined) => {
            if (newWindow !== undefined) {
              sendResponse(newWindow.id)
            }
          })
        })

      return true
    }

    if (message.messageType == 'logEvent') {
      // message.event = { name:string, ... }

      for (const extensionModule of registeredExtensionModules) {
        if (extensionModule.logEvent !== undefined) {
          extensionModule.logEvent(message.event)
        }
      }

      return true
    }

    let handled:boolean = false

    for (const extensionModule of registeredExtensionModules) {
      if (extensionModule.handleMessage !== undefined) {
        if (extensionModule.handleMessage(message, sender, sendResponse)) {
          handled = true
        }
      }
    }

    return handled
  },
  initializeConfiguration: (configuration:REXConfiguration): Promise<string> => {
    return new Promise((resolve) => {
      chrome.storage.local.get('REXConfiguration')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const configResponse:REXConfigurationResponse = response as REXConfigurationResponse

          if (configResponse.REXConfiguration !== undefined) {
            resolve('Error: Configuration already initialized.')
          } else {
            chrome.storage.local.set({
              REXConfiguration: configuration
            }).then(() => {
              resolve('Success: Configuration initialized.')
            })
          }
        })
    })
  },
  updateConfiguration: (configuration:REXConfiguration): Promise<string> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        REXConfiguration: configuration
      }).then(() => {
        resolve('Success: Configuration updated.')
      })
    })
  },
  fetchConfiguration(): Promise<REXConfiguration> {
    return new Promise((resolve, reject) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      chrome.storage.local.get('REXConfiguration')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idResponse:REXConfigurationResponse = response as REXConfigurationResponse
          resolve(idResponse.REXConfiguration)
        })
    })
  }
}

export default rexCorePlugin
