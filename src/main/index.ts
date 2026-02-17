import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron'
import path from 'path'
import Store from 'electron-store'
import contextMenu from 'electron-context-menu'
import { URL, pathToFileURL } from 'url'
import * as tls from 'node:tls'

interface Settings {
  shortcut: string
  alwaysOnTop: boolean
  transparencyEnabled: boolean
  windowOpacity: number
  homePage: string
  showBookmarksBar: boolean
  tabBarLayout: 'horizontal' | 'vertical'
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
  verticalTabsCollapsed: boolean
}

interface ConnectionCertificateInfo {
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

function normalizeSearchEngine(value: unknown): Settings['searchEngine'] {
  if (value === 'google' || value === 'duckduckgo' || value === 'baidu') return value
  return 'bing'
}

// Define the store schema for better typing if possible, but for now simple usage
const store = new Store<any>()
const INTERNAL_HOME = 'jei://home'
const WEBVIEW_HOME_PRELOAD_PATH = path.join(__dirname, '../preload/webview-home.mjs')
const APP_ICON_PATH = path.join(__dirname, '../../icons/icon.png')
const THUMBAR_QUIT_ICON_PATH = path.join(__dirname, '../../icons/favicon-16x16.png')
const TRAY_ICON_PATH = path.join(__dirname, '../../icons/favicon-32x32.png')

// Custom User-Agent suffix for JEI Browser
// Note: Electron automatically adds "JEIBrowser/1.0.0" based on productName
// This suffix adds project identification for web servers
const JEI_BROWSER_UA = ' (JEIWebBrowser; https://github.com/AndreaFrederica/JEIWebBrowser)'

// Get the full User-Agent by appending JEI identifier to Chromium's UA
function getJEIUserAgent(): string {
  const chromiumUA = app.userAgentFallback
  return chromiumUA + JEI_BROWSER_UA
}

// Set app name
app.setName('JEI Browser')

// Initialize electron-context-menu
contextMenu({
  showSaveImageAs: true,
  showCopyImage: true,
  showInspectElement: true,
  prepend: (_defaultActions, params, browserWindow) => {
    const win = (browserWindow as unknown as BrowserWindow | undefined) ?? mainWindow ?? undefined
    const wc = win?.webContents
    const items: any[] = []

    if (params.linkURL) {
      items.push(
        {
          label: '在新标签页打开链接',
          click: () => wc?.send('open-url-in-new-tab', params.linkURL)
        },
        {
          label: '在新窗口打开链接',
          click: () => createAuxWindow(params.linkURL)
        },
        {
          label: '复制链接地址',
          click: () => clipboard.writeText(params.linkURL)
        },
        { type: 'separator' }
      )
    }

    if (params.mediaType === 'image' && params.srcURL) {
      items.push(
        {
          label: '在新标签页打开图片',
          click: () => wc?.send('open-url-in-new-tab', params.srcURL)
        },
        {
          label: '复制图片地址',
          click: () => clipboard.writeText(params.srcURL)
        },
        { type: 'separator' }
      )
    }

    items.push(
      { label: '后退', click: () => wc?.send('nav-back') },
      { label: '前进', click: () => wc?.send('nav-forward') },
      { label: '重新加载', click: () => wc?.send('nav-reload') },
      { label: '主页', click: () => wc?.send('nav-home') },
      { label: '新建标签页', click: () => wc?.send('nav-new-tab') }
    )

    return items
  }
})

let mainWindow: BrowserWindow | null = null
const auxWindows = new Set<BrowserWindow>()
let tray: Tray | null = null
let isAppQuitting = false
const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])
const DEFAULT_WINDOW_OPACITY = 0.85
const MIN_WINDOW_OPACITY = 0.35

function clampWindowOpacity(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_WINDOW_OPACITY
  if (numeric < MIN_WINDOW_OPACITY) return MIN_WINDOW_OPACITY
  if (numeric > 1) return 1
  return Math.round(numeric * 100) / 100
}

// Get settings with defaults
function getSettings(): Settings {
  const tabBarLayout = store.get('tabBarLayout', 'horizontal')
  const normalizedLayout = tabBarLayout === 'vertical' ? 'vertical' : 'horizontal'
  const searchEngine = normalizeSearchEngine(store.get('searchEngine', 'bing'))
  const windowOpacity = clampWindowOpacity(store.get('windowOpacity', DEFAULT_WINDOW_OPACITY))

  return {
    shortcut: store.get('shortcut', 'CommandOrControl+F8') as string,
    alwaysOnTop: store.get('alwaysOnTop', true) as boolean,
    transparencyEnabled: store.get('transparencyEnabled', false) as boolean,
    windowOpacity,
    homePage: store.get('homePage', INTERNAL_HOME) as string,
    showBookmarksBar: store.get('showBookmarksBar', true) as boolean,
    tabBarLayout: normalizedLayout,
    searchEngine,
    verticalTabsCollapsed: store.get('verticalTabsCollapsed', false) as boolean
  }
}

function safeStoreSet(key: string, value: unknown): boolean {
  try {
    store.set(key, value)
    return true
  } catch (e) {
    return false
  }
}

function normalizeBookmarkUrl(url: string): string {
  return (url || '').trim()
}

const allowedMetaUrls = new Set<string>([
  'https://jei.mic.run',
  'https://cnjeiweb.sirrus.cc',
  'https://jeiweb.sirrus.cc',
  'https://fastjeiweb.sirrus.cc',
  'https://jei.arcwolf.top',
  'https://end.shallow.ink',
  'https://www.gamekee.com/zmd',
  'https://wiki.skland.com/endfield'
])

const metaCache = new Map<string, { title?: string; iconUrl?: string }>()
const certificateCache = new Map<string, { expiresAt: number; value: ConnectionCertificateInfo | null }>()

function summarizeDn(dn: unknown): string {
  if (!dn || typeof dn !== 'object') return ''
  const source = dn as Record<string, unknown>
  const parts: string[] = []
  const push = (key: string, label: string) => {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      parts.push(`${label}=${value.trim()}`)
    }
  }

  push('CN', 'CN')
  push('O', 'O')
  push('OU', 'OU')
  push('L', 'L')
  push('ST', 'ST')
  push('C', 'C')
  return parts.join(', ')
}

async function fetchConnectionCertificate(targetUrl: string): Promise<ConnectionCertificateInfo | null> {
  let parsed: URL
  try {
    parsed = new URL((targetUrl || '').trim())
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null

  const host = parsed.hostname
  const port = parsed.port ? Number(parsed.port) : 443
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null

  const cacheKey = `${host}:${port}`
  const cached = certificateCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.value

  const result = await new Promise<ConnectionCertificateInfo | null>((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
      ALPNProtocols: ['h2', 'http/1.1']
    })

    let settled = false
    const finish = (value: ConnectionCertificateInfo | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (!socket.destroyed) socket.destroy()
      resolve(value)
    }

    const timeout = setTimeout(() => {
      finish(null)
    }, 6000)

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true) as tls.PeerCertificate | tls.DetailedPeerCertificate
      if (!cert || Object.keys(cert).length === 0) {
        finish(null)
        return
      }

      finish({
        host,
        port,
        subject: summarizeDn((cert as tls.DetailedPeerCertificate).subject),
        issuer: summarizeDn((cert as tls.DetailedPeerCertificate).issuer),
        validFrom: (cert as tls.DetailedPeerCertificate).valid_from || '',
        validTo: (cert as tls.DetailedPeerCertificate).valid_to || '',
        serialNumber: (cert as tls.DetailedPeerCertificate).serialNumber || '',
        fingerprint256: (cert as tls.DetailedPeerCertificate).fingerprint256 || '',
        subjectAltName: (cert as tls.DetailedPeerCertificate).subjectaltname || '',
        tlsProtocol: socket.getProtocol() || '',
        cipherName: socket.getCipher()?.name || '',
        authorized: socket.authorized,
        authorizationError:
          typeof socket.authorizationError === 'string'
            ? socket.authorizationError
            : socket.authorizationError?.message || ''
      })
    })

    socket.once('error', () => finish(null))
    socket.once('close', () => finish(null))
  })

  certificateCache.set(cacheKey, {
    expiresAt: now + (result ? 60_000 : 15_000),
    value: result
  })
  return result
}

function normalizeHistoryUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim()
  if (!url) return ''

  if (url.startsWith('data:text/html')) {
    if (url.includes('#jei-bookmarks')) return 'jei://bookmarks'
    if (url.includes('#jei-history')) return 'jei://history'
    if (url.includes('#jei-settings')) return 'jei://settings'
    return 'jei://home'
  }

  return url
}

function appendHistoryEntry(rawUrl: string, title: string): void {
  const url = normalizeHistoryUrl(rawUrl)
  if (!url || url === 'jei://history') return

  const history = ((store.get('history', []) as any[]) || []).filter((item) => item && typeof item.url === 'string')
  const latest = history[0]

  if (latest && latest.url === url) {
    if (!latest.title && title) {
      latest.title = title
      safeStoreSet('history', history)
    }
    return
  }

  history.unshift({
    url,
    title: title || url,
    date: new Date().toISOString()
  })

  if (history.length > 100) {
    history.splice(100)
  }

  safeStoreSet('history', history)
}

function ownerWindowFromWebContents(contents: WebContents): BrowserWindow | undefined {
  const host = (contents as WebContents & { hostWebContents?: WebContents }).hostWebContents
  return BrowserWindow.fromWebContents(host ?? contents) ?? mainWindow ?? undefined
}

function senderWindow(contents: WebContents): BrowserWindow | undefined {
  const host = (contents as WebContents & { hostWebContents?: WebContents }).hostWebContents
  return BrowserWindow.fromWebContents(host ?? contents) ?? mainWindow ?? undefined
}

function isCtrlF5(input: { type?: string; key?: string; control?: boolean }): boolean {
  return input.type === 'keyDown' && (input.key || '').toUpperCase() === 'F5' && !!input.control
}

function registerTaskbarThumbarButtons(win: BrowserWindow): void {
  if (process.platform !== 'win32') return

  const icon = nativeImage.createFromPath(THUMBAR_QUIT_ICON_PATH)
  if (icon.isEmpty()) return

  win.setThumbarButtons([
    {
      icon,
      tooltip: '彻底退出 JEI 浏览器',
      click: () => quitApplication()
    }
  ])
}

function showWindow(win: BrowserWindow): void {
  win.show()
  win.focus()
}

function hideWindow(win: BrowserWindow): void {
  win.hide()
}

function toggleWindowVisible(win: BrowserWindow): void {
  if (win.isVisible()) {
    hideWindow(win)
  } else {
    showWindow(win)
  }
}

function applyWindowTransparency(win: BrowserWindow, enabled: boolean, opacity: number): void {
  const targetOpacity = enabled ? clampWindowOpacity(opacity) : 1
  try {
    win.setOpacity(targetOpacity)
  } catch {
    // Ignore platforms that do not support opacity.
  }
}

function applyTransparencyToAllWindows(enabled: boolean, opacity: number): void {
  if (mainWindow) {
    applyWindowTransparency(mainWindow, enabled, opacity)
  }
  for (const win of auxWindows) {
    if (win.isDestroyed()) continue
    applyWindowTransparency(win, enabled, opacity)
  }
}

function quitApplication(): void {
  isAppQuitting = true
  app.quit()
}

function installWindowCloseGuard(win: BrowserWindow): void {
  win.on('close', (event) => {
    if (isAppQuitting) return
    if (win.webContents.isDestroyed()) return

    const currentUrl = win.webContents.getURL()
    if (!currentUrl || currentUrl === 'about:blank') return

    event.preventDefault()
    win.webContents.send('request-close-confirm')
  })
}

function createTrayIcon(): void {
  if (tray) return

  const trayImage = nativeImage.createFromPath(TRAY_ICON_PATH)
  if (trayImage.isEmpty()) return

  tray = new Tray(trayImage.resize({ width: 16, height: 16 }))
  tray.setToolTip('JEI 浏览器')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (!mainWindow) {
            createWindow()
            return
          }
          showWindow(mainWindow)
        }
      },
      {
        label: '隐藏窗口',
        click: () => {
          if (mainWindow) hideWindow(mainWindow)
        }
      },
      { type: 'separator' },
      {
        label: '彻底退出',
        click: () => quitApplication()
      }
    ])
  )

  tray.on('click', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    toggleWindowVisible(mainWindow)
  })
}

function installWebviewContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_event, params: ContextMenuParams) => {
    const ownerWindow = ownerWindowFromWebContents(contents)
    const ownerWebContents = ownerWindow?.webContents
    const template: MenuItemConstructorOptions[] = []

    if (params.linkURL) {
      template.push(
        {
          label: '在新标签页打开链接',
          click: () => ownerWebContents?.send('open-url-in-new-tab', params.linkURL)
        },
        {
          label: '在新窗口打开链接',
          click: () => createAuxWindow(params.linkURL)
        },
        {
          label: '复制链接地址',
          click: () => clipboard.writeText(params.linkURL)
        },
        { type: 'separator' }
      )
    }

    if (params.mediaType === 'image' && params.srcURL) {
      template.push(
        {
          label: '在新标签页打开图片',
          click: () => ownerWebContents?.send('open-url-in-new-tab', params.srcURL)
        },
        {
          label: '复制图片地址',
          click: () => clipboard.writeText(params.srcURL)
        },
        { type: 'separator' }
      )
    }

    template.push(
      {
        label: '后退',
        enabled: contents.navigationHistory.canGoBack(),
        click: () => contents.navigationHistory.goBack()
      },
      {
        label: '前进',
        enabled: contents.navigationHistory.canGoForward(),
        click: () => contents.navigationHistory.goForward()
      },
      { label: '重新加载', click: () => contents.reload() },
      { label: '主页', click: () => ownerWebContents?.send('nav-home') },
      { label: '新建标签页', click: () => ownerWebContents?.send('nav-new-tab') },
      { type: 'separator' }
    )

    if (params.isEditable) {
      template.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' }
      )
    } else {
      template.push({ role: 'copy' }, { role: 'selectAll' }, { type: 'separator' })
    }

    template.push({ label: '检查元素', click: () => contents.inspectElement(params.x, params.y) })

    Menu.buildFromTemplate(template).popup(ownerWindow ? { window: ownerWindow } : undefined)
  })
}

async function fetchSiteMeta(url: string): Promise<{ title?: string; iconUrl?: string } | null> {
  if (!allowedMetaUrls.has(url)) return null
  const cached = metaCache.get(url)
  if (cached) return cached

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
      }
    })
    const finalUrl = res.url || url
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : undefined

    let iconUrl: string | undefined
    const linkTags = html.match(/<link\b[^>]*>/gi) || []
    for (const tag of linkTags) {
      const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)
      const rel = relMatch?.[1]?.toLowerCase() || ''
      if (!rel.includes('icon')) continue
      const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)
      const href = hrefMatch?.[1]
      if (!href) continue
      try {
        iconUrl = new URL(href, finalUrl).toString()
        break
      } catch {}
    }

    if (!iconUrl) {
      try {
        iconUrl = new URL('/favicon.ico', finalUrl).toString()
      } catch {}
    }

    const result = { title, iconUrl }
    metaCache.set(url, result)
    return result
  } catch {
    return null
  }
}

function registerGlobalShortcut(shortcut: string): boolean {
  globalShortcut.unregisterAll()

  try {
    const ret = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        toggleWindowVisible(mainWindow)
      } else {
        createWindow()
      }
    })

    if (!ret) {
      console.log('Global shortcut registration failed:', shortcut)
      return false
    }
    return true
  } catch (error) {
    console.error('Failed to register shortcut:', error)
    return false
  }
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const settings = getSettings()

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    icon: APP_ICON_PATH,
    frame: false, // Frameless for custom UI and better overlay
    transparent: false, // Set to true if you want transparency, but usually false for a browser
    alwaysOnTop: settings.alwaysOnTop, // Initial state from settings
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true // Enable <webview> tag
    },
    show: false // Start hidden until ready
  })
  installWindowCloseGuard(mainWindow)

  // Apply correct alwaysOnTop level if enabled
  if (settings.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }
  applyWindowTransparency(mainWindow, settings.transparencyEnabled, settings.windowOpacity)
  registerTaskbarThumbarButtons(mainWindow)

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      const ok = await mainWindow?.webContents.executeJavaScript(
        'Boolean(window.ipc && typeof window.ipc.send === \"function\")',
        true
      )
      console.log('renderer ipc ready:', ok)
    } catch (e) {
      console.log('renderer ipc ready: error')
    }
  })
}

function createAuxWindow(initialUrl?: string): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const settings = getSettings()

  const win = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    icon: APP_ICON_PATH,
    frame: false,
    transparent: false,
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    },
    show: false
  })
  installWindowCloseGuard(win)

  auxWindows.add(win)
  registerTaskbarThumbarButtons(win)

  if (settings.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'screen-saver')
  }
  applyWindowTransparency(win, settings.transparencyEnabled, settings.windowOpacity)

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    auxWindows.delete(win)
  })

  if (initialUrl) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('open-url-in-new-tab', initialUrl)
    })
  }
}

if (!isDev) {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        showWindow(mainWindow)
      }
    })
  }
}

app.on('web-contents-created', (_event, contents) => {
  const contentsType = contents.getType()

  if (contentsType === 'window' || contentsType === 'webview') {
    contents.on('before-input-event', (event, input) => {
      if (!isCtrlF5(input)) return

      event.preventDefault()
      if (contentsType === 'webview') {
        contents.reloadIgnoringCache()
        return
      }

      contents.send('nav-hard-reload')
    })
  }

  if (contents.getType() === 'window') {
    contents.on('will-attach-webview', (_event, webPreferences) => {
      // Force a stable preload for every webview before its first navigation.
      webPreferences.preload = WEBVIEW_HOME_PRELOAD_PATH
      webPreferences.nodeIntegration = false
      webPreferences.contextIsolation = true
      webPreferences.sandbox = false
    })
  }

  if (contents.getType() === 'webview') {
    // Set custom User-Agent for JEI Browser
    contents.setUserAgent(getJEIUserAgent())

    // Intercept new window requests and open in new tab instead
    contents.setWindowOpenHandler(({ url }) => {
      // Send request to renderer to open URL in new tab
      const ownerWindow = ownerWindowFromWebContents(contents)
      ownerWindow?.webContents.send('open-url-in-new-tab', url)
      return { action: 'deny' } // Prevent default new window behavior
    })

    installWebviewContextMenu(contents)

    const record = (url?: string) => {
      const resolved = (url || '').trim() || contents.getURL() || ''
      appendHistoryEntry(resolved, contents.getTitle() || '')
    }

    contents.on('did-navigate', (_event, url) => {
      record(url)
    })

    contents.on('did-navigate-in-page', (_event, url) => {
      record(url)
    })

    contents.on('did-stop-loading', () => {
      record()
    })
  }
})

app.whenReady().then(() => {
  createWindow()
  createTrayIcon()

  const settings = getSettings()
  registerGlobalShortcut(settings.shortcut)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    quitApplication()
  }
})

app.on('before-quit', () => {
  isAppQuitting = true
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
  tray?.destroy()
  tray = null
})

// IPC handlers for window controls
ipcMain.on('window-minimize', (event) => {
  senderWindow(event.sender)?.minimize()
})

ipcMain.on('window-maximize', (event) => {
  const target = senderWindow(event.sender)
  if (target) {
    if (target.isMaximized()) {
      target.unmaximize()
    } else {
      target.maximize()
    }
  }
})

ipcMain.on('window-close', (event) => {
  const target = senderWindow(event.sender)
  if (target) {
    hideWindow(target)
  }
})

ipcMain.on('window-quit', () => {
  quitApplication()
})

ipcMain.on('toggle-always-on-top', (_event, flag: boolean) => {
  if (mainWindow) {
    // level: 'screen-saver' is higher than normal 'alwaysOnTop'
    // useful for overlaying games
    const level = flag ? 'screen-saver' : 'normal'
    mainWindow.setAlwaysOnTop(flag, level)
    safeStoreSet('alwaysOnTop', flag)
  }
})

ipcMain.on('toggle-window-transparency', (_event, enabled: boolean) => {
  const nextEnabled = !!enabled
  safeStoreSet('transparencyEnabled', nextEnabled)
  const opacity = clampWindowOpacity(store.get('windowOpacity', DEFAULT_WINDOW_OPACITY))
  applyTransparencyToAllWindows(nextEnabled, opacity)
})

ipcMain.on('set-window-opacity', (_event, opacity: number) => {
  const nextOpacity = clampWindowOpacity(opacity)
  safeStoreSet('windowOpacity', nextOpacity)
  const enabled = !!store.get('transparencyEnabled', false)
  applyTransparencyToAllWindows(enabled, nextOpacity)
})

ipcMain.on('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  }
})

// Open DevTools for a specific webview by its WebContents ID
ipcMain.on('open-webview-devtools', (_event, webContentsId: number) => {
  const { webContents } = require('electron')
  const contents = webContents.fromId(webContentsId)
  if (contents) {
    if (contents.isDevToolsOpened()) {
      contents.closeDevTools()
    } else {
      contents.openDevTools({ mode: 'detach' })
    }
  }
})

ipcMain.on('get-bookmarks', (event) => {
  event.reply('bookmarks-data', store.get('bookmarks', []))
})

ipcMain.handle('get-bookmarks-data', async () => {
  return store.get('bookmarks', [])
})

ipcMain.on('save-bookmark', (event, bookmark) => {
  const bookmarks = ((store.get('bookmarks', []) as any[]) || []).filter(
    (item) => item && typeof item.url === 'string'
  )

  const nextUrl = normalizeBookmarkUrl(bookmark?.url || '')
  const exists = bookmarks.some((item) => normalizeBookmarkUrl(item.url) === nextUrl)

  if (!exists && nextUrl) {
    bookmarks.push({
      title: bookmark?.title || nextUrl,
      url: nextUrl
    })
  }

  safeStoreSet('bookmarks', bookmarks)
  event.reply('bookmarks-data', bookmarks)
})

ipcMain.on('remove-bookmark', (event, url: string) => {
  const target = normalizeBookmarkUrl(url)
  const bookmarks = ((store.get('bookmarks', []) as any[]) || []).filter(
    (item) => normalizeBookmarkUrl(item?.url || '') !== target
  )

  safeStoreSet('bookmarks', bookmarks)
  event.reply('bookmarks-data', bookmarks)
})

ipcMain.on('get-history', (event) => {
  event.reply('history-data', store.get('history', []))
})

ipcMain.handle('get-history-data', async () => {
  return store.get('history', [])
})

ipcMain.handle('clear-history-data', async () => {
  safeStoreSet('history', [])
  return { success: true }
})

ipcMain.on('save-history', (_event, entry) => {
  const url = typeof entry?.url === 'string' ? entry.url : ''
  const title = typeof entry?.title === 'string' ? entry.title : ''
  appendHistoryEntry(url, title)
})

// Settings IPC
ipcMain.on('get-settings', (event) => {
  event.reply('settings-data', getSettings())
})

ipcMain.handle('get-settings-data', async () => {
  return getSettings()
})

ipcMain.on('save-settings', (event, newSettings: Settings) => {
  const current = getSettings()
  const nextShortcut = typeof newSettings?.shortcut === 'string' ? newSettings.shortcut : current.shortcut
  const nextHomePage = typeof newSettings?.homePage === 'string' ? newSettings.homePage : current.homePage
  const nextTransparencyEnabled =
    typeof newSettings?.transparencyEnabled === 'boolean' ? newSettings.transparencyEnabled : current.transparencyEnabled
  const nextWindowOpacity =
    typeof newSettings?.windowOpacity === 'number' ? clampWindowOpacity(newSettings.windowOpacity) : current.windowOpacity
  const nextShowBookmarksBar =
    typeof newSettings?.showBookmarksBar === 'boolean' ? newSettings.showBookmarksBar : current.showBookmarksBar
  const nextSearchEngine = normalizeSearchEngine(newSettings?.searchEngine)
  const nextVerticalTabsCollapsed =
    typeof newSettings?.verticalTabsCollapsed === 'boolean'
      ? newSettings.verticalTabsCollapsed
      : current.verticalTabsCollapsed
  const nextTabBarLayout =
    newSettings?.tabBarLayout === 'vertical'
      ? 'vertical'
      : newSettings?.tabBarLayout === 'horizontal'
        ? 'horizontal'
        : current.tabBarLayout

  safeStoreSet('shortcut', nextShortcut)
  safeStoreSet('homePage', nextHomePage)
  safeStoreSet('transparencyEnabled', nextTransparencyEnabled)
  safeStoreSet('windowOpacity', nextWindowOpacity)
  safeStoreSet('showBookmarksBar', nextShowBookmarksBar)
  safeStoreSet('searchEngine', nextSearchEngine)
  safeStoreSet('tabBarLayout', nextTabBarLayout)
  safeStoreSet('verticalTabsCollapsed', nextVerticalTabsCollapsed)
  // alwaysOnTop is handled separately by toggle-always-on-top usually, but we can sync here too
  applyTransparencyToAllWindows(nextTransparencyEnabled, nextWindowOpacity)

  // Re-register shortcut
  const success = registerGlobalShortcut(nextShortcut)
  event.reply('save-settings-reply', { success })
})

ipcMain.handle('save-settings-data', async (_event, newSettings: Settings) => {
  const current = getSettings()
  const nextShortcut = typeof newSettings?.shortcut === 'string' ? newSettings.shortcut : current.shortcut
  const nextHomePage = typeof newSettings?.homePage === 'string' ? newSettings.homePage : current.homePage
  const nextAlwaysOnTop = typeof newSettings?.alwaysOnTop === 'boolean' ? newSettings.alwaysOnTop : current.alwaysOnTop
  const nextTransparencyEnabled =
    typeof newSettings?.transparencyEnabled === 'boolean' ? newSettings.transparencyEnabled : current.transparencyEnabled
  const nextWindowOpacity =
    typeof newSettings?.windowOpacity === 'number' ? clampWindowOpacity(newSettings.windowOpacity) : current.windowOpacity
  const nextTabBarLayout =
    newSettings?.tabBarLayout === 'vertical'
      ? 'vertical'
      : newSettings?.tabBarLayout === 'horizontal'
        ? 'horizontal'
        : current.tabBarLayout
  const nextShowBookmarksBar =
    typeof newSettings?.showBookmarksBar === 'boolean' ? newSettings.showBookmarksBar : current.showBookmarksBar
  const nextSearchEngine = normalizeSearchEngine(newSettings?.searchEngine)
  const nextVerticalTabsCollapsed =
    typeof newSettings?.verticalTabsCollapsed === 'boolean'
      ? newSettings.verticalTabsCollapsed
      : current.verticalTabsCollapsed

  safeStoreSet('shortcut', nextShortcut)
  safeStoreSet('homePage', nextHomePage)
  safeStoreSet('alwaysOnTop', nextAlwaysOnTop)
  safeStoreSet('transparencyEnabled', nextTransparencyEnabled)
  safeStoreSet('windowOpacity', nextWindowOpacity)
  safeStoreSet('showBookmarksBar', nextShowBookmarksBar)
  safeStoreSet('searchEngine', nextSearchEngine)
  safeStoreSet('tabBarLayout', nextTabBarLayout)
  safeStoreSet('verticalTabsCollapsed', nextVerticalTabsCollapsed)

  if (mainWindow) {
    const level = nextAlwaysOnTop ? 'screen-saver' : 'normal'
    mainWindow.setAlwaysOnTop(nextAlwaysOnTop, level)
  }
  applyTransparencyToAllWindows(nextTransparencyEnabled, nextWindowOpacity)

  const success = registerGlobalShortcut(nextShortcut)
  return { success }
})

ipcMain.on('open-url-in-new-tab', (event, url: string) => {
  const host = (event.sender as WebContents & { hostWebContents?: WebContents }).hostWebContents
  const senderWin = BrowserWindow.fromWebContents(host ?? event.sender)
  if (url) {
    senderWin?.webContents.send('open-url-in-new-tab', url)
  }
})

ipcMain.handle('fetch-site-meta', async (_event, url: string) => {
  return fetchSiteMeta(url)
})

ipcMain.handle('get-webview-preload-path', async () => {
  return pathToFileURL(WEBVIEW_HOME_PRELOAD_PATH).toString()
})

ipcMain.handle('get-connection-certificate', async (_event, targetUrl: string) => {
  return fetchConnectionCertificate(targetUrl)
})

// WebView persistent storage API
// Store key-value pairs with origin scope by default, or namespace scope when provided.
const webviewStore = new Store<any>({ name: 'webview-storage' })
const ORIGIN_STORAGE_PREFIX = 'storage:'
const NAMESPACE_STORAGE_PREFIX = 'storage-ns:'
const NAMESPACE_SCOPE_PREFIX = 'namespace://'

function normalizeNamespace(namespace?: string | null): string | null {
  if (typeof namespace !== 'string') return null
  const trimmed = namespace.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Get storage key for a specific origin
function getStorageKey(origin: string, key: string, namespace?: string | null): string {
  const normalizedNamespace = normalizeNamespace(namespace)
  if (normalizedNamespace) {
    return `${NAMESPACE_STORAGE_PREFIX}${normalizedNamespace}:${key}`
  }
  return `${ORIGIN_STORAGE_PREFIX}${origin}:${key}`
}

// Get all keys for a specific origin or namespace
function getScopedKeys(origin: string, namespace?: string | null): string[] {
  const allKeys = Object.keys((webviewStore.store as Record<string, unknown>) || {})
  const normalizedNamespace = normalizeNamespace(namespace)
  const prefix = normalizedNamespace
    ? `${NAMESPACE_STORAGE_PREFIX}${normalizedNamespace}:`
    : `${ORIGIN_STORAGE_PREFIX}${origin}:`
  return allKeys.filter((k) => k.startsWith(prefix)).map((k) => k.substring(prefix.length))
}

function clearScopedStorage(origin: string, namespace?: string | null): void {
  const allKeys = Object.keys((webviewStore.store as Record<string, unknown>) || {})
  const normalizedNamespace = normalizeNamespace(namespace)
  const prefix = normalizedNamespace
    ? `${NAMESPACE_STORAGE_PREFIX}${normalizedNamespace}:`
    : `${ORIGIN_STORAGE_PREFIX}${origin}:`
  for (const key of allKeys) {
    if (key.startsWith(prefix)) {
      webviewStore.delete(key)
    }
  }
}

function parseAdminScope(scope: string): { origin: string; namespace?: string } {
  if (scope.startsWith(NAMESPACE_SCOPE_PREFIX)) {
    const namespace = normalizeNamespace(scope.slice(NAMESPACE_SCOPE_PREFIX.length))
    if (namespace) {
      return { origin: '', namespace }
    }
  }
  return { origin: scope }
}

ipcMain.handle('webview-storage-get', async (_event, origin: string, key: string, namespace?: string) => {
  const storageKey = getStorageKey(origin, key, namespace)
  return webviewStore.get(storageKey, null)
})

ipcMain.handle('webview-storage-set', async (_event, origin: string, key: string, value: unknown, namespace?: string) => {
  const storageKey = getStorageKey(origin, key, namespace)
  webviewStore.set(storageKey, value)
  return true
})

ipcMain.handle('webview-storage-remove', async (_event, origin: string, key: string, namespace?: string) => {
  const storageKey = getStorageKey(origin, key, namespace)
  webviewStore.delete(storageKey)
  return true
})

ipcMain.handle('webview-storage-clear', async (_event, origin: string, namespace?: string) => {
  clearScopedStorage(origin, namespace)
  return true
})

ipcMain.handle('webview-storage-keys', async (_event, origin: string, namespace?: string) => {
  return getScopedKeys(origin, namespace)
})

ipcMain.handle('webview-storage-getLength', async (_event, origin: string, namespace?: string) => {
  return getScopedKeys(origin, namespace).length
})

// Admin API: Get all storage data across all origins (for storage viewer)
ipcMain.handle('webview-storage-getAll', async () => {
  const allKeys = Object.keys((webviewStore.store as Record<string, unknown>) || {})
  const result: Record<string, Array<{ key: string; value: unknown }>> = {}

  for (const fullKey of allKeys) {
    const parts = fullKey.split(':')
    let scope = ''
    let actualKey = ''

    if (fullKey.startsWith(ORIGIN_STORAGE_PREFIX)) {
      if (parts.length < 3) continue
      scope = parts.slice(1, -1).join(':')
      actualKey = parts[parts.length - 1]
    } else if (fullKey.startsWith(NAMESPACE_STORAGE_PREFIX)) {
      if (parts.length < 3) continue
      const namespace = parts.slice(1, -1).join(':')
      if (!namespace) continue
      scope = `${NAMESPACE_SCOPE_PREFIX}${namespace}`
      actualKey = parts[parts.length - 1]
    } else {
      continue
    }

    const value = webviewStore.get(fullKey)

    if (!result[scope]) {
      result[scope] = []
    }
    result[scope].push({ key: actualKey, value })
  }

  return result
})

// Admin API: Delete a specific storage item by origin and key
ipcMain.handle('webview-storage-admin-delete', async (_event, scope: string, key: string) => {
  const parsed = parseAdminScope(scope)
  const storageKey = getStorageKey(parsed.origin, key, parsed.namespace)
  webviewStore.delete(storageKey)
  return true
})

// Admin API: Set a specific storage item by origin and key
ipcMain.handle('webview-storage-admin-set', async (_event, scope: string, key: string, value: unknown) => {
  const parsed = parseAdminScope(scope)
  const storageKey = getStorageKey(parsed.origin, key, parsed.namespace)
  webviewStore.set(storageKey, value)
  return true
})

// Admin API: Clear all storage for a specific origin
ipcMain.handle('webview-storage-admin-clear-origin', async (_event, scope: string) => {
  const parsed = parseAdminScope(scope)
  clearScopedStorage(parsed.origin, parsed.namespace)
  return true
})

// Admin API: Clear all storage data
ipcMain.handle('webview-storage-admin-clear-all', async () => {
  const allKeys = Object.keys((webviewStore.store as Record<string, unknown>) || {})
  for (const key of allKeys) {
    if (key.startsWith(ORIGIN_STORAGE_PREFIX) || key.startsWith(NAMESPACE_STORAGE_PREFIX)) {
      webviewStore.delete(key)
    }
  }
  return true
})

// Admin API: Open the storage data directory in system file manager
ipcMain.handle('webview-storage-open-dir', async () => {
  try {
    // electron-store stores data in app.getPath('userData')
    const userDataPath = app.getPath('userData')
    await shell.openPath(userDataPath)
    return true
  } catch (e) {
    console.error('Failed to open storage directory:', e)
    return false
  }
})
