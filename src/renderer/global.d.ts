export {}

declare global {
  interface Window {
    ipc: {
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, listener: (...args: any[]) => void) => void
    }
    JEIHome?: {
      fetchSiteMeta: (url: string) => Promise<{ title?: string; iconUrl?: string } | null>
      getBookmarks: () => Promise<Array<{ title: string; url: string }>>
      getHistory: () => Promise<Array<{ title: string; url: string; date: string }>>
      clearHistory: () => Promise<{ success: boolean }>
      getSettings: () => Promise<{
        shortcut: string
        alwaysOnTop: boolean
        homePage: string
        showBookmarksBar: boolean
        tabBarLayout: 'horizontal' | 'vertical'
        searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
        verticalTabsCollapsed: boolean
      }>
      saveSettings: (settings: {
        shortcut: string
        alwaysOnTop: boolean
        homePage: string
        showBookmarksBar: boolean
        tabBarLayout: 'horizontal' | 'vertical'
        searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
        verticalTabsCollapsed: boolean
      }) => Promise<{ success: boolean }>
      openUrlInNewTab: (url: string) => Promise<boolean>
    }
  }
}
