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
  internalPageReloadTick,
  addressBar,
  alwaysOnTop,
  transparencyEnabled,
  windowOpacity,
  showHistoryModal,
  showSettingsModal,
  showCloseConfirmModal,
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
  cancelCloseConfirm,
  closeAndHideWindow,
  closeAndQuitApp,
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
  applyTransparencyEnabled,
  applyWindowOpacity,
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
      :transparency-enabled="transparencyEnabled"
      :window-opacity="windowOpacity"
      :tab-layout="tabBarLayout"
      :collapsed="verticalTabsCollapsed"
      @switch-tab="switchTab"
      @close-tab="closeTab"
      @new-tab="createNewTab(homePage)"
      @minimize="minimizeWindow"
      @maximize="maximizeWindow"
      @close-window="closeWindow"
      @toggle-always-on-top="applyAlwaysOnTop"
      @toggle-transparency="applyTransparencyEnabled"
      @set-window-opacity="applyWindowOpacity"
      @toggle-collapse="toggleVerticalTabsCollapsed"
    />

    <div id="main-column">
      <NavBar
        :address-bar="addressBar"
        :bookmarked="isBookmarked"
        :always-on-top="alwaysOnTop"
        :transparency-enabled="transparencyEnabled"
        :window-opacity="windowOpacity"
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
        @toggle-transparency="applyTransparencyEnabled"
        @set-window-opacity="applyWindowOpacity"
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
          :key="`${activeInternalUrl ?? 'none'}:${internalPageReloadTick}`"
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

  <div v-if="showCloseConfirmModal" id="close-confirm-mask" @click.self="cancelCloseConfirm">
    <div id="close-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="close-confirm-title">
      <div id="close-confirm-title">关闭 JEI 浏览器</div>
      <p id="close-confirm-desc">请选择关闭方式</p>
      <p id="close-confirm-hint">彻底退出会关闭整个程序；仅关闭窗口会继续在后台运行，可用全局快捷键重新打开。</p>
      <div id="close-confirm-actions">
        <button class="btn ghost" @click="cancelCloseConfirm">取消</button>
        <button class="btn warn" @click="closeAndHideWindow">仅关闭窗口</button>
        <button class="btn danger" @click="closeAndQuitApp">彻底退出</button>
      </div>
    </div>
  </div>
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

#close-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  box-sizing: border-box;
}

#close-confirm-dialog {
  width: min(440px, 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #252526;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.42);
  color: var(--fg-color);
  padding: 20px;
}

#close-confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

#close-confirm-desc {
  margin: 8px 0 0;
  color: var(--fg-color);
  opacity: 0.9;
  font-size: 13px;
}

#close-confirm-hint {
  margin: 10px 0 0;
  color: var(--fg-color);
  opacity: 0.72;
  line-height: 1.45;
  font-size: 12px;
}

#close-confirm-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #252526;
  color: var(--fg-color);
}

.btn:hover {
  background: #2d2d2d;
}

.btn.ghost {
  background: #252526;
  color: var(--fg-color);
}

.btn.warn {
  border-color: #0063a5;
  background: #007acc;
  color: #fff;
}

.btn.warn:hover {
  background: #0063a5;
}

.btn.danger {
  border-color: #5a2c2c;
  background: #3a2323;
  color: #ffb8b8;
}

.btn.danger:hover {
  background: #4a2a2a;
}
</style>
