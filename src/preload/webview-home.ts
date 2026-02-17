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
const currentOrigin = window.location.origin
const normalizeNamespace = (namespace?: string): string | null => {
  if (typeof namespace !== 'string') return null
  const trimmed = namespace.trim()
  return trimmed.length > 0 ? trimmed : null
}

const jeiStorage = {
  getItem: (key: string, namespace?: string) =>
    ipcRenderer.invoke('webview-storage-get', currentOrigin, key, normalizeNamespace(namespace)),
  setItem: (key: string, value: string, namespace?: string) =>
    ipcRenderer.invoke('webview-storage-set', currentOrigin, key, value, normalizeNamespace(namespace)),
  removeItem: (key: string, namespace?: string) =>
    ipcRenderer.invoke('webview-storage-remove', currentOrigin, key, normalizeNamespace(namespace)),
  clear: (namespace?: string) => ipcRenderer.invoke('webview-storage-clear', currentOrigin, normalizeNamespace(namespace)),
  keys: (namespace?: string) => ipcRenderer.invoke('webview-storage-keys', currentOrigin, normalizeNamespace(namespace)),
  getLength: (namespace?: string) =>
    ipcRenderer.invoke('webview-storage-getLength', currentOrigin, normalizeNamespace(namespace))
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('JEIHome', jeiHomeApi)
  contextBridge.exposeInMainWorld('JEIStorage', jeiStorage)
} else {
  ;(window as unknown as Window & { JEIHome?: typeof jeiHomeApi; JEIStorage?: typeof jeiStorage }).JEIHome = jeiHomeApi
  ;(window as unknown as Window & { JEIStorage?: typeof jeiStorage }).JEIStorage = jeiStorage
}
