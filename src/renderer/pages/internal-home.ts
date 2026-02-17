export const INTERNAL_HOME = 'jei://home'
export const INTERNAL_BOOKMARKS = 'jei://bookmarks'
export const INTERNAL_HISTORY = 'jei://history'
export const INTERNAL_SETTINGS = 'jei://settings'
export const INTERNAL_STORAGE = 'jei://storage'

export interface HomeLink {
  group: 'mirrors' | 'friends' | 'sources' | 'tools'
  url: string
  desc: string
}

export const HOME_LINKS: HomeLink[] = [
  { group: 'mirrors', url: 'https://jei.mic.run', desc: '中国大陆访问镜像（Mic）' },
//   { group: 'mirrors', url: 'https://cnjeiweb.sirrus.cc', desc: '中国大陆转跳（sirrus.cc）' },
  { group: 'mirrors', url: 'https://jeiweb.sirrus.cc', desc: 'CloudFlare 源（sirrus.cc）' },
  { group: 'mirrors', url: 'https://fastjeiweb.sirrus.cc', desc: 'EdgeOne 亚太源（sirrus.cc）' },
  { group: 'mirrors', url: 'https://jei.arcwolf.top', desc: 'EdgeOne 全球版（Arcwolf）' },
  { group: 'friends', url: 'https://end.shallow.ink', desc: '协议终端' },
  { group: 'friends', url: 'https://www.gamekee.com/zmd', desc: '终末地非官方 Wiki' },
  { group: 'sources', url: 'https://wiki.skland.com/endfield', desc: '终末地官方 Wiki' },
    { group: 'sources', url: 'https://github.com/Bakingss/factoriolab-zmd', desc: 'EndfieldLab' },
  { group: 'tools', url: 'https://github.com/AndreaFrederica/jei-web', desc: 'GitHub（JEI-Web）' },
  { group: 'tools', url: 'https://github.com/AndreaFrederica/JEIWebBrowser', desc: 'GitHub（JEI-Web浏览器）' },
  { group: 'tools', url: 'https://blog.sirrus.cc', desc: 'Blog' },
  { group: 'tools', url: 'https://wiki.sirrus.cc', desc: 'Wiki' },
  { group: 'tools', url: 'https://anh.sirrus.cc', desc: '小说助手 - 让你的VSCode变成专业的写作软件' },
  { group: 'tools', url: 'https://lunalauncher.sirrus.cc', desc: 'Luna Launcher - 高可定制的 Minecraft 启动器' }
]

export function isInternalUrl(value: string): boolean {
  return (
    value === INTERNAL_HOME ||
    value === INTERNAL_BOOKMARKS ||
    value === INTERNAL_HISTORY ||
    value === INTERNAL_SETTINGS ||
    value === INTERNAL_STORAGE
  )
}

export function getInternalTitle(value: string): string {
  if (value === INTERNAL_BOOKMARKS) return '书签管理'
  if (value === INTERNAL_HISTORY) return '历史记录'
  if (value === INTERNAL_SETTINGS) return '设置'
  if (value === INTERNAL_STORAGE) return '存储查看器'
  return 'JEI Web'
}

