<script setup lang="ts">
import type { HistoryItem } from '../types/browser'

defineProps<{
  visible: boolean
  items: HistoryItem[]
}>()

const emit = defineEmits<{
  close: []
  openItem: [url: string]
}>()
</script>

<template>
  <div class="modal" :class="{ hidden: !visible }">
    <div class="modal-content">
      <span class="close" @click="emit('close')">&times;</span>
      <h2>History</h2>
      <ul id="history-list">
        <li v-for="item in items" :key="`${item.date}-${item.url}`" @click="emit('openItem', item.url)">
          {{ item.title }} - {{ item.url }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  z-index: 100;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: var(--bg-color);
  padding: 20px;
  border: 1px solid var(--border-color);
  width: 80%;
  max-width: 600px;
  max-height: 80%;
  overflow-y: auto;
  border-radius: 5px;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: white;
  text-decoration: none;
}

#history-list {
  list-style-type: none;
  padding: 0;
}

#history-list li {
  padding: 5px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#history-list li:hover {
  background-color: var(--hover-color);
}

.hidden {
  display: none !important;
}
</style>
