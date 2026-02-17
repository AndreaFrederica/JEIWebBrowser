export const INTERNAL_HOME = 'jei://home'
export const INTERNAL_BOOKMARKS = 'jei://bookmarks'
export const INTERNAL_HISTORY = 'jei://history'
export const INTERNAL_SETTINGS = 'jei://settings'

export interface HomeLink {
  group: 'mirrors' | 'friends' | 'sources'
  url: string
  desc: string
}

export const HOME_LINKS: HomeLink[] = [
  { group: 'mirrors', url: 'https://jei.mic.run', desc: '中国大陆访问镜像（Mic）' },
  { group: 'mirrors', url: 'https://cnjeiweb.sirrus.cc', desc: '中国大陆转跳（sirrus.cc）' },
  { group: 'mirrors', url: 'https://jeiweb.sirrus.cc', desc: 'CloudFlare 源（sirrus.cc）' },
  { group: 'mirrors', url: 'https://fastjeiweb.sirrus.cc', desc: 'EdgeOne 亚太源（sirrus.cc）' },
  { group: 'mirrors', url: 'https://jei.arcwolf.top', desc: 'EdgeOne 全球版（Arcwolf）' },
  { group: 'friends', url: 'https://end.shallow.ink', desc: '协议终端' },
  { group: 'friends', url: 'https://www.gamekee.com/zmd', desc: '终末地非官方 Wiki' },
  { group: 'sources', url: 'https://wiki.skland.com/endfield', desc: '官方 Wiki（数据来源之一）' }
]

export function isInternalUrl(value: string): boolean {
  return (
    value === INTERNAL_HOME ||
    value === INTERNAL_BOOKMARKS ||
    value === INTERNAL_HISTORY ||
    value === INTERNAL_SETTINGS
  )
}

export function getInternalTitle(value: string): string {
  if (value === INTERNAL_BOOKMARKS) return '书签管理'
  if (value === INTERNAL_HISTORY) return '历史记录'
  if (value === INTERNAL_SETTINGS) return '设置'
  return 'JEI Web'
}

