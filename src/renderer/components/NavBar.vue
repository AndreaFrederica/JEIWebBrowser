<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock3,
  Home,
  RefreshCw,
  Search,
  Settings
} from 'lucide-vue-next'

const props = defineProps<{
  addressBar: string
  bookmarked: boolean
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
  </div>
</template>

<style scoped>
#nav-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-color);
  padding: 5px;
  border-bottom: 1px solid var(--border-color);
}

#nav-bar button {
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
</style>
