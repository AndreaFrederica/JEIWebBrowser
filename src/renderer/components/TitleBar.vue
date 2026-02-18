<script setup lang="ts">
import {
  Bookmark,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Database,
  Droplets,
  Home,
  Maximize2,
  Minimize2,
  Pin,
  Plus,
  Settings,
  X
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { INTERNAL_BOOKMARKS, INTERNAL_HISTORY, INTERNAL_HOME, INTERNAL_SETTINGS, INTERNAL_STORAGE } from '../pages/internal-home'
import type { TabItem } from '../types/browser'

const props = defineProps<{
  tabs: TabItem[]
  activeTabId: string | null
  alwaysOnTop: boolean
  transparencyEnabled: boolean
  windowOpacity: number
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
  toggleTransparency: [value: boolean]
  setWindowOpacity: [value: number]
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
const opacityMenuVisible = ref(false)
const opacityMenuX = ref(0)
const opacityMenuY = ref(0)
const opacityPresets = [1, 0.9, 0.8, 0.7, 0.6, 0.5]
const tabMenuRef = ref<HTMLElement | null>(null)
const opacityMenuRef = ref<HTMLElement | null>(null)
const hoverExpanded = ref(false)
const HOVER_EXPAND_DELAY_MS = 520
const HOVER_COLLAPSE_DELAY_MS = 200
let hoverExpandTimer: ReturnType<typeof setTimeout> | null = null
let hoverCollapseTimer: ReturnType<typeof setTimeout> | null = null
const isVerticalCollapsed = computed(() => props.tabLayout === 'vertical' && props.collapsed)
const isIconOnlyMode = computed(() => isVerticalCollapsed.value && !hoverExpanded.value)

function clearHoverTimers(): void {
  if (hoverExpandTimer) {
    clearTimeout(hoverExpandTimer)
    hoverExpandTimer = null
  }
  if (hoverCollapseTimer) {
    clearTimeout(hoverCollapseTimer)
    hoverCollapseTimer = null
  }
}

function closeHoverExpanded(): void {
  hoverExpanded.value = false
}

function onCollapsedTabMouseEnter(): void {
  if (!isVerticalCollapsed.value) return
  if (hoverCollapseTimer) {
    clearTimeout(hoverCollapseTimer)
    hoverCollapseTimer = null
  }
  if (hoverExpanded.value || hoverExpandTimer) return
  hoverExpandTimer = setTimeout(() => {
    hoverExpandTimer = null
    if (!isVerticalCollapsed.value) return
    hoverExpanded.value = true
  }, HOVER_EXPAND_DELAY_MS)
}

function onCollapsedAreaMouseEnter(): void {
  if (!isVerticalCollapsed.value) return
  if (hoverCollapseTimer) {
    clearTimeout(hoverCollapseTimer)
    hoverCollapseTimer = null
  }
}

function onCollapsedAreaMouseLeave(): void {
  if (hoverExpandTimer) {
    clearTimeout(hoverExpandTimer)
    hoverExpandTimer = null
  }
  if (!hoverExpanded.value) return
  if (hoverCollapseTimer) {
    clearTimeout(hoverCollapseTimer)
  }
  hoverCollapseTimer = setTimeout(() => {
    hoverCollapseTimer = null
    closeHoverExpanded()
  }, HOVER_COLLAPSE_DELAY_MS)
}

function setMenuPosition(
  element: HTMLElement,
  x: number,
  y: number,
  offsetY = 0,
  minTop = 40
): { x: number; y: number } {
  const pad = 8
  const width = element.offsetWidth || 180
  const height = element.offsetHeight || 120
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let nextX = x
  let nextY = y + offsetY

  if (nextX + width + pad > viewportWidth) {
    nextX = Math.max(pad, viewportWidth - width - pad)
  }

  if (nextY + height + pad > viewportHeight) {
    nextY = Math.max(minTop, viewportHeight - height - pad)
  }

  if (nextY < minTop) {
    nextY = minTop
  }

  return { x: nextX, y: nextY }
}

function openTabMenu(event: MouseEvent, tabId: string): void {
  closeOpacityMenu()
  tabMenuTabId.value = tabId
  tabMenuX.value = event.clientX
  tabMenuY.value = event.clientY
  tabMenuVisible.value = true
  void nextTick(() => {
    if (!tabMenuRef.value) return
    const positioned = setMenuPosition(tabMenuRef.value, event.clientX, event.clientY, 6, 40)
    tabMenuX.value = positioned.x
    tabMenuY.value = positioned.y
  })
}

function closeTabMenu(): void {
  tabMenuVisible.value = false
  tabMenuTabId.value = null
}

function openOpacityMenu(event: MouseEvent): void {
  event.preventDefault()
  closeTabMenu()
  opacityMenuX.value = event.clientX
  opacityMenuY.value = event.clientY
  opacityMenuVisible.value = true
  void nextTick(() => {
    if (!opacityMenuRef.value) return
    const positioned = setMenuPosition(opacityMenuRef.value, event.clientX, event.clientY, 8, 40)
    opacityMenuX.value = positioned.x
    opacityMenuY.value = positioned.y
  })
}

function closeOpacityMenu(): void {
  opacityMenuVisible.value = false
}

function setOpacity(value: number): void {
  emit('setWindowOpacity', value)
}

function closeMenus(): void {
  closeTabMenu()
  closeOpacityMenu()
  clearHoverTimers()
  closeHoverExpanded()
}

function onDocumentMouseDown(event: MouseEvent): void {
  const target = event.target as Node | null
  if (!target) return

  if (tabMenuVisible.value) {
    const inTabMenu = !!tabMenuRef.value?.contains(target)
    if (!inTabMenu) closeTabMenu()
  }

  if (opacityMenuVisible.value) {
    const inOpacityMenu = !!opacityMenuRef.value?.contains(target)
    if (!inOpacityMenu) closeOpacityMenu()
  }
}

function onDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeMenus()
  }
}

function closeTabFromMenu(): void {
  if (!tabMenuTabId.value) return
  emit('closeTab', tabMenuTabId.value)
  closeTabMenu()
}

watch(
  () => [props.tabLayout, props.collapsed],
  () => {
    if (!isVerticalCollapsed.value) {
      clearHoverTimers()
      closeHoverExpanded()
    }
  }
)

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown, true)
  document.addEventListener('keydown', onDocumentKeyDown)
  window.addEventListener('blur', closeMenus)
  window.addEventListener('resize', closeMenus)
})

onBeforeUnmount(() => {
  clearHoverTimers()
  document.removeEventListener('mousedown', onDocumentMouseDown, true)
  document.removeEventListener('keydown', onDocumentKeyDown)
  window.removeEventListener('blur', closeMenus)
  window.removeEventListener('resize', closeMenus)
})
</script>

<template>
  <div id="title-bar" :class="[props.tabLayout, { collapsed: isVerticalCollapsed, 'hover-expanded': hoverExpanded }]">
    <div id="tabs-area" @mouseenter="onCollapsedAreaMouseEnter" @mouseleave="onCollapsedAreaMouseLeave">
      <div v-if="props.tabLayout === 'vertical'" id="tabs-toolbar">
        <button id="btn-toggle-collapse" :title="props.collapsed ? '展开竖排标签栏' : '折叠竖排标签栏'" @click="emit('toggleCollapse')">
          <ChevronsRight v-if="props.collapsed" :size="18" />
          <ChevronsLeft v-else :size="18" />
        </button>
      </div>

      <div id="tabs-container">
        <div
          v-for="tab in props.tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: props.activeTabId === tab.id, iconOnly: isIconOnlyMode }"
          :title="tab.title"
          @mouseenter="onCollapsedTabMouseEnter"
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
          <span v-if="!isIconOnlyMode" class="tab-title">{{ tab.title }}</span>
          <span
            v-if="!isIconOnlyMode"
            class="close-tab"
            @click.stop="emit('closeTab', tab.id)"
          >
            <X :size="14" />
          </span>
        </div>
        <button
          class="tab new-tab-tab"
          :class="{ iconOnly: isIconOnlyMode }"
          title="新建标签页"
          @mouseenter="onCollapsedTabMouseEnter"
          @click="emit('newTab')"
        >
          <span class="tab-icon internal"><Plus :size="14" /></span>
          <span v-if="!isIconOnlyMode" class="tab-title">新建标签页</span>
        </button>
      </div>
    </div>

    <div
      v-if="tabMenuVisible"
      ref="tabMenuRef"
      id="tab-context-menu"
      :style="{ left: `${tabMenuX}px`, top: `${tabMenuY}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button class="tab-menu-item" @click="closeTabFromMenu">关闭标签页</button>
    </div>

    <div
      v-if="opacityMenuVisible"
      ref="opacityMenuRef"
      id="opacity-context-menu"
      :style="{ left: `${opacityMenuX}px`, top: `${opacityMenuY}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <div class="opacity-title">窗口透明度</div>
      <div class="opacity-presets">
        <button
          v-for="preset in opacityPresets"
          :key="preset"
          class="opacity-item"
          :class="{ active: Math.abs(props.windowOpacity - preset) < 0.01 }"
          @click="setOpacity(preset)"
        >
          {{ Math.round(preset * 100) }}%
        </button>
      </div>
      <div class="opacity-slider-row">
        <input
          class="opacity-slider"
          type="range"
          min="35"
          max="100"
          :value="Math.round(props.windowOpacity * 100)"
          @input="setOpacity(Number(($event.target as HTMLInputElement).value) / 100)"
        >
        <span class="opacity-value">{{ Math.round(props.windowOpacity * 100) }}%</span>
      </div>
    </div>

    <div v-if="props.tabLayout === 'horizontal'" id="window-controls">
      <label class="pin-toggle" title="Keep on top of games">
        <input type="checkbox" :checked="props.alwaysOnTop" @change="emit('toggleAlwaysOnTop', ($event.target as HTMLInputElement).checked)">
        <span class="pin-icon"><Pin :size="14" /></span>
      </label>
      <label class="transparency-toggle" title="半透明（右键调透明度）" @contextmenu.prevent="openOpacityMenu">
        <input type="checkbox" :checked="props.transparencyEnabled" @change="emit('toggleTransparency', ($event.target as HTMLInputElement).checked)">
        <span class="transparency-icon"><Droplets :size="14" /></span>
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
  transition: width 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
  transition: padding 180ms ease;
}

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
  transition:
    width 190ms ease,
    min-width 190ms ease,
    max-width 190ms ease,
    height 190ms ease,
    padding 190ms ease,
    border-radius 180ms ease,
    margin 180ms ease,
    background-color 140ms ease;
}

button.tab {
  border: none;
  outline: none;
  text-align: left;
}

.new-tab-tab {
  background: #2d2d2d;
  min-width: 34px;
  width: 34px;
  max-width: 34px;
  padding: 0;
  justify-content: center;
  box-sizing: border-box;
}

.new-tab-tab:hover {
  background: #3a3a3a;
  color: #fff;
}

.new-tab-tab .tab-icon {
  margin-right: 0;
}

.new-tab-tab:not(.iconOnly) {
  width: auto;
  min-width: 110px;
  max-width: 190px;
  padding: 0 10px;
  justify-content: flex-start;
}

.new-tab-tab:not(.iconOnly) .tab-icon {
  margin-right: 8px;
}

.tab-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
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
  width: 18px;
  height: 18px;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
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

.transparency-toggle {
  width: 34px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ccc;
}

.transparency-toggle:hover {
  background-color: #555;
}

.transparency-toggle input {
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

.transparency-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.45;
  color: #8fb9ff;
}

.transparency-toggle input:checked + .transparency-icon {
  opacity: 1;
  color: #fff;
  background: #35506a;
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
  position: relative;
  z-index: 80;
}

#title-bar.vertical #tabs-area {
  flex: 1;
  flex-direction: column;
  align-items: stretch;
}

#title-bar.vertical #tabs-container {
  padding: 0 8px;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

#title-bar.vertical .tab {
  width: 100%;
  max-width: none;
  min-width: 0;
  height: 30px;
  margin-right: 0;
  margin-bottom: 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

#title-bar.vertical .tab.active {
  border-color: #3f3f45;
}

#title-bar.vertical.collapsed {
  width: 48px;
  border-right: none;
  overflow: visible;
}

#title-bar.vertical.collapsed #tabs-toolbar {
  width: 100%;
  padding: 8px 0 4px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
}

#title-bar.vertical.collapsed.hover-expanded #tabs-toolbar {
  padding: 8px 8px 4px;
}

#title-bar.vertical.collapsed #tabs-area {
  overflow: visible;
}

#title-bar.vertical.collapsed #tabs-container {
  padding: 0;
  align-items: center;
  overflow-y: auto;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
  transition:
    width 190ms ease,
    padding 190ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
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

#title-bar.vertical.collapsed .new-tab-tab {
  width: 30px;
  min-width: 30px;
  max-width: 30px;
  height: 30px;
  margin: 0 0 4px;
  padding: 0;
  justify-content: center;
  border-radius: 7px;
}

#title-bar.vertical.collapsed.hover-expanded #tabs-container {
  width: 232px;
  padding: 0 8px;
  background: #333;
  border-right: 1px solid #2d2d2d;
  box-shadow: 10px 0 26px rgba(0, 0, 0, 0.35);
  z-index: 120;
  align-items: stretch;
}

#title-bar.vertical.collapsed.hover-expanded .tab {
  width: 100%;
  min-width: 0;
  max-width: none;
  height: 30px;
  margin: 0 0 4px;
  padding: 0 10px;
  justify-content: flex-start;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

#title-bar.vertical.collapsed.hover-expanded .tab.active {
  border-color: #3f3f45;
}

#title-bar.vertical.collapsed.hover-expanded .tab .tab-icon {
  margin-right: 8px;
}

#title-bar.vertical.collapsed.hover-expanded .new-tab-tab {
  width: 100%;
  min-width: 0;
  max-width: none;
  padding: 0 10px;
  justify-content: flex-start;
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

#opacity-context-menu {
  position: fixed;
  z-index: 500;
  width: 220px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  padding: 8px;
  -webkit-app-region: no-drag;
}

.opacity-title {
  font-size: 12px;
  color: #ddd;
  margin-bottom: 8px;
}

.opacity-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.opacity-item {
  border: 1px solid #3e3e42;
  background: #2d2d2d;
  color: #ddd;
  padding: 5px 0;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.opacity-item:hover {
  background: #3a3a3a;
}

.opacity-item.active {
  border-color: #0063a5;
  background: #007acc;
  color: #fff;
}

.opacity-slider-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.opacity-slider {
  flex: 1;
}

.opacity-value {
  width: 42px;
  text-align: right;
  font-size: 12px;
  color: #ccc;
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
