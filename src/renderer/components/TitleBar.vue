<script setup lang="ts">
import { Maximize2, Minimize2, Pin, Plus, X } from 'lucide-vue-next'
import type { TabItem } from '../types/browser'

defineProps<{
  tabs: TabItem[]
  activeTabId: string | null
  alwaysOnTop: boolean
}>()

const emit = defineEmits<{
  switchTab: [tabId: string]
  closeTab: [tabId: string]
  newTab: []
  minimize: []
  maximize: []
  closeWindow: []
  toggleAlwaysOnTop: [value: boolean]
}>()
</script>

<template>
  <div id="title-bar">
    <div id="tabs-area">
      <div id="tabs-container">
        <div
          v-for="tab in tabs"
          :id="tab.id"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTabId === tab.id }"
          @click="emit('switchTab', tab.id)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <span class="close-tab" @click.stop="emit('closeTab', tab.id)">
            <X :size="14" />
          </span>
        </div>
      </div>
      <button id="btn-new-tab" title="New Tab" @click="emit('newTab')">
        <Plus :size="16" />
      </button>
    </div>

    <div id="window-controls">
      <label class="pin-toggle" title="Keep on top of games">
        <input type="checkbox" :checked="alwaysOnTop" @change="emit('toggleAlwaysOnTop', ($event.target as HTMLInputElement).checked)">
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

#tabs-container {
  flex-grow: 1;
  display: flex;
  overflow-x: auto;
  -webkit-app-region: drag;
  padding-left: 10px;
  min-width: 0;
}

#btn-new-tab {
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

#btn-new-tab:hover {
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
  min-width: 100px;
  max-width: 200px;
  font-size: 12px;
  position: relative;
  -webkit-app-region: no-drag;
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
  color: white;
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
  color: white;
}

button svg,
.close-tab svg,
.pin-icon svg {
  pointer-events: none;
}
</style>
