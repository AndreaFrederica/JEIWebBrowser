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

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('JEIHome', jeiHomeApi)
} else {
  ;(window as Window & { JEIHome?: typeof jeiHomeApi }).JEIHome = jeiHomeApi
}
