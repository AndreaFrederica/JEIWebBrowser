import { computed, onMounted, reactive, ref } from 'vue'
import {
  INTERNAL_BOOKMARKS,
  INTERNAL_HISTORY,
  INTERNAL_HOME,
  INTERNAL_SETTINGS,
  internalBookmarksUrl,
  internalHistoryUrl,
  internalHomeUrl,
  internalSettingsUrl
} from '../pages/internal-home'
import type { BookmarkItem, HistoryItem, SettingsPayload, TabItem, WebviewTag } from '../types/browser'

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
  const settingsStatus = ref('')
  const settingShortcut = ref('')
  const homePage = ref(INTERNAL_HOME)
  const settingHomepage = ref(INTERNAL_HOME)
  const webviewPreloadPath = ref<string | null>(null)
  let tabCounter = 0

  const webviews = reactive(new Map<string, WebviewTag>())

  const activePageUrl = computed(() => {
    const value = (addressBar.value || '').trim()
    if (value === INTERNAL_HOME || value === INTERNAL_BOOKMARKS || value === INTERNAL_HISTORY || value === INTERNAL_SETTINGS) {
      return value
    }

    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return ''
    }

    return value
  })

  const isBookmarked = computed(() => {
    if (!activePageUrl.value) return false
    return bookmarks.value.some((item) => (item.url || '').trim() === activePageUrl.value)
  })

  function normalizeUrl(raw: string): string {
    const value = (raw ?? '').trim()
    if (!value) return internalHomeUrl()
    if (value === INTERNAL_HOME || value.toLowerCase() === 'internal') return internalHomeUrl()
    if (value === INTERNAL_BOOKMARKS) return internalBookmarksUrl()
    if (value === INTERNAL_HISTORY) return internalHistoryUrl()
    if (value === INTERNAL_SETTINGS) return internalSettingsUrl()
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return value
    return `https://${value}`
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

  function updateAddressBar(): void {
    const webview = getActiveWebview()
    if (!webview) return

    try {
      const url = webview.getURL()
      if (url.startsWith('data:text/html')) {
        if (url.includes('#jei-bookmarks')) {
          addressBar.value = INTERNAL_BOOKMARKS
          return
        }
        if (url.includes('#jei-history')) {
          addressBar.value = INTERNAL_HISTORY
          return
        }
        if (url.includes('#jei-settings')) {
          addressBar.value = INTERNAL_SETTINGS
          return
        }

        addressBar.value = INTERNAL_HOME
        return
      }

      addressBar.value = url
    } catch {
      addressBar.value = ''
    }
  }

  function switchTab(tabId: string): void {
    activeTabId.value = tabId
    updateAddressBar()
  }

  function createNewTab(url?: string): void {
    const tabId = `tab-${tabCounter++}`
    tabs.value.push({ id: tabId, title: 'New Tab', src: normalizeUrl(url || homePage.value) })
    switchTab(tabId)
  }

  function closeTab(tabId: string): void {
    const tabIndex = tabs.value.findIndex((item) => item.id === tabId)
    if (tabIndex < 0) return

    tabs.value.splice(tabIndex, 1)
    webviews.delete(tabId)

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
    const webview = getActiveWebview()
    if (!webview) return
    webview.loadURL(normalizeUrl(url))
  }

  function bindWebviewEvents(tabId: string, webview: WebviewTag): void {
    const mark = webview.getAttribute('data-events-bound')
    if (mark === '1') return
    webview.setAttribute('data-events-bound', '1')

    webview.addEventListener('dom-ready', () => {
      if (activeTabId.value === tabId) {
        updateAddressBar()
        updateTabTitle(tabId)
      }
    })

    webview.addEventListener('page-title-updated', (event: Event) => {
      const payload = event as Event & { title?: string }
      updateTabTitle(tabId, payload.title)
    })

    webview.addEventListener('did-navigate', () => {
      if (activeTabId.value === tabId) updateAddressBar()
    })

    webview.addEventListener('did-navigate-in-page', () => {
      if (activeTabId.value === tabId) updateAddressBar()
    })

    webview.addEventListener('new-window', (event: Event) => {
      const payload = event as Event & { url?: string }
      if (payload.url) createNewTab(payload.url)
    })
  }

  function loadBookmarks(): void {
    ipcRenderer.send('get-bookmarks')
  }

  function saveBookmark(): void {
    const webview = getActiveWebview()
    if (!webview) return

    const rawUrl = webview.getURL()
    const bookmarkUrl = rawUrl.startsWith('data:text/html') ? addressBar.value : rawUrl
    if (!bookmarkUrl || isBookmarked.value) return

    ipcRenderer.send('save-bookmark', {
      title: webview.getTitle(),
      url: bookmarkUrl
    })
  }

  function removeBookmark(url: string): void {
    ipcRenderer.send('remove-bookmark', url)
  }

  function saveSettings(): void {
    const nextHome = settingHomepage.value.trim() ? settingHomepage.value.trim() : INTERNAL_HOME
    homePage.value = nextHome

    ipcRenderer.send('save-settings', {
      shortcut: settingShortcut.value,
      homePage: nextHome
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

  function minimizeWindow(): void {
    ipcRenderer.send('window-minimize')
  }

  function maximizeWindow(): void {
    ipcRenderer.send('window-maximize')
  }

  function closeWindow(): void {
    ipcRenderer.send('window-close')
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
    try {
      const preloadPath = await ipcRenderer.invoke('get-webview-preload-path')
      webviewPreloadPath.value = typeof preloadPath === 'string' && preloadPath.length > 0 ? preloadPath : null
    } catch {
      webviewPreloadPath.value = null
    }

    ipcRenderer.send('get-settings')
    loadBookmarks()

    ipcRenderer.on('bookmarks-data', (items: BookmarkItem[]) => {
      bookmarks.value = items
    })

    ipcRenderer.on('history-data', (items: HistoryItem[]) => {
      historyItems.value = items
    })

    ipcRenderer.on('settings-data', (settings: SettingsPayload) => {
      alwaysOnTop.value = settings.alwaysOnTop
      settingShortcut.value = settings.shortcut

      const nextHome = settings.homePage ? settings.homePage : INTERNAL_HOME
      settingHomepage.value = nextHome
      homePage.value = nextHome

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

    ipcRenderer.on('nav-back', navigateBack)
    ipcRenderer.on('nav-forward', navigateForward)
    ipcRenderer.on('nav-reload', reloadPage)
    ipcRenderer.on('nav-home', goHome)
    ipcRenderer.on('nav-new-tab', () => createNewTab(homePage.value))
  })

  return {
    tabs,
    bookmarks,
    historyItems,
    activeTabId,
    addressBar,
    alwaysOnTop,
    showHistoryModal,
    showSettingsModal,
    settingsStatus,
    settingShortcut,
    homePage,
    settingHomepage,
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
    goHome,
    navigateBack,
    navigateForward,
    reloadPage,
    saveBookmark,
    removeBookmark,
    openBookmarksManage,
    openHistory,
    openSettings,
    onAddressEnter,
    applyAlwaysOnTop,
    openBookmark,
    openBookmarkInNewTab,
    copyBookmarkLink,
    openHistoryItem,
    saveSettings
  }
}
