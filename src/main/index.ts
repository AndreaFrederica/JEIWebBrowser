import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron'
import path from 'path'
import Store from 'electron-store'
import contextMenu from 'electron-context-menu'
import { URL, pathToFileURL } from 'url'

interface Settings {
  shortcut: string
  alwaysOnTop: boolean
  homePage: string
}

// Define the store schema for better typing if possible, but for now simple usage
const store = new Store<any>()
const INTERNAL_HOME = 'jei://home'
const WEBVIEW_HOME_PRELOAD_PATH = path.join(__dirname, '../preload/webview-home.mjs')

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
const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])

// Get settings with defaults
function getSettings(): Settings {
  return {
    shortcut: store.get('shortcut', 'CommandOrControl+F8') as string,
    alwaysOnTop: store.get('alwaysOnTop', true) as boolean,
    homePage: store.get('homePage', INTERNAL_HOME) as string
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
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
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

  // Apply correct alwaysOnTop level if enabled
  if (settings.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }

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

  auxWindows.add(win)

  if (settings.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'screen-saver')
  }

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
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()
      }
    })
  }
}

app.on('web-contents-created', (_event, contents) => {
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
    app.quit()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  // Instead of closing, hide the window to keep it running for quick toggle
  if (mainWindow) mainWindow.hide()
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
  safeStoreSet('shortcut', newSettings.shortcut)
  safeStoreSet('homePage', newSettings.homePage)
  // alwaysOnTop is handled separately by toggle-always-on-top usually, but we can sync here too

  // Re-register shortcut
  const success = registerGlobalShortcut(newSettings.shortcut)
  event.reply('save-settings-reply', { success })
})

ipcMain.handle('save-settings-data', async (_event, newSettings: Settings) => {
  safeStoreSet('shortcut', newSettings.shortcut)
  safeStoreSet('homePage', newSettings.homePage)
  safeStoreSet('alwaysOnTop', newSettings.alwaysOnTop)

  if (mainWindow) {
    const level = newSettings.alwaysOnTop ? 'screen-saver' : 'normal'
    mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop, level)
  }

  const success = registerGlobalShortcut(newSettings.shortcut)
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
