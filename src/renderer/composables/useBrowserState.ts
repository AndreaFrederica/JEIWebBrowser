import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getInternalTitle,
  INTERNAL_BOOKMARKS,
  INTERNAL_HISTORY,
  INTERNAL_HOME,
  INTERNAL_SETTINGS,
  isInternalUrl
} from '../pages/internal-home'
import { normalizeInputToUrl, normalizeSearchEngine, type SearchEngineKey } from '../utils/search'
import type {
  BookmarkItem,
  ConnectionCertificateInfo,
  ConnectionSecurityState,
  HistoryItem,
  SettingsPayload,
  TabItem,
  WebviewTag
} from '../types/browser'

const ipcRenderer =
  window.ipc ??
  ({
    send: () => {},
    invoke: async () => null,
    on: () => {}
  } as const)

export function useBrowserState() {
  const tabs = ref<TabItem[]>([])
  const bookmarks = ref<BookmarkItem[]>([])
  const historyItems = ref<HistoryItem[]>([])
  const activeTabId = ref<string | null>(null)
  const addressBar = ref('')
  const alwaysOnTop = ref(false)
  const showHistoryModal = ref(false)
  const showSettingsModal = ref(false)
  const showCloseConfirmModal = ref(false)
  const settingsStatus = ref('')
  const settingShortcut = ref('')
  const homePage = ref(INTERNAL_HOME)
  const settingHomepage = ref(INTERNAL_HOME)
  const showBookmarksBar = ref(true)
  const tabBarLayout = ref<'horizontal' | 'vertical'>('horizontal')
  const searchEngine = ref<SearchEngineKey>('bing')
  const verticalTabsCollapsed = ref(false)
  const webviewPreloadPath = ref<string | null>(null)
  const tabLoadErrors = reactive(new Map<string, string>())
  const connectionCertificate = ref<ConnectionCertificateInfo | null>(null)
  const connectionCertificateLoading = ref(false)
  const connectionCertificateError = ref('')
  const certificateApiUnavailable = ref(false)
  let certificateFetchToken = 0
  let certificateFetchTimer: ReturnType<typeof setTimeout> | null = null
  let tabCounter = 0

  const webviews = reactive(new Map<string, WebviewTag>())

  const activePageUrl = computed(() => {
    const value = (addressBar.value || '').trim()
    if (value === INTERNAL_HOME || value === INTERNAL_BOOKMARKS || value === INTERNAL_HISTORY || value === INTERNAL_SETTINGS) {
      return value
    }
    if (!value.startsWith('http://') && !value.startsWith('https://')) return ''
    return value
  })

  const activeInternalUrl = computed(() => {
    const tab = getActiveTab()
    if (!tab || !isInternalUrl(tab.src)) return null
    return tab.src
  })

  const isBookmarked = computed(() => {
    if (!activePageUrl.value) return false
    return bookmarks.value.some((item) => (item.url || '').trim() === activePageUrl.value)
  })

  const connectionSecurity = computed<ConnectionSecurityState>(() => {
    const tabError = activeTabId.value ? tabLoadErrors.get(activeTabId.value) || '' : ''
    if (tabError && /(SSL|TLS|CERT)/i.test(tabError)) return 'broken'

    const value = (addressBar.value || '').trim()
    if (!value) return 'unknown'
    if (isInternalUrl(value)) return 'internal'

    try {
      const parsed = new URL(value)
      if (parsed.protocol === 'https:') return 'secure'
      if (parsed.protocol === 'http:') {
        const host = parsed.hostname.toLowerCase()
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return 'local'
        return 'insecure'
      }
      return 'unknown'
    } catch {
      return 'unknown'
    }
  })

  const connectionSecurityText = computed(() => {
    if (connectionSecurity.value === 'secure') return '安全连接（HTTPS）'
    if (connectionSecurity.value === 'insecure') return '不安全连接（HTTP）'
    if (connectionSecurity.value === 'local') return '本地连接'
    if (connectionSecurity.value === 'broken') return '证书或 TLS 连接异常'
    if (connectionSecurity.value === 'internal') return 'JEI 内置页面'
    return '连接状态未知'
  })

  async function refreshConnectionCertificate(): Promise<void> {
    if (certificateApiUnavailable.value) {
      connectionCertificate.value = null
      connectionCertificateLoading.value = false
      connectionCertificateError.value = '主进程未注册证书接口，请重启应用'
      return
    }

    const address = (addressBar.value || '').trim()
    if (!address || isInternalUrl(address)) {
      connectionCertificate.value = null
      connectionCertificateError.value = ''
      connectionCertificateLoading.value = false
      return
    }

    let parsed: URL
    try {
      parsed = new URL(address)
    } catch {
      connectionCertificate.value = null
      connectionCertificateError.value = ''
      connectionCertificateLoading.value = false
      return
    }

    if (parsed.protocol !== 'https:') {
      connectionCertificate.value = null
      connectionCertificateError.value = ''
      connectionCertificateLoading.value = false
      return
    }

    const token = ++certificateFetchToken
    connectionCertificateLoading.value = true
    connectionCertificateError.value = ''

    try {
      const cert = (await ipcRenderer.invoke('get-connection-certificate', parsed.toString())) as ConnectionCertificateInfo | null
      if (token !== certificateFetchToken) return
      connectionCertificate.value = cert
      if (!cert) {
        connectionCertificateError.value = '无法读取远端证书信息'
      }
    } catch (error) {
      if (token !== certificateFetchToken) return
      connectionCertificate.value = null
      const message = String(error ?? '')
      if (message.includes("No handler registered for 'get-connection-certificate'")) {
        certificateApiUnavailable.value = true
        connectionCertificateError.value = '主进程未注册证书接口，请重启应用'
      } else {
        connectionCertificateError.value = '读取证书信息失败'
      }
    } finally {
      if (token === certificateFetchToken) {
        connectionCertificateLoading.value = false
      }
    }
  }

  function scheduleConnectionCertificateRefresh(): void {
    if (certificateFetchTimer) {
      clearTimeout(certificateFetchTimer)
      certificateFetchTimer = null
    }
    certificateFetchTimer = setTimeout(() => {
      certificateFetchTimer = null
      void refreshConnectionCertificate()
    }, 180)
  }

  function applySettings(settings: SettingsPayload): void {
    alwaysOnTop.value = settings.alwaysOnTop
    settingShortcut.value = settings.shortcut
    settingHomepage.value = settings.homePage || INTERNAL_HOME
    homePage.value = settings.homePage || INTERNAL_HOME
    showBookmarksBar.value = settings.showBookmarksBar
    tabBarLayout.value = settings.tabBarLayout === 'vertical' ? 'vertical' : 'horizontal'
    searchEngine.value = normalizeSearchEngine(settings.searchEngine)
    verticalTabsCollapsed.value = !!settings.verticalTabsCollapsed
  }

  function normalizeUrl(raw: string): string {
    const value = (raw ?? '').trim()
    if (!value) return INTERNAL_HOME
    if (value.toLowerCase() === 'internal' || value === INTERNAL_HOME) return INTERNAL_HOME
    if (value === INTERNAL_BOOKMARKS || value === INTERNAL_HISTORY || value === INTERNAL_SETTINGS) return value
    return normalizeInputToUrl(value, searchEngine.value)
  }

  function getActiveTab(): TabItem | null {
    if (!activeTabId.value) return null
    return tabs.value.find((item) => item.id === activeTabId.value) ?? null
  }

  function setWebviewRef(tabId: string, element: Element | null): void {
    if (!element) {
      webviews.delete(tabId)
      return
    }

    const webview = element as WebviewTag
    webviews.set(tabId, webview)
    bindWebviewEvents(tabId, webview)
  }

  function getActiveWebview(): WebviewTag | null {
    if (!activeTabId.value) return null
    return webviews.get(activeTabId.value) ?? null
  }

  function updateTabTitle(tabId: string, title?: string): void {
    const tab = tabs.value.find((item) => item.id === tabId)
    const webview = webviews.get(tabId)
    if (!tab || !webview) return

    tab.title = title || webview.getTitle() || 'Loading...'
  }

  function updateTabFavicon(tabId: string, favicon: string | null): void {
    const tab = tabs.value.find((item) => item.id === tabId)
    if (!tab) return
    tab.favicon = favicon
  }

  function updateAddressBar(): void {
    const tab = getActiveTab()
    if (!tab) {
      addressBar.value = ''
      return
    }

    if (isInternalUrl(tab.src)) {
      addressBar.value = tab.src
      return
    }

    const webview = getActiveWebview()
    if (!webview) {
      addressBar.value = tab.src
      return
    }

    try {
      const url = webview.getURL()
      addressBar.value = url || tab.src
    } catch {
      addressBar.value = tab.src
    }
  }

  function switchTab(tabId: string): void {
    activeTabId.value = tabId
    updateAddressBar()
  }

  function createNewTab(url?: string): void {
    const tabId = `tab-${tabCounter++}`
    const target = normalizeUrl(url || homePage.value)
    tabLoadErrors.delete(tabId)
    tabs.value.push({
      id: tabId,
      title: isInternalUrl(target) ? getInternalTitle(target) : 'New Tab',
      src: target,
      favicon: null
    })
    switchTab(tabId)
  }

  function closeTab(tabId: string): void {
    const tabIndex = tabs.value.findIndex((item) => item.id === tabId)
    if (tabIndex < 0) return

    tabs.value.splice(tabIndex, 1)
    webviews.delete(tabId)
    tabLoadErrors.delete(tabId)

    if (activeTabId.value === tabId) {
      if (tabs.value.length === 0) {
        createNewTab(homePage.value)
        return
      }

      const nextIndex = tabIndex > 0 ? tabIndex - 1 : 0
      switchTab(tabs.value[nextIndex].id)
    }
  }

  function navigateTo(url: string): void {
    const tab = getActiveTab()
    if (!tab) return

    const target = normalizeUrl(url)
    const fromInternal = isInternalUrl(tab.src)
    const toInternal = isInternalUrl(target)
    const webview = getActiveWebview()
    tabLoadErrors.delete(tab.id)

    if (!fromInternal && !toInternal && webview) {
      webview.loadURL(target)
      return
    }

    tab.src = target
    tab.title = toInternal ? getInternalTitle(target) : 'Loading...'
    tab.favicon = null
    addressBar.value = target
  }

  function bindWebviewEvents(tabId: string, webview: WebviewTag): void {
    const mark = webview.getAttribute('data-events-bound')
    if (mark === '1') return
    webview.setAttribute('data-events-bound', '1')

    webview.addEventListener('dom-ready', () => {
      tabLoadErrors.delete(tabId)
      if (activeTabId.value === tabId) {
        updateAddressBar()
        updateTabTitle(tabId)
      }
    })

    webview.addEventListener('page-title-updated', (event: Event) => {
      const payload = event as Event & { title?: string }
      updateTabTitle(tabId, payload.title)
    })

    webview.addEventListener('page-favicon-updated', (event: Event) => {
      const payload = event as Event & { favicons?: string[] }
      const nextIcon = Array.isArray(payload.favicons) && payload.favicons.length > 0 ? payload.favicons[0] : null
      updateTabFavicon(tabId, nextIcon)
    })

    webview.addEventListener('did-navigate', () => {
      tabLoadErrors.delete(tabId)
      if (activeTabId.value === tabId) updateAddressBar()
    })

    webview.addEventListener('did-navigate-in-page', () => {
      tabLoadErrors.delete(tabId)
      if (activeTabId.value === tabId) updateAddressBar()
    })

    webview.addEventListener('did-start-loading', () => {
      updateTabFavicon(tabId, null)
    })

    webview.addEventListener('did-fail-load', (event: Event) => {
      const payload = event as Event & { errorCode?: number; errorDescription?: string; isMainFrame?: boolean }
      if (payload.isMainFrame === false) return
      if (payload.errorCode === -3) return
      const message = (payload.errorDescription || '').trim()
      if (message) tabLoadErrors.set(tabId, message)
    })

    webview.addEventListener('new-window', (event: Event) => {
      const payload = event as Event & { url?: string }
      if (payload.url) createNewTab(payload.url)
    })
  }

  async function loadBookmarks(): Promise<void> {
    try {
      const items = await ipcRenderer.invoke('get-bookmarks-data')
      bookmarks.value = Array.isArray(items) ? items : []
    } catch {
      bookmarks.value = []
    }
  }

  function saveBookmark(): void {
    const tab = getActiveTab()
    if (!tab || isInternalUrl(tab.src)) return

    const webview = getActiveWebview()
    if (!webview) return

    const bookmarkUrl = webview.getURL()
    if (!bookmarkUrl || isBookmarked.value || isInternalUrl(bookmarkUrl)) return

    ipcRenderer.send('save-bookmark', {
      title: webview.getTitle(),
      url: bookmarkUrl
    })
  }

  function removeBookmark(url: string): void {
    ipcRenderer.send('remove-bookmark', url)
  }

  async function loadHistory(): Promise<void> {
    try {
      const items = await ipcRenderer.invoke('get-history-data')
      historyItems.value = Array.isArray(items) ? items : []
    } catch {
      historyItems.value = []
    }
  }

  async function clearHistory(): Promise<boolean> {
    try {
      const result = await ipcRenderer.invoke('clear-history-data')
      const ok = !!result?.success
      if (ok) historyItems.value = []
      return ok
    } catch {
      return false
    }
  }

  function applySettingsFromInternalPage(settings: SettingsPayload): void {
    applySettings(settings)
  }

  function toggleVerticalTabsCollapsed(): void {
    verticalTabsCollapsed.value = !verticalTabsCollapsed.value
    const payload: SettingsPayload = {
      shortcut: settingShortcut.value,
      alwaysOnTop: alwaysOnTop.value,
      homePage: homePage.value,
      showBookmarksBar: showBookmarksBar.value,
      tabBarLayout: tabBarLayout.value,
      searchEngine: searchEngine.value,
      verticalTabsCollapsed: verticalTabsCollapsed.value
    }
    void ipcRenderer.invoke('save-settings-data', payload)
  }

  function saveSettings(): void {
    const nextHome = settingHomepage.value.trim() ? settingHomepage.value.trim() : INTERNAL_HOME
    homePage.value = nextHome

    ipcRenderer.send('save-settings', {
      shortcut: settingShortcut.value,
      homePage: nextHome,
      alwaysOnTop: alwaysOnTop.value,
      showBookmarksBar: showBookmarksBar.value,
      tabBarLayout: tabBarLayout.value,
      searchEngine: searchEngine.value,
      verticalTabsCollapsed: verticalTabsCollapsed.value
    })
  }

  function navigateBack(): void {
    const webview = getActiveWebview()
    if (webview && webview.canGoBack()) webview.goBack()
  }

  function navigateForward(): void {
    const webview = getActiveWebview()
    if (webview && webview.canGoForward()) webview.goForward()
  }

  function reloadPage(): void {
    const webview = getActiveWebview()
    if (webview) webview.reload()
  }

  function hardReloadPage(): void {
    const webview = getActiveWebview()
    if (webview) webview.reloadIgnoringCache()
  }

  function minimizeWindow(): void {
    ipcRenderer.send('window-minimize')
  }

  function maximizeWindow(): void {
    ipcRenderer.send('window-maximize')
  }

  function closeWindow(): void {
    showCloseConfirmModal.value = true
  }

  function cancelCloseConfirm(): void {
    showCloseConfirmModal.value = false
  }

  function closeAndHideWindow(): void {
    showCloseConfirmModal.value = false
    ipcRenderer.send('window-close')
  }

  function closeAndQuitApp(): void {
    showCloseConfirmModal.value = false
    ipcRenderer.send('window-quit')
  }

  function goHome(): void {
    navigateTo(homePage.value)
  }

  function openBookmark(url: string): void {
    navigateTo(url)
  }

  function openBookmarkInNewTab(url: string): void {
    createNewTab(url)
  }

  async function copyBookmarkLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
  }

  function onAddressEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      navigateTo(addressBar.value)
    }
  }

  function openHistory(): void {
    void loadHistory()
    createNewTab(INTERNAL_HISTORY)
  }

  function applyAlwaysOnTop(value: boolean): void {
    alwaysOnTop.value = value
    ipcRenderer.send('toggle-always-on-top', value)
  }

  function openHistoryItem(url: string): void {
    createNewTab(url)
    showHistoryModal.value = false
  }

  function openSettings(): void {
    createNewTab(INTERNAL_SETTINGS)
    settingsStatus.value = ''
  }

  function openBookmarksManage(): void {
    createNewTab(INTERNAL_BOOKMARKS)
  }

  onMounted(async () => {
    ipcRenderer.on('bookmarks-data', (items: BookmarkItem[]) => {
      bookmarks.value = items
    })

    ipcRenderer.on('history-data', (items: HistoryItem[]) => {
      historyItems.value = items
    })

    ipcRenderer.on('settings-data', (settings: SettingsPayload) => {
      applySettings(settings)
      if (tabs.value.length === 0) {
        createNewTab(homePage.value)
      }
    })

    ipcRenderer.on('save-settings-reply', (result: { success: boolean }) => {
      if (result.success) {
        settingsStatus.value = 'Settings saved!'
        setTimeout(() => {
          showSettingsModal.value = false
          settingsStatus.value = ''
        }, 1000)
        return
      }

      settingsStatus.value = 'Failed to save shortcut (invalid?)'
    })

    ipcRenderer.on('open-url-in-new-tab', (url: string) => {
      if (url) createNewTab(url)
    })

    ipcRenderer.on('request-close-confirm', () => {
      showCloseConfirmModal.value = true
    })

    ipcRenderer.on('nav-back', navigateBack)
    ipcRenderer.on('nav-forward', navigateForward)
    ipcRenderer.on('nav-reload', reloadPage)
    ipcRenderer.on('nav-hard-reload', hardReloadPage)
    ipcRenderer.on('nav-home', goHome)
    ipcRenderer.on('nav-new-tab', () => createNewTab(homePage.value))

    try {
      const preloadPath = await ipcRenderer.invoke('get-webview-preload-path')
      webviewPreloadPath.value = typeof preloadPath === 'string' && preloadPath.length > 0 ? preloadPath : null
    } catch {
      webviewPreloadPath.value = null
    }

    try {
      const settings = (await ipcRenderer.invoke('get-settings-data')) as SettingsPayload | null
      if (settings) applySettings(settings)
    } catch {
      // Keep defaults.
    }

    await loadBookmarks()

    if (tabs.value.length === 0) {
      createNewTab(homePage.value)
    }
  })

  watch(
    () => addressBar.value,
    () => {
      scheduleConnectionCertificateRefresh()
    },
    { immediate: true }
  )

  return {
    tabs,
    bookmarks,
    historyItems,
    activeTabId,
    activeInternalUrl,
    addressBar,
    alwaysOnTop,
    showHistoryModal,
    showSettingsModal,
    showCloseConfirmModal,
    settingsStatus,
    settingShortcut,
    homePage,
    settingHomepage,
    showBookmarksBar,
    tabBarLayout,
    searchEngine,
    connectionSecurity,
    connectionSecurityText,
    connectionCertificate,
    connectionCertificateLoading,
    connectionCertificateError,
    verticalTabsCollapsed,
    webviewPreloadPath,
    isBookmarked,
    setWebviewRef,
    switchTab,
    closeTab,
    createNewTab,
    navigateTo,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    cancelCloseConfirm,
    closeAndHideWindow,
    closeAndQuitApp,
    goHome,
    navigateBack,
    navigateForward,
    reloadPage,
    saveBookmark,
    removeBookmark,
    loadBookmarks,
    loadHistory,
    clearHistory,
    applySettingsFromInternalPage,
    openBookmarksManage,
    openHistory,
    openSettings,
    onAddressEnter,
    applyAlwaysOnTop,
    toggleVerticalTabsCollapsed,
    openBookmark,
    openBookmarkInNewTab,
    copyBookmarkLink,
    openHistoryItem,
    saveSettings
  }
}
