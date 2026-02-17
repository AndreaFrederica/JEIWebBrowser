<script setup lang="ts">
import {
  Bookmark,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Database,
  Home,
  Maximize2,
  Minimize2,
  Pin,
  Plus,
  Settings,
  X
} from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { INTERNAL_BOOKMARKS, INTERNAL_HISTORY, INTERNAL_HOME, INTERNAL_SETTINGS, INTERNAL_STORAGE } from '../pages/internal-home'
import type { TabItem } from '../types/browser'

const props = defineProps<{
  tabs: TabItem[]
  activeTabId: string | null
  alwaysOnTop: boolean
  tabLayout: 'horizontal' | 'vertical'
  collapsed: boolean
}>()

const emit = defineEmits<{
  switchTab: [tabId: string]
  closeTab: [tabId: string]
  newTab: []
  minimize: []
  maximize: []
  closeWindow: []
  toggleAlwaysOnTop: [value: boolean]
  toggleCollapse: []
}>()

function tabInitial(tab: TabItem): string {
  const source = (tab.title || tab.src || 'J').trim()
  const char = source[0] || 'J'
  return char.toUpperCase()
}

function isInternalTab(tab: TabItem): boolean {
  return (
    tab.src === INTERNAL_HOME ||
    tab.src === INTERNAL_BOOKMARKS ||
    tab.src === INTERNAL_HISTORY ||
    tab.src === INTERNAL_SETTINGS ||
    tab.src === INTERNAL_STORAGE
  )
}

const tabMenuVisible = ref(false)
const tabMenuX = ref(0)
const tabMenuY = ref(0)
const tabMenuTabId = ref<string | null>(null)

function openTabMenu(event: MouseEvent, tabId: string): void {
  tabMenuTabId.value = tabId
  tabMenuX.value = event.clientX
  tabMenuY.value = event.clientY
  tabMenuVisible.value = true
}

function closeTabMenu(): void {
  tabMenuVisible.value = false
  tabMenuTabId.value = null
}

function closeTabFromMenu(): void {
  if (!tabMenuTabId.value) return
  emit('closeTab', tabMenuTabId.value)
  closeTabMenu()
}

onMounted(() => {
  window.addEventListener('click', closeTabMenu)
  window.addEventListener('blur', closeTabMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeTabMenu)
  window.removeEventListener('blur', closeTabMenu)
})
</script>

<template>
  <div id="title-bar" :class="[props.tabLayout, { collapsed: props.tabLayout === 'vertical' && props.collapsed }]">
    <div id="tabs-area">
      <div v-if="props.tabLayout === 'vertical'" id="tabs-toolbar">
        <button id="btn-toggle-collapse" :title="props.collapsed ? '展开竖排标签栏' : '折叠竖排标签栏'" @click="emit('toggleCollapse')">
          <ChevronsRight v-if="props.collapsed" :size="18" />
          <ChevronsLeft v-else :size="18" />
        </button>
        <button id="btn-new-tab-vertical" title="New Tab" @click="emit('newTab')">
          <Plus :size="18" />
        </button>
      </div>

      <div id="tabs-container">
        <div
          v-for="tab in props.tabs"
          :id="tab.id"
          :key="tab.id"
          class="tab"
          :class="{ active: props.activeTabId === tab.id, iconOnly: props.tabLayout === 'vertical' && props.collapsed }"
          :title="tab.title"
          @click="emit('switchTab', tab.id)"
          @contextmenu.prevent="openTabMenu($event, tab.id)"
        >
          <span class="tab-icon" :class="{ fallback: !tab.favicon && !isInternalTab(tab), internal: isInternalTab(tab) }">
            <img v-if="tab.favicon && !isInternalTab(tab)" :src="tab.favicon" alt="">
            <Home v-else-if="tab.src === INTERNAL_HOME" :size="14" />
            <Bookmark v-else-if="tab.src === INTERNAL_BOOKMARKS" :size="14" />
            <Clock3 v-else-if="tab.src === INTERNAL_HISTORY" :size="14" />
            <Settings v-else-if="tab.src === INTERNAL_SETTINGS" :size="14" />
            <Database v-else-if="tab.src === INTERNAL_STORAGE" :size="14" />
            <span v-else>{{ tabInitial(tab) }}</span>
          </span>
          <span v-if="!(props.tabLayout === 'vertical' && props.collapsed)" class="tab-title">{{ tab.title }}</span>
          <span
            v-if="!(props.tabLayout === 'vertical' && props.collapsed)"
            class="close-tab"
            @click.stop="emit('closeTab', tab.id)"
          >
            <X :size="14" />
          </span>
        </div>
      </div>

      <button v-if="props.tabLayout === 'horizontal'" id="btn-new-tab" title="New Tab" @click="emit('newTab')">
        <Plus :size="16" />
      </button>
    </div>

    <div
      v-if="tabMenuVisible"
      id="tab-context-menu"
      :style="{ left: `${tabMenuX}px`, top: `${tabMenuY}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button class="tab-menu-item" @click="closeTabFromMenu">关闭标签页</button>
    </div>

    <div v-if="props.tabLayout === 'horizontal'" id="window-controls">
      <label class="pin-toggle" title="Keep on top of games">
        <input type="checkbox" :checked="props.alwaysOnTop" @change="emit('toggleAlwaysOnTop', ($event.target as HTMLInputElement).checked)">
        <span class="pin-icon"><Pin :size="14" /></span>
      </label>
      <button id="btn-minimize" title="Minimize" @click="emit('minimize')">
        <Minimize2 :size="14" />
      </button>
      <button id="btn-maximize" title="Maximize" @click="emit('maximize')">
        <Maximize2 :size="14" />
      </button>
      <button id="btn-close" title="Hide (Ctrl+F8 to show)" @click="emit('closeWindow')">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
#title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #333;
  height: 32px;
  -webkit-app-region: drag;
  user-select: none;
}

#tabs-area {
  flex-grow: 1;
  display: flex;
  align-items: flex-end;
  min-width: 0;
}

#tabs-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 4px;
  -webkit-app-region: no-drag;
}

#tabs-container {
  flex-grow: 1;
  display: flex;
  overflow-x: auto;
  -webkit-app-region: drag;
  padding-left: 10px;
  min-width: 0;
}

#btn-new-tab,
#btn-new-tab-vertical,
#btn-toggle-collapse {
  -webkit-app-region: no-drag;
  background: none;
  border: none;
  color: #ccc;
  width: 32px;
  height: 28px;
  margin: 0 6px 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

#btn-new-tab:hover,
#btn-new-tab-vertical:hover,
#btn-toggle-collapse:hover {
  background-color: #555;
  color: #fff;
}

.tab {
  background-color: #2d2d2d;
  color: #ccc;
  padding: 0 10px;
  height: 28px;
  line-height: 28px;
  margin-right: 2px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  min-width: 110px;
  max-width: 220px;
  font-size: 12px;
  position: relative;
  -webkit-app-region: no-drag;
}

.tab-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  margin-right: 8px;
  overflow: hidden;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-icon img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
}

.tab-icon.fallback {
  background: #4b4b50;
  color: #eee;
  font-size: 11px;
  font-weight: 700;
}

.tab-icon.internal {
  background: #3e3e42;
  color: #f0f0f0;
}

.tab-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab.active {
  background-color: var(--bg-color);
  color: #fff;
}

.close-tab {
  margin-left: auto;
  padding: 0 5px;
  cursor: pointer;
  font-size: 14px;
  flex: 0 0 auto;
}

.close-tab:hover {
  color: #fff;
  background-color: #444;
  border-radius: 50%;
}

#window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
}

.pin-toggle {
  width: 34px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ccc;
}

.pin-toggle:hover {
  background-color: #555;
}

.pin-toggle input {
  display: none;
}

.pin-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
}

.pin-toggle input:checked + .pin-icon {
  opacity: 1;
  color: #fff;
}

#window-controls button {
  background: none;
  border: none;
  color: #ccc;
  width: 40px;
  height: 32px;
  cursor: pointer;
  outline: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

#window-controls button:hover {
  background-color: #555;
}

#btn-close:hover {
  background-color: #e81123;
  color: #fff;
}

button svg,
.close-tab svg,
.pin-icon svg {
  pointer-events: none;
}

#title-bar.vertical {
  width: 232px;
  height: 100%;
  flex-direction: column;
  align-items: stretch;
  border-right: 1px solid #2d2d2d;
  box-sizing: border-box;
}

#title-bar.vertical #tabs-area {
  flex: 1;
  flex-direction: column;
  align-items: stretch;
}

#title-bar.vertical #tabs-container {
  padding: 4px 8px 10px;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

#title-bar.vertical .tab {
  width: 100%;
  max-width: none;
  min-width: 0;
  height: 36px;
  margin-right: 0;
  margin-bottom: 4px;
  border-radius: 8px;
  line-height: 36px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

#title-bar.vertical .tab.active {
  border-color: #3f3f45;
}

#title-bar.vertical.collapsed {
  width: 48px;
  border-right: none;
}

#title-bar.vertical.collapsed #tabs-toolbar {
  width: 100%;
  padding: 8px 0 4px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
}

#title-bar.vertical.collapsed #tabs-container {
  padding: 0 0 8px;
  align-items: center;
}

#title-bar.vertical.collapsed .tab {
  width: 30px;
  min-width: 30px;
  max-width: 30px;
  height: 30px;
  margin: 0 0 4px;
  padding: 0;
  justify-content: center;
  border-radius: 7px;
}

#title-bar.vertical .tab.iconOnly .tab-icon {
  margin-right: 0;
  width: 18px;
  height: 18px;
}

#title-bar.vertical.collapsed #btn-toggle-collapse {
  width: 32px;
  height: 28px;
  margin: 0 6px 2px 6px;
}

#title-bar.vertical.collapsed #btn-new-tab-vertical {
  width: 32px;
  height: 28px;
  margin: 0 6px 2px 6px;
}

#tab-context-menu {
  position: fixed;
  z-index: 500;
  min-width: 120px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  -webkit-app-region: no-drag;
}

.tab-menu-item {
  width: 100%;
  background: transparent;
  border: none;
  color: #ddd;
  text-align: left;
  padding: 8px 12px;
  cursor: pointer;
}

.tab-menu-item:hover {
  background: #3e3e42;
}
</style>
