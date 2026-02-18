export type WebviewTag = HTMLElement & {
  src: string
  getURL: () => string
  getTitle: () => string
  loadURL: (url: string) => void
  reload: () => void
  reloadIgnoringCache: () => void
  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => void
  goForward: () => void
  setAttribute: (name: string, value: string) => void
  getWebContentsId: () => number
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
  transparencyEnabled: boolean
  windowOpacity: number
  gameExecutablePath: string
  launcherExecutablePath: string
  homePage: string
  showBookmarksBar: boolean
  tabBarLayout: 'horizontal' | 'vertical'
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
  verticalTabsCollapsed: boolean
}

export type ConnectionSecurityState = 'internal' | 'secure' | 'insecure' | 'local' | 'broken' | 'unknown'

export interface ConnectionCertificateInfo {
  host: string
  port: number
  subject: string
  issuer: string
  validFrom: string
  validTo: string
  serialNumber: string
  fingerprint256: string
  subjectAltName: string
  tlsProtocol: string
  cipherName: string
  authorized: boolean
  authorizationError: string
}
