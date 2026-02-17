/**
 * JEI Browser - Webview Home API Type Definitions
 *
 * This file provides TypeScript definitions for APIs available in webview contexts.
 * @see https://github.com/AndreaFrederica/JEIWebBrowser
 */

declare global {
  /**
   * Site metadata returned by fetchSiteMeta
   */
  interface SiteMetadata {
    title?: string
    iconUrl?: string
  }

  /**
   * Bookmark entry
   */
  interface Bookmark {
    title: string
    url: string
  }

  /**
   * History entry
   */
  interface HistoryEntry {
    title: string
    url: string
    date: string
  }

  /**
   * Application settings
   */
  interface Settings {
    shortcut: string
    alwaysOnTop: boolean
    homePage: string
    showBookmarksBar: boolean
    tabBarLayout: 'horizontal' | 'vertical'
    searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'
    verticalTabsCollapsed: boolean
  }

  /**
   * Save settings result
   */
  interface SaveResult {
    success: boolean
  }

  /**
   * JEI Home API
   * Provides browser-level functionality for internal home pages.
   */
  interface JEIHomeAPI {
    /**
     * Fetches metadata for a given URL
     * @param url - The URL to fetch metadata for
     * @returns Promise containing site metadata (title, iconUrl) or null
     *
     * @example
     * const meta = await window.JEIHome.fetchSiteMeta('https://example.com')
     * if (meta) {
     *   console.log(meta.title, meta.iconUrl)
     * }
     */
    fetchSiteMeta(url: string): Promise<SiteMetadata | null>

    /**
     * Retrieves all bookmarks
     * @returns Promise containing array of bookmarks
     *
     * @example
     * const bookmarks = await window.JEIHome.getBookmarks()
     * bookmarks.forEach(b => console.log(b.title, b.url))
     */
    getBookmarks(): Promise<Bookmark[]>

    /**
     * Retrieves browsing history
     * @returns Promise containing array of history entries
     *
     * @example
     * const history = await window.JEIHome.getHistory()
     * history.forEach(h => console.log(h.title, h.url, h.date))
     */
    getHistory(): Promise<HistoryEntry[]>

    /**
     * Clears all browsing history
     * @returns Promise that resolves when history is cleared
     *
     * @example
     * await window.JEIHome.clearHistory()
     */
    clearHistory(): Promise<SaveResult>

    /**
     * Retrieves application settings
     * @returns Promise containing current settings
     *
     * @example
     * const settings = await window.JEIHome.getSettings()
     * console.log(settings.searchEngine, settings.tabBarLayout)
     */
    getSettings(): Promise<Settings>

    /**
     * Saves application settings
     * @param settings - Settings object to save
     * @returns Promise that resolves when settings are saved
     *
     * @example
     * const result = await window.JEIHome.saveSettings({
     *   searchEngine: 'google',
     *   tabBarLayout: 'vertical',
     *   // ... other settings
     * })
     */
    saveSettings(settings: Settings): Promise<SaveResult>

    /**
     * Opens a URL in a new tab
     * @param url - The URL to open
     * @returns Promise that resolves to true when the URL is queued
     *
     * @example
     * await window.JEIHome.openUrlInNewTab('https://example.com')
     */
    openUrlInNewTab(url: string): Promise<boolean>
  }

  /**
   * JEI Storage API
   * Provides persistent storage for webview pages, similar to localStorage
   * but persisted across sessions using the browser's electron-store backend.
   *
   * Default behavior is origin-isolated storage (protocol + host + port).
   * If a namespace is provided, data is stored in that namespace instead
   * of the current origin bucket.
   */
  interface JEIStorage {
    /**
     * Retrieves a value from storage
     * @param key - The key to retrieve
     * @param namespace - Optional namespace; when provided, reads from namespace storage
     * @returns Promise resolving to the stored value, or null if not found
     *
     * @example
     * const value = await window.JEIStorage.getItem('username')
     * const shared = await window.JEIStorage.getItem('token', 'shared-auth')
     */
    getItem(key: string, namespace?: string): Promise<string | null>

    /**
     * Stores a key-value pair
     * @param key - The key to store under
     * @param value - The value to store (will be converted to string)
     * @param namespace - Optional namespace; when provided, writes to namespace storage
     * @returns Promise that resolves when the value is stored
     *
     * @example
     * await window.JEIStorage.setItem('username', 'player1')
     * await window.JEIStorage.setItem('level', '42')
     * await window.JEIStorage.setItem('token', 'abc123', 'shared-auth')
     */
    setItem(key: string, value: string, namespace?: string): Promise<void>

    /**
     * Removes a single item from storage
     * @param key - The key to remove
     * @param namespace - Optional namespace; when provided, removes from namespace storage
     * @returns Promise that resolves when the item is removed
     *
     * @example
     * await window.JEIStorage.removeItem('cachedData')
     */
    removeItem(key: string, namespace?: string): Promise<void>

    /**
     * Clears all items for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, clears that namespace
     * @returns Promise that resolves when storage is cleared
     *
     * @example
     * await window.JEIStorage.clear()
     * await window.JEIStorage.clear('shared-auth')
     */
    clear(namespace?: string): Promise<void>

    /**
     * Gets all keys stored for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, lists namespace keys
     * @returns Promise resolving to an array of keys
     *
     * @example
     * const keys = await window.JEIStorage.keys()
     * console.log('Stored keys:', keys)
     */
    keys(namespace?: string): Promise<string[]>

    /**
     * Gets item count for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, counts namespace items
     * @returns Promise resolving to the count of stored items
     *
     * @example
     * const count = await window.JEIStorage.getLength()
     * console.log('Total items:', count)
     */
    getLength(namespace?: string): Promise<number>
  }

  /**
   * Global declarations for JEI Browser APIs
   * Available in webview preload contexts
   */
  interface Window {
    /**
     * JEI Home API - Browser-level functionality
     */
    JEIHome: JEIHomeAPI

    /**
     * JEI Storage API - Persistent storage for webview pages
     */
    JEIStorage: JEIStorage
  }
}

export {}
