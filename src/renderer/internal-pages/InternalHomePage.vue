<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { HOME_LINKS, type HomeLink } from '../pages/internal-home'
import { normalizeInputToUrl, type SearchEngineKey } from '../utils/search'

const ipcRenderer =
  window.ipc ??
  ({
    send: () => {},
    invoke: async () => null,
    on: () => {}
  } as const)

const emit = defineEmits<{
  navigate: [url: string]
}>()

const props = defineProps<{
  searchEngine: SearchEngineKey
}>()

interface SiteCard extends HomeLink {
  title: string
  iconUrl: string
}

const query = ref('')
const cards = ref<SiteCard[]>(
  HOME_LINKS.map((item) => ({
    ...item,
    title: hostOf(item.url),
    iconUrl: fallbackIcon(item.url)
  }))
)

const mirrors = computed(() => cards.value.filter((item) => item.group === 'mirrors'))
const friends = computed(() => cards.value.filter((item) => item.group === 'friends'))
const sources = computed(() => cards.value.filter((item) => item.group === 'sources'))
const tools = computed(() => cards.value.filter((item) => item.group === 'tools'))
const META_TIMEOUT_MS = 4500
const gameExecutablePath = ref('')
const launcherExecutablePath = ref('')
const gameRunning = ref(false)
const launcherRunning = ref(false)
const launchToast = ref<{
  visible: boolean
  message: string
  type: 'success' | 'error'
}>({
  visible: false,
  message: '',
  type: 'success'
})
let hydrateToken = 0
let launchToastTimer: ReturnType<typeof setTimeout> | null = null
let launchStatusPollTimer: ReturnType<typeof setInterval> | null = null

function hostOf(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return value
  }
}

function fallbackIcon(url: string): string {
  const host = hostOf(url)
  const letter = (host[0] || 'J').toUpperCase()
  const hue = (Array.from(host).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 13) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="hsl(${hue} 60% 34%)"/>
  <text x="32" y="40" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="700">${letter}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function submit(): void {
  const target = normalizeInputToUrl(query.value, props.searchEngine)
  if (!target) return
  emit('navigate', target)
}

function open(url: string): void {
  emit('navigate', url)
}

async function loadLaunchPaths(): Promise<void> {
  try {
    const settings = await ipcRenderer.invoke('get-settings-data')
    if (!settings) return
    gameExecutablePath.value = typeof settings.gameExecutablePath === 'string' ? settings.gameExecutablePath : ''
    launcherExecutablePath.value =
      typeof settings.launcherExecutablePath === 'string' ? settings.launcherExecutablePath : ''
  } catch {
    // Ignore settings read errors on home page.
  }
}

async function refreshLaunchRuntimeStatus(): Promise<void> {
  try {
    const status = await ipcRenderer.invoke('get-launch-runtime-status')
    gameRunning.value = !!status?.gameRunning
    launcherRunning.value = !!status?.launcherRunning
  } catch {
    gameRunning.value = false
    launcherRunning.value = false
  }
}

async function launchConfiguredApp(target: 'game' | 'launcher'): Promise<void> {
  if (launchToastTimer) {
    clearTimeout(launchToastTimer)
    launchToastTimer = null
  }
  try {
    const result = (await ipcRenderer.invoke('launch-configured-app', target)) as { success?: boolean; message?: string } | null
    if (result?.success) {
      launchToast.value = {
        visible: true,
        message: target === 'game' ? '游戏启动成功' : '启动器已打开',
        type: 'success'
      }
      launchToastTimer = setTimeout(() => {
        launchToast.value.visible = false
        launchToastTimer = null
      }, 2400)
    } else {
      launchToast.value = {
        visible: true,
        message: result?.message || '启动失败，请先在设置中配置路径',
        type: 'error'
      }
      launchToastTimer = setTimeout(() => {
        launchToast.value.visible = false
        launchToastTimer = null
      }, 3200)
    }
  } catch {
    launchToast.value = {
      visible: true,
      message: '启动失败，请先在设置中配置路径',
      type: 'error'
    }
    launchToastTimer = setTimeout(() => {
      launchToast.value.visible = false
      launchToastTimer = null
    }, 3200)
  } finally {
    await refreshLaunchRuntimeStatus()
  }
}

async function hydrateCards(): Promise<void> {
  const currentToken = ++hydrateToken
  for (const card of cards.value) {
    void (async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), META_TIMEOUT_MS)
        })
        const meta = (await Promise.race([
          ipcRenderer.invoke('fetch-site-meta', card.url),
          timeoutPromise
        ])) as { title?: unknown; iconUrl?: unknown } | null

        if (hydrateToken !== currentToken || !meta) return

        if (typeof meta.title === 'string' && meta.title.trim()) {
          card.title = meta.title
        }
        if (typeof meta.iconUrl === 'string' && meta.iconUrl.trim()) {
          card.iconUrl = meta.iconUrl
        }
      } catch {
        // Ignore single-card failures.
      }
    })()
  }
}

onMounted(() => {
  void loadLaunchPaths()
  void refreshLaunchRuntimeStatus()
  launchStatusPollTimer = setInterval(() => {
    void refreshLaunchRuntimeStatus()
  }, 1500)
  void hydrateCards()
})

onBeforeUnmount(() => {
  hydrateToken += 1
  if (launchToastTimer) {
    clearTimeout(launchToastTimer)
    launchToastTimer = null
  }
  if (launchStatusPollTimer) {
    clearInterval(launchStatusPollTimer)
    launchStatusPollTimer = null
  }
})
</script>

<template>
  <div class="page-wrap">
    <h1>欢迎来到 JEI Web</h1>
    <div class="sub">
      <span class="pill">官方 QQ 群：<b>1080814651</b></span>
      <button class="join-btn" @click="open('http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=Zp45eM6yAUVlPrg_lO03L3E_Ctul4mvo&authKey=1Cgzkg3Msjbrd8dmWVXi%2Fm2VaB9wU5XAsHc%2BQrHEthIO%2F9lL7AH5MrKvOhJXavDv&noverify=0&group_code=1080814651')">
        点击加入QQ交流群
      </button>
      <button
        class="launch-btn"
        :disabled="!gameExecutablePath || gameRunning"
        :title="!gameExecutablePath ? '请先在设置页配置游戏路径' : gameRunning ? '游戏正在运行中' : '启动游戏'"
        @click="launchConfiguredApp('game')"
      >
        {{ gameRunning ? '游戏运行中' : '启动游戏' }}
      </button>
      <button
        class="launch-btn"
        :disabled="!launcherExecutablePath || launcherRunning"
        :title="!launcherExecutablePath ? '请先在设置页配置启动器路径' : launcherRunning ? '启动器正在运行中' : '启动鹰角启动器'"
        @click="launchConfiguredApp('launcher')"
      >
        {{ launcherRunning ? '启动器运行中' : '启动鹰角启动器' }}
      </button>
      <button class="launch-btn secondary" @click="emit('navigate', 'jei://settings')">
        配置路径
      </button>
      <div class="note">有任何反馈和希望参与开发都可以加入，也支持明日方舟：终末地（以及任何我们支持的游戏和 Minecraft）的游戏讨论。</div>
    </div>

    <form class="search" @submit.prevent="submit">
      <input v-model="query" autocomplete="off" placeholder="网址 / 搜索关键词">
      <button type="submit">Go</button>
    </form>

    <section class="section">
      <h2>镜像与访问</h2>
      <div class="cards">
        <button v-for="item in mirrors" :key="item.url" class="card" @click="open(item.url)">
          <img class="icon" :src="item.iconUrl" alt="">
          <div class="meta">
            <div class="title">{{ item.title }}</div>
            <div class="desc">{{ item.desc }}</div>
            <div class="url">{{ item.url }}</div>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <h2>友链</h2>
      <div class="cards">
        <button v-for="item in friends" :key="item.url" class="card" @click="open(item.url)">
          <img class="icon" :src="item.iconUrl" alt="">
          <div class="meta">
            <div class="title">{{ item.title }}</div>
            <div class="desc">{{ item.desc }}</div>
            <div class="url">{{ item.url }}</div>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <h2>数据来源</h2>
      <div class="cards">
        <button v-for="item in sources" :key="item.url" class="card" @click="open(item.url)">
          <img class="icon" :src="item.iconUrl" alt="">
          <div class="meta">
            <div class="title">{{ item.title }}</div>
            <div class="desc">{{ item.desc }}</div>
            <div class="url">{{ item.url }}</div>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <h2>其他工具和资料</h2>
      <div class="cards">
        <button v-for="item in tools" :key="item.url" class="card" @click="open(item.url)">
          <img class="icon" :src="item.iconUrl" alt="">
          <div class="meta">
            <div class="title">{{ item.title }}</div>
            <div class="desc">{{ item.desc }}</div>
            <div class="url">{{ item.url }}</div>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <h2>声明</h2>
      <div class="note">免责声明：JEI-Web 和 Minecraft Mod JEI 没有任何隶属和其他关系，仅仅是灵感来源于 JEI Mod。</div>
    </section>

    <transition name="toast-fade">
      <div v-if="launchToast.visible" class="edge-toast" :class="launchToast.type">
        {{ launchToast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.page-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 20px;
  color: #d4d4d4;
}

h1 {
  margin: 0 0 10px;
  font-size: 28px;
  font-weight: 650;
  letter-spacing: 0.2px;
}

.sub {
  opacity: 0.82;
  margin: 0 0 22px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.note {
  margin-top: 10px;
  opacity: 0.78;
  line-height: 1.6;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #2d2d2d;
  background: #252526;
}

.join-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #12b886;
  background: #12b886;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.join-btn:hover {
  background: #0d9f73;
  border-color: #0d9f73;
}

.launch-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #2d2d2d;
  background: #3a3f4b;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.launch-btn:hover {
  background: #495267;
}

.launch-btn.secondary {
  background: #252526;
}

.launch-btn.secondary:hover {
  background: #2d2d2d;
}

.launch-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.edge-toast {
  position: fixed;
  top: 74px;
  right: 14px;
  z-index: 80;
  min-width: 220px;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #2d2d2d;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  line-height: 1.4;
  color: #fff;
  pointer-events: none;
}

.edge-toast.success {
  background: #1f6e4f;
  border-color: #2a8d66;
}

.edge-toast.error {
  background: #6a2a2a;
  border-color: #8f3a3a;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.search {
  display: flex;
  gap: 10px;
}

.search input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
  font-size: 15px;
}

.search button {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #2d2d2d;
  background: #007acc;
  color: #fff;
  cursor: pointer;
  font-size: 15px;
}

.search button:hover {
  background: #0063a5;
}

.section {
  margin-top: 26px;
}

.section h2 {
  font-size: 14px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.72;
  margin: 0 0 10px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.card {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #d4d4d4;
  text-decoration: none;
  cursor: pointer;
  text-align: left;
}

.card:hover {
  background: #2d2d2d;
}

.icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex: 0 0 auto;
  background: #1e1e1e;
  border: 1px solid #2d2d2d;
}

.meta {
  min-width: 0;
}

.title {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
