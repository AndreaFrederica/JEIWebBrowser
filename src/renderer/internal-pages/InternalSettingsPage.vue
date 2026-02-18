<script setup lang="ts">
import { Keyboard } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { SettingsPayload } from '../types/browser'
import { normalizeSearchEngine, SEARCH_ENGINE_OPTIONS, type SearchEngineKey } from '../utils/search'

const ipcRenderer =
  window.ipc ??
  ({
    send: () => {},
    invoke: async () => null,
    on: () => {}
  } as const)

const props = defineProps<{
  onSettingsSaved: (value: SettingsPayload) => void
}>()

const emit = defineEmits<{
  navigate: [url: string]
}>()

const shortcut = ref('')
const homePage = ref('jei://home')
const alwaysOnTop = ref(false)
const transparencyEnabled = ref(false)
const windowOpacity = ref(0.85)
const gameExecutablePath = ref('')
const launcherExecutablePath = ref('')
const showBookmarksBar = ref(true)
const tabBarLayout = ref<'horizontal' | 'vertical'>('horizontal')
const searchEngine = ref<SearchEngineKey>('bing')
const verticalTabsCollapsed = ref(false)
const status = ref('')
const SHORTCUT_RECORDING_HELP = '点击“录制快捷键”后按下组合键，例如 Ctrl + Shift + F8。'
const shortcutHelp = ref(SHORTCUT_RECORDING_HELP)
const isRecordingShortcut = ref(false)

function keyFromEvent(event: KeyboardEvent): string {
  const code = event.code || ''
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code

  if (code === 'Minus') return '-'
  if (code === 'Equal') return '='
  if (code === 'BracketLeft') return '['
  if (code === 'BracketRight') return ']'
  if (code === 'Backslash') return '\\'
  if (code === 'Semicolon') return ';'
  if (code === 'Quote') return "'"
  if (code === 'Comma') return ','
  if (code === 'Period') return '.'
  if (code === 'Slash') return '/'
  if (code === 'Backquote') return 'Backquote'

  const keyMap: Record<string, string> = {
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Space: 'Space',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right'
  }

  if (keyMap[event.key]) return keyMap[event.key]
  if (event.key && event.key.length === 1) return event.key.toUpperCase()
  return ''
}

function isModifierOnly(event: KeyboardEvent): boolean {
  const key = event.key
  return key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta'
}

function buildAccelerator(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (isModifierOnly(event)) return ''

  const mainKey = keyFromEvent(event)
  if (!mainKey) return ''
  parts.push(mainKey)
  return parts.join('+')
}

async function setShortcutRecordingMode(enabled: boolean): Promise<boolean> {
  try {
    const result = await ipcRenderer.invoke('set-shortcut-recording-mode', enabled)
    return !!result?.success
  } catch {
    return false
  }
}

function stopShortcutRecording(): void {
  const wasRecording = isRecordingShortcut.value
  isRecordingShortcut.value = false
  window.removeEventListener('keydown', onShortcutKeydown, true)
  if (wasRecording) {
    void setShortcutRecordingMode(false)
  }
}

function onShortcutKeydown(event: KeyboardEvent): void {
  if (!isRecordingShortcut.value) return
  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Escape') {
    stopShortcutRecording()
    shortcutHelp.value = '已取消录制。'
    return
  }

  const accelerator = buildAccelerator(event)
  if (!accelerator) {
    shortcutHelp.value = '请按下组合键（至少包含一个非修饰键）。'
    return
  }

  shortcut.value = accelerator
  stopShortcutRecording()
  shortcutHelp.value = `已录制：${accelerator}`
}

async function toggleShortcutRecording(): Promise<void> {
  if (isRecordingShortcut.value) {
    stopShortcutRecording()
    shortcutHelp.value = SHORTCUT_RECORDING_HELP
    return
  }

  const enabled = await setShortcutRecordingMode(true)
  if (!enabled) {
    isRecordingShortcut.value = false
    shortcutHelp.value = '进入录制模式失败，请重试。'
    return
  }

  isRecordingShortcut.value = true
  shortcutHelp.value = '正在录制，请按下组合键。按 Esc 取消。'
  window.addEventListener('keydown', onShortcutKeydown, true)
}

async function loadSettings(): Promise<void> {
  try {
    stopShortcutRecording()
    const settings = await ipcRenderer.invoke('get-settings-data')
    if (!settings) return

    shortcut.value = settings.shortcut || ''
    homePage.value = settings.homePage || 'jei://home'
    alwaysOnTop.value = !!settings.alwaysOnTop
    transparencyEnabled.value = !!settings.transparencyEnabled
    const normalizedOpacity = Number(settings.windowOpacity)
    windowOpacity.value = Number.isFinite(normalizedOpacity) ? Math.min(1, Math.max(0.35, normalizedOpacity)) : 0.85
    gameExecutablePath.value = settings.gameExecutablePath || ''
    launcherExecutablePath.value = settings.launcherExecutablePath || ''
    showBookmarksBar.value = typeof settings.showBookmarksBar === 'boolean' ? settings.showBookmarksBar : true
    tabBarLayout.value = settings.tabBarLayout === 'vertical' ? 'vertical' : 'horizontal'
    searchEngine.value = normalizeSearchEngine(settings.searchEngine)
    verticalTabsCollapsed.value = !!settings.verticalTabsCollapsed
    status.value = '设置已加载'
    shortcutHelp.value = SHORTCUT_RECORDING_HELP
  } catch {
    status.value = '读取设置失败'
  }
}

function toggleDevTools(): void {
  ipcRenderer.send('toggle-devtools')
}

async function chooseExecutable(target: 'game' | 'launcher'): Promise<void> {
  try {
    const title = target === 'game' ? '选择游戏可执行文件' : '选择鹰角启动器可执行文件'
    const defaultPath = target === 'game' ? gameExecutablePath.value : launcherExecutablePath.value
    const selected = await ipcRenderer.invoke('select-executable-file', {
      title,
      defaultPath
    })
    if (typeof selected !== 'string' || !selected.trim()) return

    if (target === 'game') {
      gameExecutablePath.value = selected.trim()
    } else {
      launcherExecutablePath.value = selected.trim()
    }
  } catch {
    status.value = '选择文件失败'
  }
}

async function saveSettings(): Promise<void> {
  const payload: SettingsPayload = {
    shortcut: shortcut.value.trim(),
    homePage: (homePage.value || 'jei://home').trim(),
    alwaysOnTop: alwaysOnTop.value,
    transparencyEnabled: transparencyEnabled.value,
    windowOpacity: Math.min(1, Math.max(0.35, Number(windowOpacity.value) || 0.85)),
    gameExecutablePath: gameExecutablePath.value.trim(),
    launcherExecutablePath: launcherExecutablePath.value.trim(),
    showBookmarksBar: showBookmarksBar.value,
    tabBarLayout: tabBarLayout.value,
    searchEngine: searchEngine.value,
    verticalTabsCollapsed: verticalTabsCollapsed.value
  }

  try {
    const result = await ipcRenderer.invoke('save-settings-data', payload)
    if (result?.success) {
      props.onSettingsSaved(payload)
      status.value = '保存成功'
      return
    }
    status.value = '保存失败'
  } catch {
    status.value = '保存失败'
  }
}

onMounted(() => {
  void loadSettings()
})

onBeforeUnmount(() => {
  stopShortcutRecording()
})
</script>

<template>
  <div class="page-wrap">
    <h1>设置</h1>
    <div class="field">
      <label for="shortcut">快捷键</label>
      <div class="bar">
        <input id="shortcut" v-model="shortcut" type="text" placeholder="CommandOrControl+F8">
        <button
          type="button"
          class="shortcut-record-btn"
          :class="{ secondary: !isRecordingShortcut, recording: isRecordingShortcut }"
          :title="isRecordingShortcut ? '正在录制，按 Esc 取消' : '录制快捷键'"
          :aria-label="isRecordingShortcut ? '正在录制快捷键，按 Esc 取消' : '录制快捷键'"
          @click="toggleShortcutRecording"
        >
          <Keyboard :size="16" />
          <span v-if="isRecordingShortcut" class="record-dot" aria-hidden="true"></span>
        </button>
      </div>
      <div class="status">{{ shortcutHelp }}</div>
    </div>

    <div class="field">
      <label for="homepage">主页（例如 jei://home）</label>
      <input id="homepage" v-model="homePage" type="text" placeholder="jei://home">
    </div>

    <div class="field">
      <label for="game-executable-path">游戏可执行文件路径</label>
      <div class="path-picker">
        <input id="game-executable-path" v-model="gameExecutablePath" type="text" readonly placeholder="未设置">
        <button class="secondary" @click="chooseExecutable('game')">选择文件</button>
        <button class="secondary" @click="gameExecutablePath = ''">清空</button>
      </div>
    </div>

    <div class="field">
      <label for="launcher-executable-path">鹰角启动器路径</label>
      <div class="path-picker">
        <input id="launcher-executable-path" v-model="launcherExecutablePath" type="text" readonly placeholder="未设置">
        <button class="secondary" @click="chooseExecutable('launcher')">选择文件</button>
        <button class="secondary" @click="launcherExecutablePath = ''">清空</button>
      </div>
    </div>

    <div class="field">
      <label><input v-model="alwaysOnTop" type="checkbox"> 置顶窗口</label>
    </div>

    <div class="field">
      <label><input v-model="transparencyEnabled" type="checkbox"> 开启半透明窗口</label>
    </div>

    <div class="field">
      <label for="window-opacity">窗口透明度（{{ Math.round(windowOpacity * 100) }}%）</label>
      <input
        id="window-opacity"
        v-model.number="windowOpacity"
        type="range"
        min="0.35"
        max="1"
        step="0.01"
        :disabled="!transparencyEnabled"
      >
    </div>

    <div class="field">
      <label><input v-model="showBookmarksBar" type="checkbox"> 显示收藏夹栏</label>
    </div>

    <div class="field">
      <label for="tab-layout">标签栏布局</label>
      <select id="tab-layout" v-model="tabBarLayout">
        <option value="horizontal">横排</option>
        <option value="vertical">竖排</option>
      </select>
    </div>

    <div class="field">
      <label for="search-engine">默认搜索引擎</label>
      <select id="search-engine" v-model="searchEngine">
        <option v-for="item in SEARCH_ENGINE_OPTIONS" :key="item.key" :value="item.key">
          {{ item.label }}
        </option>
      </select>
    </div>

    <div class="bar">
      <button @click="saveSettings">保存</button>
      <button class="secondary" @click="loadSettings">重新读取</button>
    </div>

    <div class="status">{{ status }}</div>

    <div class="section-divider"></div>

    <div class="section">
      <h2>数据管理</h2>
      <p class="section-desc">查看和管理浏览器的持久化存储数据</p>
      <button class="secondary" @click="emit('navigate', 'jei://storage')">
        打开存储查看器
      </button>
    </div>

    <div class="section-divider"></div>

    <div class="section">
      <h2>开发者工具</h2>
      <p class="section-desc">打开浏览器内部界面的开发者工具</p>
      <button class="secondary" @click="toggleDevTools">
        切换 DevTools (F12)
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 20px;
  color: #d4d4d4;
}

h1 {
  margin: 0 0 16px;
  font-size: 24px;
}

.bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.path-picker {
  display: flex;
  gap: 10px;
}

.path-picker input {
  flex: 1;
}

button {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #007acc;
  color: #fff;
  cursor: pointer;
}

button.secondary {
  background: #252526;
}

.shortcut-record-btn {
  position: relative;
  width: 40px;
  min-width: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.shortcut-record-btn.recording {
  background: #0f62fe;
}

.record-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
}

input[type='text'] {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
}

input[type='range'] {
  width: 100%;
}

select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  opacity: 0.9;
}

.field {
  margin-bottom: 12px;
}

.status {
  margin-top: 10px;
  font-size: 12px;
  min-height: 18px;
  opacity: 0.85;
}

.section-divider {
  margin: 28px 0;
  border-top: 1px solid #2d2d2d;
}

.section {
  margin-top: 16px;
}

.section h2 {
  font-size: 18px;
  margin: 0 0 8px;
}

.section-desc {
  font-size: 13px;
  opacity: 0.7;
  margin: 0 0 12px;
}
</style>
