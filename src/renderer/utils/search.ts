export type SearchEngineKey = 'google' | 'bing' | 'duckduckgo' | 'baidu'

export const SEARCH_ENGINE_OPTIONS: Array<{ key: SearchEngineKey; label: string }> = [
  { key: 'google', label: 'Google' },
  { key: 'bing', label: 'Bing' },
  { key: 'duckduckgo', label: 'DuckDuckGo' },
  { key: 'baidu', label: 'Baidu' }
]

export function normalizeSearchEngine(value: string): SearchEngineKey {
  if (value === 'google' || value === 'duckduckgo' || value === 'baidu') return value
  return 'bing'
}

export function buildSearchUrl(engine: SearchEngineKey, query: string): string {
  const q = encodeURIComponent(query)
  if (engine === 'bing') return `https://www.bing.com/search?q=${q}`
  if (engine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`
  if (engine === 'baidu') return `https://www.baidu.com/s?wd=${q}`
  return `https://www.google.com/search?q=${q}`
}

function looksLikeUrl(value: string): boolean {
  if (!value || /\s/.test(value)) return false
  if (value === 'localhost' || value.startsWith('localhost:')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(value)) return true
  if (value.includes('.')) return true
  return false
}

export function normalizeInputToUrl(raw: string, engine: SearchEngineKey): string {
  const value = (raw || '').trim()
  if (!value) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return value
  if (looksLikeUrl(value)) return `https://${value}`
  return buildSearchUrl(engine, value)
}
