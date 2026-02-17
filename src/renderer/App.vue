<script setup lang="ts">
import BookmarksBar from './components/BookmarksBar.vue'
import HistoryModal from './components/HistoryModal.vue'
import InternalPagesPane from './components/InternalPagesPane.vue'
import NavBar from './components/NavBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import TitleBar from './components/TitleBar.vue'
import WebviewsPane from './components/WebviewsPane.vue'
import { useBrowserState } from './composables/useBrowserState'

const {
  tabs,
  bookmarks,
  historyItems,
  activeTabId,
  activeInternalUrl,
  addressBar,
  alwaysOnTop,
  showHistoryModal,
  showSettingsModal,
  settingsStatus,
  settingShortcut,
  homePage,
  settingHomepage,
  showBookmarksBar,
  tabBarLayout,
  searchEngine,
  connectionSecurity,
  connectionSecurityText,
  connectionCertificate,
  connectionCertificateLoading,
  connectionCertificateError,
  verticalTabsCollapsed,
  webviewPreloadPath,
  isBookmarked,
  setWebviewRef,
  switchTab,
  closeTab,
  createNewTab,
  navigateTo,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  goHome,
  navigateBack,
  navigateForward,
  reloadPage,
  saveBookmark,
  removeBookmark,
  loadBookmarks,
  loadHistory,
  clearHistory,
  applySettingsFromInternalPage,
  openHistory,
  openSettings,
  onAddressEnter,
  applyAlwaysOnTop,
  toggleVerticalTabsCollapsed,
  openBookmark,
  openBookmarkInNewTab,
  copyBookmarkLink,
  openHistoryItem,
  saveSettings
} = useBrowserState()
</script>

<template>
  <div id="app-shell" :class="`layout-${tabBarLayout}`">
    <TitleBar
      :tabs="tabs"
      :active-tab-id="activeTabId"
      :always-on-top="alwaysOnTop"
      :tab-layout="tabBarLayout"
      :collapsed="verticalTabsCollapsed"
      @switch-tab="switchTab"
      @close-tab="closeTab"
      @new-tab="createNewTab(homePage)"
      @minimize="minimizeWindow"
      @maximize="maximizeWindow"
      @close-window="closeWindow"
      @toggle-always-on-top="applyAlwaysOnTop"
      @toggle-collapse="toggleVerticalTabsCollapsed"
    />

    <div id="main-column">
      <NavBar
        :address-bar="addressBar"
        :bookmarked="isBookmarked"
        :always-on-top="alwaysOnTop"
        :connection-security="connectionSecurity"
        :connection-security-text="connectionSecurityText"
        :connection-certificate="connectionCertificate"
        :connection-certificate-loading="connectionCertificateLoading"
        :connection-certificate-error="connectionCertificateError"
        :show-window-controls="tabBarLayout === 'vertical'"
        @update:address-bar="(value) => (addressBar = value)"
        @home="goHome"
        @back="navigateBack"
        @forward="navigateForward"
        @refresh="reloadPage"
        @go="navigateTo(addressBar)"
        @bookmark="saveBookmark"
        @history="openHistory"
        @settings="openSettings"
        @address-enter="onAddressEnter"
        @minimize="minimizeWindow"
        @maximize="maximizeWindow"
        @close-window="closeWindow"
        @toggle-always-on-top="applyAlwaysOnTop"
      />

      <BookmarksBar
        v-if="showBookmarksBar"
        :bookmarks="bookmarks"
        @open="openBookmark"
        @open-new-tab="openBookmarkInNewTab"
        @copy-link="copyBookmarkLink"
        @remove="removeBookmark"
      />

      <div id="content-pane">
        <WebviewsPane
          :tabs="tabs"
          :active-tab-id="activeTabId"
          :preload-path="webviewPreloadPath"
          @webview-ref="setWebviewRef"
        />

        <InternalPagesPane
          :active-internal-url="activeInternalUrl"
          :search-engine="searchEngine"
          :bookmarks="bookmarks"
          :history-items="historyItems"
          :on-navigate="navigateTo"
          :on-open-in-new-tab="openBookmarkInNewTab"
          :on-refresh-bookmarks="loadBookmarks"
          :on-refresh-history="loadHistory"
          :on-clear-history="clearHistory"
          :on-settings-saved="applySettingsFromInternalPage"
        />
      </div>
    </div>
  </div>

  <HistoryModal :visible="showHistoryModal" :items="historyItems" @close="showHistoryModal = false" @open-item="openHistoryItem" />

  <SettingsModal
    :visible="showSettingsModal"
    :shortcut="settingShortcut"
    :homepage="settingHomepage"
    :status="settingsStatus"
    @close="showSettingsModal = false"
    @save="saveSettings"
    @update:shortcut="(value) => (settingShortcut = value)"
    @update:homepage="(value) => (settingHomepage = value)"
  />
</template>

<style scoped>
#app-shell {
  flex: 1;
  min-height: 0;
  display: flex;
}

#app-shell.layout-horizontal {
  flex-direction: column;
}

#app-shell.layout-vertical {
  flex-direction: row;
}

#main-column {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

#content-pane {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
