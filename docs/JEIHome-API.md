# JEI Home API 文档

浏览器内部页面的浏览器级功能 API。

## 概述

`JEIHome` 提供访问浏览器功能，如书签、历史记录、设置和导航控制。此 API 适用于内部页面（如主页）以与浏览器状态交互。

## 可用性

该 API 在 webview 上下文中通过 `window.JEIHome` 可用。

```javascript
// 检查 API 是否可用
if (window.JEIHome) {
  // 使用 JEIHome
}
```

## API 参考

### fetchSiteMeta(url)

获取给定 URL 的元数据。

**参数：**
- `url` (string) - 要获取元数据的 URL

**返回值：** `Promise<SiteMetadata | null>` - 站点元数据，如果不允许该 URL 则为 null

**示例：**
```javascript
const meta = await window.JEIHome.fetchSiteMeta('https://example.com')
if (meta) {
  console.log(meta.title)    // 'Example Domain'
  console.log(meta.iconUrl)  // 'https://example.com/favicon.ico'
}
```

**SiteMetadata 接口：**
```typescript
interface SiteMetadata {
  title?: string       // 页面标题
  iconUrl?: string     // 图标 URL
}
```

**注意：** 只有以下 URL 允许获取元数据：
- `https://jei.mic.run`
- `https://cnjeiweb.sirrus.cc`
- `https://jeiweb.sirrus.cc`
- `https://fastjeiweb.sirrus.cc`
- `https://jei.arcwolf.top`
- `https://end.shallow.ink`
- `https://www.gamekee.com/zmd`
- `https://wiki.skland.com/endfield`

### getBookmarks()

获取所有书签。

**返回值：** `Promise<Bookmark[]>` - 书签数组

**示例：**
```javascript
const bookmarks = await window.JEIHome.getBookmarks()
bookmarks.forEach(bookmark => {
  console.log(`${bookmark.title}: ${bookmark.url}`)
})
```

**Bookmark 接口：**
```typescript
interface Bookmark {
  title: string    // 书签标题
  url: string      // 书签 URL
}
```

### getHistory()

获取浏览历史。

**返回值：** `Promise<HistoryEntry[]>` - 历史记录数组

**示例：**
```javascript
const history = await window.JEIHome.getHistory()
const recent = history.slice(0, 10) // 最近 10 条
```

**HistoryEntry 接口：**
```typescript
interface HistoryEntry {
  title: string    // 页面标题
  url: string      // 页面 URL
  date: string     // 访问日期 (ISO 8601 格式)
}
```

### clearHistory()

清除所有浏览历史。

**返回值：** `Promise<SaveResult>` - 清除结果

**示例：**
```javascript
const result = await window.JEIHome.clearHistory()
if (result.success) {
  console.log('历史记录已清除')
}
```

**SaveResult 接口：**
```typescript
interface SaveResult {
  success: boolean
}
```

### getSettings()

获取当前浏览器设置。

**返回值：** `Promise<Settings>` - 当前设置对象

**示例：**
```javascript
const settings = await window.JEIHome.getSettings()
console.log('搜索引擎:', settings.searchEngine)
console.log('标签页布局:', settings.tabBarLayout)
```

**Settings 接口：**
```typescript
interface Settings {
  shortcut: string                    // 全局快捷键
  alwaysOnTop: boolean                // 窗口置顶
  homePage: string                    // 主页 URL
  showBookmarksBar: boolean           // 显示书签栏
  tabBarLayout: 'horizontal' | 'vertical'  // 标签栏布局
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'baidu'  // 搜索引擎
  verticalTabsCollapsed: boolean      // 垂直标签页折叠状态
}
```

### saveSettings(settings)

保存浏览器设置。

**参数：**
- `settings` (Settings) - 要保存的设置对象

**返回值：** `Promise<SaveResult>` - 保存结果

**示例：**
```javascript
const result = await window.JEIHome.saveSettings({
  shortcut: 'CommandOrControl+Shift+J',
  alwaysOnTop: false,
  homePage: 'jei://home',
  showBookmarksBar: true,
  tabBarLayout: 'vertical',
  searchEngine: 'google',
  verticalTabsCollapsed: false
})

if (result.success) {
  console.log('设置已保存')
}
```

### openUrlInNewTab(url)

在新标签页中打开 URL。

**参数：**
- `url` (string) - 要打开的 URL

**返回值：** `Promise<boolean>` - 成功时解析为 `true`

**示例：**
```javascript
// 在新标签页打开链接
await window.JEIHome.openUrlInNewTab('https://example.com')

// 搜索功能
async function search(query) {
  const settings = await window.JEIHome.getSettings()
  const searchUrl = getSearchUrl(query, settings.searchEngine)
  await window.JEIHome.openUrlInNewTab(searchUrl)
}

function getSearchUrl(query, engine) {
  const engines = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    baidu: 'https://www.baidu.com/s?wd='
  }
  return engines[engine] + encodeURIComponent(query)
}
```

## 使用示例

### 书签管理器

```javascript
async function displayBookmarks() {
  const bookmarks = await window.JEIHome.getBookmarks()

  const container = document.getElementById('bookmarks')
  container.innerHTML = ''

  bookmarks.forEach(bookmark => {
    const item = document.createElement('div')
    item.className = 'bookmark-item'

    const link = document.createElement('a')
    link.href = bookmark.url
    link.textContent = bookmark.title

    item.appendChild(link)
    container.appendChild(item)
  })
}
```

### 设置面板

```javascript
async function loadSettings() {
  const settings = await window.JEIHome.getSettings()

  // 填充表单字段
  document.getElementById('searchEngine').value = settings.searchEngine
  document.getElementById('tabBarLayout').value = settings.tabBarLayout
  document.getElementById('alwaysOnTop').checked = settings.alwaysOnTop
  document.getElementById('showBookmarksBar').checked = settings.showBookmarksBar
}

async function saveCurrentSettings() {
  const settings = {
    shortcut: document.getElementById('shortcut').value,
    alwaysOnTop: document.getElementById('alwaysOnTop').checked,
    homePage: document.getElementById('homePage').value,
    showBookmarksBar: document.getElementById('showBookmarksBar').checked,
    tabBarLayout: document.getElementById('tabBarLayout').value,
    searchEngine: document.getElementById('searchEngine').value,
    verticalTabsCollapsed: document.getElementById('verticalTabsCollapsed').checked
  }

  const result = await window.JEIHome.saveSettings(settings)
  if (result.success) {
    alert('设置已保存！')
  }
}
```

### 搜索功能

```javascript
async function performSearch(query) {
  const settings = await window.JEIHome.getSettings()
  const searchUrls = {
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`
  }

  const searchUrl = searchUrls[settings.searchEngine]
  await window.JEIHome.openUrlInNewTab(searchUrl)
}

// 搜索输入框处理
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    performSearch(e.target.value)
  }
})
```

### 历史记录显示

```javascript
async function displayRecentHistory(count = 10) {
  const history = await window.JEIHome.getHistory()

  // 按日期排序（最新的在前）
  const recent = history
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)

  const container = document.getElementById('history')
  container.innerHTML = ''

  recent.forEach(entry => {
    const item = document.createElement('div')
    item.className = 'history-item'

    const link = document.createElement('a')
    link.href = entry.url
    link.textContent = entry.title

    const time = document.createElement('span')
    time.textContent = new Date(entry.date).toLocaleString()

    item.appendChild(link)
    item.appendChild(time)
    container.appendChild(item)
  })
}

async function clearAllHistory() {
  if (confirm('确定要清除所有历史记录吗？')) {
    const result = await window.JEIHome.clearHistory()
    if (result.success) {
      displayRecentHistory()
    }
  }
}
```

## TypeScript 支持

包含 TypeScript 定义。从 preload 声明文件导入类型：

```typescript
// 类型定义自动可用
const api: JEIHomeAPI = window.JEIHome

// 使用正确的类型
const settings: Settings = await window.JEIHome.getSettings()
const bookmarks: Bookmark[] = await window.JEIHome.getBookmarks()
const result: SaveResult = await window.JEIHome.clearHistory()
```

## 错误处理

始终处理可能的错误：

```javascript
try {
  const bookmarks = await window.JEIHome.getBookmarks()
  // 处理书签
} catch (error) {
  console.error('加载书签失败:', error)
  // 向用户显示错误
}
```

## 另请参阅

- [JEIStorage API](./JEIStorage-API.md) - Webview 页面的持久存储
- [主进程文档](../README.md) - 整体浏览器架构
