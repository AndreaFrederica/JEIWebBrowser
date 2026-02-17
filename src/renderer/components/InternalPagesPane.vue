<script setup lang="ts">
import InternalBookmarksPage from '../internal-pages/InternalBookmarksPage.vue'
import InternalHistoryPage from '../internal-pages/InternalHistoryPage.vue'
import InternalHomePage from '../internal-pages/InternalHomePage.vue'
import InternalSettingsPage from '../internal-pages/InternalSettingsPage.vue'
import {
  INTERNAL_BOOKMARKS,
  INTERNAL_HISTORY,
  INTERNAL_HOME,
  INTERNAL_SETTINGS
} from '../pages/internal-home'
import type { SearchEngineKey } from '../utils/search'
import type { BookmarkItem, HistoryItem, SettingsPayload } from '../types/browser'

const props = defineProps<{
  activeInternalUrl: string | null
  searchEngine: SearchEngineKey
  bookmarks: BookmarkItem[]
  historyItems: HistoryItem[]
  onNavigate: (url: string) => void
  onOpenInNewTab: (url: string) => void
  onRefreshBookmarks: () => void
  onRefreshHistory: () => Promise<void>
  onClearHistory: () => Promise<boolean>
  onSettingsSaved: (settings: SettingsPayload) => void
}>()
</script>

<template>
  <div id="internal-pages-pane" :class="{ active: !!props.activeInternalUrl }">
    <InternalHomePage
      v-if="props.activeInternalUrl === INTERNAL_HOME"
      :search-engine="props.searchEngine"
      @navigate="props.onNavigate"
    />
    <InternalBookmarksPage
      v-if="props.activeInternalUrl === INTERNAL_BOOKMARKS"
      :bookmarks="props.bookmarks"
      :on-refresh="props.onRefreshBookmarks"
      :on-open-in-new-tab="props.onOpenInNewTab"
    />
    <InternalHistoryPage
      v-if="props.activeInternalUrl === INTERNAL_HISTORY"
      :history-items="props.historyItems"
      :on-refresh="props.onRefreshHistory"
      :on-clear="props.onClearHistory"
      :on-open-in-new-tab="props.onOpenInNewTab"
    />
    <InternalSettingsPage
      v-if="props.activeInternalUrl === INTERNAL_SETTINGS"
      :on-settings-saved="props.onSettingsSaved"
    />
  </div>
</template>

<style scoped>
#internal-pages-pane {
  position: absolute;
  inset: 0;
  display: none;
  background: #1e1e1e;
  overflow: auto;
  z-index: 2;
}

#internal-pages-pane.active {
  display: block;
}
</style>
