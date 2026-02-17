<script setup lang="ts">
import BookmarksBar from './components/BookmarksBar.vue'
import HistoryModal from './components/HistoryModal.vue'
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
  addressBar,
  alwaysOnTop,
  showHistoryModal,
  showSettingsModal,
  settingsStatus,
  settingShortcut,
  homePage,
  settingHomepage,
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
  openHistory,
  openSettings,
  onAddressEnter,
  applyAlwaysOnTop,
  openBookmark,
  openBookmarkInNewTab,
  copyBookmarkLink,
  openHistoryItem,
  saveSettings
} = useBrowserState()
</script>

<template>
  <TitleBar
    :tabs="tabs"
    :active-tab-id="activeTabId"
    :always-on-top="alwaysOnTop"
    @switch-tab="switchTab"
    @close-tab="closeTab"
    @new-tab="createNewTab(homePage)"
    @minimize="minimizeWindow"
    @maximize="maximizeWindow"
    @close-window="closeWindow"
    @toggle-always-on-top="applyAlwaysOnTop"
  />

  <NavBar
    :address-bar="addressBar"
    :bookmarked="isBookmarked"
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
  />

  <BookmarksBar
    :bookmarks="bookmarks"
    @open="openBookmark"
    @open-new-tab="openBookmarkInNewTab"
    @copy-link="copyBookmarkLink"
    @remove="removeBookmark"
  />

  <WebviewsPane
    :tabs="tabs"
    :active-tab-id="activeTabId"
    :preload-path="webviewPreloadPath"
    @webview-ref="setWebviewRef"
  />

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
