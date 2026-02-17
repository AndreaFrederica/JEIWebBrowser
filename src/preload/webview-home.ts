import { contextBridge, ipcRenderer } from 'electron'

const jeiHomeApi = {
  fetchSiteMeta: (url: string) => ipcRenderer.invoke('fetch-site-meta', url),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks-data'),
  getHistory: () => ipcRenderer.invoke('get-history-data'),
  clearHistory: () => ipcRenderer.invoke('clear-history-data'),
  getSettings: () => ipcRenderer.invoke('get-settings-data'),
  saveSettings: (settings: {
    shortcut: string
    alwaysOnTop: boolean
    homePage: string
    showBookmarksBar: boolean
    tabBarLayout: 'horizontal' | 'vertical'
    searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
    verticalTabsCollapsed: boolean
  }) =>
    ipcRenderer.invoke('save-settings-data', settings),
  openUrlInNewTab: async (url: string) => {
    ipcRenderer.send('open-url-in-new-tab', url)
    return true
  }
}

// Persistent Storage API for webview pages
// Similar to localStorage but persisted across sessions
class JEIStorage {
  private readonly origin: string

  constructor(origin: string) {
    this.origin = origin
  }

  async getItem(key: string): Promise<string | null> {
    return await ipcRenderer.invoke('webview-storage-get', this.origin, key)
  }

  async setItem(key: string, value: string): Promise<void> {
    await ipcRenderer.invoke('webview-storage-set', this.origin, key, value)
  }

  async removeItem(key: string): Promise<void> {
    await ipcRenderer.invoke('webview-storage-remove', this.origin, key)
  }

  async clear(): Promise<void> {
    await ipcRenderer.invoke('webview-storage-clear', this.origin)
  }

  async keys(): Promise<string[]> {
    return await ipcRenderer.invoke('webview-storage-keys', this.origin)
  }

  async getLength(): Promise<number> {
    return await ipcRenderer.invoke('webview-storage-getLength', this.origin)
  }
}

// Create storage instance for current origin
const currentOrigin = window.location.origin
const jeiStorage = new JEIStorage(currentOrigin)

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('JEIHome', jeiHomeApi)
  contextBridge.exposeInMainWorld('JEIStorage', jeiStorage)
} else {
  ;(window as unknown as Window & { JEIHome?: typeof jeiHomeApi; JEIStorage?: typeof jeiStorage }).JEIHome = jeiHomeApi
  ;(window as unknown as Window & { JEIStorage?: typeof jeiStorage }).JEIStorage = jeiStorage
}
