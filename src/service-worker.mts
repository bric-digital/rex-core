import { type WebmunkConfiguration } from "./extension.mjs"

export interface WebmunkConfigurationResponse {
  webmunkConfiguration:WebmunkConfiguration
}

export interface WebmunkIdentifierResponse {
  webmunkIdentifier:string
}

export class WebmunkServiceWorkerModule {
  instantiationTarget:string

  constructor() {
    if (new.target === WebmunkServiceWorkerModule) {
      throw new Error('Cannot be instantiated')
    }

    this.instantiationTarget = new.target.toString()
  }

  setup() {
    console.log(`TODO: Implement in ${this.instantiationTarget}...`)
  }

  logEvent(event:any) {
    if (event !== undefined) {

    }
  }

  moduleName() {
    return 'WebmunkServiceWorkerModule'
  }
}

const registeredExtensionModules:WebmunkServiceWorkerModule[] = []

export function registerWebmunkModule(webmunkModule:WebmunkServiceWorkerModule) {
  console.log(`Registering ${webmunkModule.moduleName()}...`)
  if (!registeredExtensionModules.includes(webmunkModule)) {
    registeredExtensionModules.push(webmunkModule)

    webmunkModule.setup()
    console.log(`Registered ${webmunkModule.moduleName()}!`)
  }
}

export function broadcastEvent(event: any) {
  try {
    console.log(`[webmunk-core] Broadcasting event: ${event?.name} to ${registeredExtensionModules.length} modules`)
    
    if (!event || !event.name) {
      console.warn('[webmunk-core] Invalid event object')
      return
    }
    
    for (const extensionModule of registeredExtensionModules) {
      try {
        if (extensionModule && extensionModule.logEvent && typeof extensionModule.logEvent === 'function') {
          extensionModule.logEvent(event)
        }
      } catch (error) {
        console.error(`[webmunk-core] Error in ${extensionModule?.moduleName?.() || 'unknown'}.logEvent:`, error)
      }
    }
  } catch (error) {
    console.error('[webmunk-core] Fatal error in broadcastEvent:', error)
  }
}

const webmunkCorePlugin = { // TODO rename to "engine" or something...
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
      webmunkCorePlugin.openExtensionWindow()
    })

    chrome.action.onClicked.addListener(function (tab) { // eslint-disable-line @typescript-eslint/no-unused-vars
      webmunkCorePlugin.openExtensionWindow()
    })

    const loadedScripts = new Set()

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

      if (changeInfo.status === 'complete') {
        loadedScripts.delete(`${tabId}-${tab.url}`)
      } else if (changeInfo.status === 'loading') {
        // Check if this is a new tab with blank/new tab URL and redirect if configured
        const isNewTab = tab.url === 'chrome://newtab/' || 
                         tab.url === 'chrome://newtab' || 
                         tab.url === 'about:blank' ||
                         tab.url === 'chrome://new-tab-page/'
        
        if (isNewTab) {
          webmunkCorePlugin.fetchConfiguration()
            .then((config: WebmunkConfiguration) => {
              // If page_redirect exists (even if disabled), respect that and don't fallback
              // Only use default_page.default_page if page_redirect doesn't exist
              let redirectUrl: string | undefined
              
              if (config && config.page_redirect) {
                // page_redirect exists - check if enabled
                if ((config.page_redirect as any).enabled && (config.page_redirect as any).url) {
                  redirectUrl = (config.page_redirect as any).url
                } else {
                  // page_redirect is disabled - do nothing, don't fallback to default_page
                  console.log('[webmunk-core] page_redirect is disabled, skipping redirect')
                }
              } else if (config && config.default_page?.default_page) {
                // page_redirect doesn't exist, fallback to default_page.default_page
                redirectUrl = config.default_page.default_page
              }
              
              if (redirectUrl) {
                console.log(`[webmunk-core] Redirecting new tab to: ${redirectUrl}`)
                chrome.tabs.update(tabId, { url: redirectUrl })
              }
            })
            .catch((error) => {
              console.log('[webmunk-core] Could not fetch configuration for redirect:', error)
            })
          return // Skip content script injection for new tabs
        }

        if (loadedScripts.has(`${tabId}-${tab.url}`) === false) {
          loadedScripts.add(`${tabId}-${tab.url}`)

          if (tab.url !== undefined && (tab.url.startsWith('https://') || tab.url.startsWith('http://'))) {
            chrome.scripting.executeScript({
              target: {
              tabId: tabId,
              allFrames: true
              },
              files: ['/js/browser/bundle.js']
            }, function (result) { // eslint-disable-line @typescript-eslint/no-unused-vars
              console.log('[webmunk-core] Content script loaded.')
            })
          }
        }
      }
    })

    chrome.runtime.onMessage.addListener(webmunkCorePlugin.handleMessage)
  },
  handleMessage: (message:any, sender:any, sendResponse:(response:any) => void):boolean => { // eslint-disable-line @typescript-eslint/no-explicit-any
    //receive message from extension
    if (message.messageType == 'loadInitialConfiguration') {
      webmunkCorePlugin.initializeConfiguration(message.configuration)
        .then((response:string) => {
          sendResponse(response)
        })

      return true
    }

    if (message.messageType == 'updateConfiguration') {
      webmunkCorePlugin.updateConfiguration(message.configuration)
        .then((response:string) => {
          sendResponse(response)
        })

      return true
    }

    if (message.messageType === 'fetchConfiguration') {
      webmunkCorePlugin.fetchConfiguration()
        .then((configuration:WebmunkConfiguration) => {
          sendResponse(configuration)
        })

      return true
    }

    if (message.messageType === 'setIdentifier') {
      chrome.storage.local.set({
        webmunkIdentifier: message.identifier
      }).then(() => {
        sendResponse(message.identifier)
      })

      return true
    }

    if (message.messageType == 'getIdentifier') {
      chrome.storage.local.get('webmunkIdentifier')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idResponse:WebmunkIdentifierResponse = response as WebmunkIdentifierResponse
          sendResponse(idResponse.webmunkIdentifier)
        })

      return true
    }

    if (message.messageType == 'logEvent') {
      console.log(`[webmunk-core] logEvent -- ${registeredExtensionModules.length}`)
      console.log(message.event)

      // message.event = { name:string, ... }

      for (const extensionModule of registeredExtensionModules) {
        console.log(`TRY ${extensionModule.moduleName()}`)
        console.log(extensionModule.logEvent)

        if (extensionModule.logEvent !== undefined) {
          extensionModule.logEvent(message.event)
        }
      }

      return true
    }

    return false
  },
  initializeConfiguration: (configuration:WebmunkConfiguration): Promise<string> => {
    return new Promise((resolve) => {
      chrome.storage.local.get('webmunkConfiguration')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any

          const configResponse:WebmunkConfigurationResponse = response as WebmunkConfigurationResponse

          if (configResponse.webmunkConfiguration !== undefined) {

            resolve('Error: Configuration already initialized.')
          } else {
            chrome.storage.local.set({
              webmunkConfiguration: configuration
            }).then(() => {
              // redirect to initial page from config
              const initialPage = configuration.default_page?.initial_page
              if (initialPage) {
                console.log(`[webmunk-core] Opening initial page: ${initialPage}`)
                chrome.tabs.create({ url: initialPage })
              } else {
                console.log('[webmunk-core] No initial_page configured')
              }
              resolve('Success: Configuration initialized.')
            })
          }
        })
    })
  },
  updateConfiguration: (configuration:WebmunkConfiguration): Promise<string> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        webmunkConfiguration: configuration
      }).then(() => {
        resolve('Success: Configuration updated.')
      })
    })
  },
  fetchConfiguration(): Promise<WebmunkConfiguration> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('webmunkConfiguration')
        .then((response:{ [name: string]: any; }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idResponse:WebmunkConfigurationResponse = response as WebmunkConfigurationResponse
          resolve(idResponse.webmunkConfiguration)
        })
    })
  }
}

export default webmunkCorePlugin
