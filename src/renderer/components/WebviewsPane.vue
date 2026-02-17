<script setup lang="ts">
import type { TabItem } from '../types/browser'

defineProps<{
  tabs: TabItem[]
  activeTabId: string | null
  preloadPath: string | null
}>()

const emit = defineEmits<{
  webviewRef: [tabId: string, element: Element | null]
}>()
</script>

<template>
  <div id="webviews-container">
    <webview
      v-for="tab in tabs"
      :id="`webview-${tab.id}`"
      :key="`webview-${tab.id}`"
      :preload="preloadPath || undefined"
      :src="tab.src"
      allowpopups
      :class="{ active: activeTabId === tab.id }"
      :ref="(el) => emit('webviewRef', tab.id, el as Element | null)"
    />
  </div>
</template>

<style scoped>
#webviews-container {
  flex-grow: 1;
  position: relative;
  background-color: white;
}

webview {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
}

webview.active {
  display: flex;
}
</style>
