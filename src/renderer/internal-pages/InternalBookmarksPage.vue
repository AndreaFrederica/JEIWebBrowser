<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { BookmarkItem } from '../types/browser'

const props = defineProps<{
  bookmarks: BookmarkItem[]
  onRefresh: () => void
  onOpenInNewTab: (url: string) => void
}>()

const status = ref('')

function refreshData(): void {
  props.onRefresh()
  status.value = '已刷新'
}

function openInNewTab(url: string): void {
  props.onOpenInNewTab(url)
}

onMounted(() => {
  refreshData()
})
</script>

<template>
  <div class="page-wrap">
    <h1>书签管理</h1>
    <div class="bar">
      <button @click="refreshData">刷新</button>
    </div>
    <div class="list">
      <div v-if="!bookmarks.length" class="row">
        <div class="meta">
          <div class="t">暂无书签</div>
        </div>
      </div>
      <div v-for="item in bookmarks" v-else :key="item.url" class="row">
        <div class="meta">
          <div class="t">{{ item.title || item.url }}</div>
          <div class="u">{{ item.url }}</div>
        </div>
        <button class="secondary" @click="openInNewTab(item.url)">在新标签页打开</button>
      </div>
    </div>
    <div class="status">{{ status }}</div>
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

.list {
  border: 1px solid #2d2d2d;
  border-radius: 10px;
  overflow: hidden;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #2d2d2d;
  align-items: center;
}

.row:last-child {
  border-bottom: none;
}

.meta {
  min-width: 0;
}

.t {
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.u {
  font-size: 12px;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status {
  margin-top: 10px;
  font-size: 12px;
  min-height: 18px;
  opacity: 0.85;
}
</style>
