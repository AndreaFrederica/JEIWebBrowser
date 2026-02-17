<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock3,
  Home,
  Maximize2,
  Minimize2,
  Pin,
  RefreshCw,
  Search,
  Settings,
  X
} from 'lucide-vue-next'

const props = defineProps<{
  addressBar: string
  bookmarked: boolean
  alwaysOnTop: boolean
  showWindowControls: boolean
}>()

const emit = defineEmits<{
  'update:addressBar': [value: string]
  home: []
  back: []
  forward: []
  refresh: []
  go: []
  bookmark: []
  history: []
  settings: []
  addressEnter: [event: KeyboardEvent]
  minimize: []
  maximize: []
  closeWindow: []
  toggleAlwaysOnTop: [value: boolean]
}>()
</script>

<template>
  <div id="nav-bar">
    <button id="btn-home" title="Home" @click="emit('home')"><Home :size="16" /></button>
    <button id="btn-back" title="Back" @click="emit('back')"><ArrowLeft :size="16" /></button>
    <button id="btn-forward" title="Forward" @click="emit('forward')"><ArrowRight :size="16" /></button>
    <button id="btn-refresh" title="Refresh" @click="emit('refresh')"><RefreshCw :size="16" /></button>

    <input
      id="address-bar"
      :value="props.addressBar"
      type="text"
      placeholder="Enter URL..."
      @input="emit('update:addressBar', ($event.target as HTMLInputElement).value)"
      @keydown="emit('addressEnter', $event as KeyboardEvent)"
    >

    <button id="btn-go" title="Go" @click="emit('go')"><Search :size="16" /></button>
    <button
      id="btn-bookmark"
      :title="props.bookmarked ? '已在收藏夹中' : '添加到收藏夹'"
      :class="{ active: props.bookmarked }"
      :disabled="props.bookmarked"
      @click="emit('bookmark')"
    >
      <Bookmark :size="16" />
    </button>
    <button id="btn-history" title="History" @click="emit('history')"><Clock3 :size="16" /></button>
    <button id="btn-settings" title="Settings" @click="emit('settings')"><Settings :size="16" /></button>

    <div v-if="props.showWindowControls" id="nav-drag-handle" title="拖动窗口"></div>

    <div v-if="props.showWindowControls" id="window-controls-inline">
      <label class="pin-toggle" title="Keep on top of games">
        <input type="checkbox" :checked="props.alwaysOnTop" @change="emit('toggleAlwaysOnTop', ($event.target as HTMLInputElement).checked)">
        <span class="pin-icon"><Pin :size="14" /></span>
      </label>
      <button title="Minimize" @click="emit('minimize')"><Minimize2 :size="14" /></button>
      <button title="Maximize" @click="emit('maximize')"><Maximize2 :size="14" /></button>
      <button id="btn-close-inline" title="Hide (Ctrl+F8 to show)" @click="emit('closeWindow')"><X :size="14" /></button>
    </div>
  </div>
</template>

<style scoped>
#nav-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-color);
  padding: 5px;
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
}

#nav-bar button {
  -webkit-app-region: no-drag;
  background: none;
  border: none;
  color: var(--fg-color);
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

#nav-bar button:hover {
  background-color: var(--hover-color);
}

#btn-bookmark.active {
  color: #fff;
  background-color: #35506a;
}

#btn-bookmark:disabled {
  cursor: default;
}

#address-bar {
  -webkit-app-region: no-drag;
  flex-grow: 1;
  background-color: #2d2d2d;
  border: 1px solid #3e3e42;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  margin: 0 10px;
}

button svg {
  pointer-events: none;
}

#window-controls-inline {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  margin-left: 6px;
  border-left: 1px solid #3e3e42;
  padding-left: 6px;
}

#nav-drag-handle {
  flex: 0 0 28px;
  width: 28px;
  height: 26px;
  margin-left: 4px;
}

#window-controls-inline button {
  width: 30px;
  height: 28px;
}

#btn-close-inline:hover {
  background-color: #e81123 !important;
  color: #fff;
}

.pin-toggle {
  width: 30px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ccc;
  border-radius: 4px;
}

.pin-toggle:hover {
  background-color: var(--hover-color);
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
</style>
