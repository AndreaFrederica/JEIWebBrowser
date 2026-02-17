export type WebviewTag = HTMLElement & {
  src: string
  getURL: () => string
  getTitle: () => string
  loadURL: (url: string) => void
  reload: () => void
  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => void
  goForward: () => void
  setAttribute: (name: string, value: string) => void
}

export interface TabItem {
  id: string
  title: string
  src: string
  favicon: string | null
}

export interface BookmarkItem {
  title: string
  url: string
}

export interface HistoryItem {
  title: string
  url: string
  date: string
}

export interface SettingsPayload {
  shortcut: string
  alwaysOnTop: boolean
  homePage: string
  showBookmarksBar: boolean
  tabBarLayout: 'horizontal' | 'vertical'
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
  verticalTabsCollapsed: boolean
}
