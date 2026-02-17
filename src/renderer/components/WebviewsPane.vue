<script setup lang="ts">
import { computed } from 'vue'
import { isInternalUrl } from '../pages/internal-home'
import type { TabItem } from '../types/browser'

const props = defineProps<{
  tabs: TabItem[]
  activeTabId: string | null
  preloadPath: string | null
}>()

const emit = defineEmits<{
  webviewRef: [tabId: string, element: Element | null]
}>()

const externalTabs = computed(() => props.tabs.filter((tab) => !isInternalUrl(tab.src)))
</script>

<template>
  <div id="webviews-container">
    <webview
      v-for="tab in externalTabs"
      :id="`webview-${tab.id}`"
      :key="`webview-${tab.id}`"
      :preload="props.preloadPath || undefined"
      :src="tab.src"
      allowpopups
      :class="{ active: props.activeTabId === tab.id }"
      :ref="(el) => emit('webviewRef', tab.id, el as Element | null)"
    />
  </div>
</template>

<style scoped>
#webviews-container {
  position: absolute;
  inset: 0;
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
