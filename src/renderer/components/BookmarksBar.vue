<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BookmarkItem } from '../types/browser'

defineProps<{
  bookmarks: BookmarkItem[]
}>()

const emit = defineEmits<{
  open: [url: string]
  remove: [url: string]
  openNewTab: [url: string]
  copyLink: [url: string]
}>()

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const targetUrl = ref('')

function openContextMenu(event: MouseEvent, url: string): void {
  targetUrl.value = url
  menuX.value = event.clientX
  menuY.value = event.clientY
  menuVisible.value = true
}

function closeContextMenu(): void {
  menuVisible.value = false
}

function removeCurrentBookmark(): void {
  if (!targetUrl.value) return
  emit('remove', targetUrl.value)
  closeContextMenu()
}

function openCurrentInNewTab(): void {
  if (!targetUrl.value) return
  emit('openNewTab', targetUrl.value)
  closeContextMenu()
}

function copyCurrentLink(): void {
  if (!targetUrl.value) return
  emit('copyLink', targetUrl.value)
  closeContextMenu()
}

function handleGlobalClick(): void {
  if (menuVisible.value) closeContextMenu()
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
  window.addEventListener('blur', handleGlobalClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('blur', handleGlobalClick)
})
</script>

<template>
  <div id="bookmarks-bar" :class="{ hidden: bookmarks.length === 0 }">
    <span
      v-for="bookmark in bookmarks"
      :key="bookmark.url"
      class="bookmark-item"
      :title="`${bookmark.title}\n${bookmark.url}`"
      @click="emit('open', bookmark.url)"
      @contextmenu.prevent="openContextMenu($event, bookmark.url)"
    >
      {{ bookmark.title.substring(0, 20) + (bookmark.title.length > 20 ? '...' : '') }}
    </span>

    <div
      v-if="menuVisible"
      class="bookmark-menu"
      :style="{ left: `${menuX}px`, top: `${menuY}px` }"
      @contextmenu.prevent
    >
      <button class="menu-item" @click="openCurrentInNewTab">在新标签页打开</button>
      <button class="menu-item" @click="copyCurrentLink">复制链接</button>
      <button class="menu-item" @click="removeCurrentBookmark">移除书签</button>
    </div>
  </div>
</template>

<style scoped>
#bookmarks-bar {
  display: flex;
  flex-wrap: wrap;
  padding: 5px;
  background-color: #252526;
  border-bottom: 1px solid var(--border-color);
}

.bookmark-item {
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
  color: #ccc;
}

.bookmark-item:hover {
  background-color: var(--hover-color);
  border-radius: 3px;
}

.hidden {
  display: none !important;
}

.bookmark-menu {
  position: fixed;
  z-index: 300;
  min-width: 120px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.menu-item {
  width: 100%;
  background: transparent;
  border: none;
  color: #ddd;
  text-align: left;
  padding: 8px 12px;
  cursor: pointer;
}

.menu-item:hover {
  background: #3e3e42;
}
</style>
