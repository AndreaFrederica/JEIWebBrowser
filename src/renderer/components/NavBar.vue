<script setup lang="ts">
import {
  ArrowLeft,
  BadgeInfo,
  ArrowRight,
  Bookmark,
  Clock3,
  Globe,
  Home,
  Lock,
  Maximize2,
  Minimize2,
  Pin,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Unlock,
  X
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ConnectionCertificateInfo, ConnectionSecurityState } from '../types/browser'

const props = defineProps<{
  addressBar: string
  bookmarked: boolean
  alwaysOnTop: boolean
  showWindowControls: boolean
  connectionSecurity: ConnectionSecurityState
  connectionSecurityText: string
  connectionCertificate: ConnectionCertificateInfo | null
  connectionCertificateLoading: boolean
  connectionCertificateError: string
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
  minimize: []
  maximize: []
  closeWindow: []
  toggleAlwaysOnTop: [value: boolean]
}>()

const securityButtonRef = ref<HTMLElement | null>(null)
const securityPopoverRef = ref<HTMLElement | null>(null)
const securityPopoverOpen = ref(false)

const parsedAddress = computed(() => {
  const raw = (props.addressBar || '').trim()
  if (!raw) {
    return {
      raw: '',
      protocol: '',
      host: '',
      origin: ''
    }
  }

  if (raw.startsWith('jei://')) {
    return {
      raw,
      protocol: 'jei',
      host: 'internal',
      origin: 'jei://'
    }
  }

  try {
    const url = new URL(raw)
    return {
      raw,
      protocol: url.protocol.replace(':', ''),
      host: url.host,
      origin: url.origin
    }
  } catch {
    return {
      raw,
      protocol: '',
      host: '',
      origin: ''
    }
  }
})

const securityDescription = computed(() => {
  if (props.connectionSecurity === 'secure') return '该页面使用 HTTPS 加密传输，连接通常是安全的。'
  if (props.connectionSecurity === 'insecure') return '该页面使用 HTTP 明文传输，内容可能被窃听或篡改。'
  if (props.connectionSecurity === 'local') return '该页面是本地地址（localhost/回环地址）。'
  if (props.connectionSecurity === 'broken') return '最近一次主页面加载出现证书或 TLS 握手异常。'
  if (props.connectionSecurity === 'internal') return '这是 JEI 内置页面，不依赖外部网站证书。'
  return '当前无法可靠判断连接安全状态。'
})

function formatCertificateDate(value: string): string {
  const input = (value || '').trim()
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return input
  return parsed.toLocaleString('zh-CN', { hour12: false })
}

function toggleSecurityPopover(): void {
  securityPopoverOpen.value = !securityPopoverOpen.value
}

function closeSecurityPopover(): void {
  securityPopoverOpen.value = false
}

function onDocumentMouseDown(event: MouseEvent): void {
  if (!securityPopoverOpen.value) return
  const target = event.target as Node | null
  if (!target) return

  const clickInButton = !!securityButtonRef.value?.contains(target)
  const clickInPopover = !!securityPopoverRef.value?.contains(target)
  if (!clickInButton && !clickInPopover) {
    closeSecurityPopover()
  }
}

function onDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeSecurityPopover()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
})
</script>

<template>
  <div id="nav-bar">
    <button id="btn-home" title="Home" @click="emit('home')"><Home :size="16" /></button>
    <button id="btn-back" title="Back" @click="emit('back')"><ArrowLeft :size="16" /></button>
    <button id="btn-forward" title="Forward" @click="emit('forward')"><ArrowRight :size="16" /></button>
    <button id="btn-refresh" title="Refresh" @click="emit('refresh')"><RefreshCw :size="16" /></button>

    <div id="address-bar-wrap">
      <button
        ref="securityButtonRef"
        id="connection-indicator"
        type="button"
        :class="`state-${props.connectionSecurity}`"
        :title="props.connectionSecurityText"
        :aria-expanded="securityPopoverOpen ? 'true' : 'false'"
        aria-haspopup="dialog"
        @click.stop="toggleSecurityPopover"
      >
        <Lock v-if="props.connectionSecurity === 'secure'" :size="14" />
        <Unlock v-else-if="props.connectionSecurity === 'insecure' || props.connectionSecurity === 'local'" :size="14" />
        <ShieldAlert v-else-if="props.connectionSecurity === 'broken'" :size="14" />
        <BadgeInfo v-else-if="props.connectionSecurity === 'internal'" :size="14" />
        <Globe v-else :size="14" />
      </button>

      <div v-if="securityPopoverOpen" ref="securityPopoverRef" id="connection-popover" role="dialog" aria-label="连接状态">
        <div id="connection-popover-title">{{ props.connectionSecurityText }}</div>
        <div class="connection-row">
          <span class="key">地址</span>
          <span class="val">{{ parsedAddress.raw || '（空）' }}</span>
        </div>
        <div class="connection-row" v-if="parsedAddress.protocol">
          <span class="key">协议</span>
          <span class="val">{{ parsedAddress.protocol }}</span>
        </div>
        <div class="connection-row" v-if="parsedAddress.host">
          <span class="key">域名</span>
          <span class="val">{{ parsedAddress.host }}</span>
        </div>
        <p id="connection-popover-desc">{{ securityDescription }}</p>

        <div id="certificate-section" v-if="props.connectionSecurity === 'secure' || props.connectionSecurity === 'broken'">
          <div id="certificate-title">证书信息</div>
          <div v-if="props.connectionCertificateLoading" class="certificate-hint">正在读取证书...</div>
          <div v-else-if="props.connectionCertificateError" class="certificate-error">{{ props.connectionCertificateError }}</div>
          <template v-else-if="props.connectionCertificate">
            <div class="connection-row">
              <span class="key">颁发给</span>
              <span class="val" :title="props.connectionCertificate.subject">{{ props.connectionCertificate.subject || '（未知）' }}</span>
            </div>
            <div class="connection-row">
              <span class="key">颁发者</span>
              <span class="val" :title="props.connectionCertificate.issuer">{{ props.connectionCertificate.issuer || '（未知）' }}</span>
            </div>
            <div class="connection-row">
              <span class="key">有效期</span>
              <span class="val">
                {{ formatCertificateDate(props.connectionCertificate.validFrom) || '（未知）' }} ~
                {{ formatCertificateDate(props.connectionCertificate.validTo) || '（未知）' }}
              </span>
            </div>
            <div class="connection-row" v-if="props.connectionCertificate.subjectAltName">
              <span class="key">备用名</span>
              <span class="val" :title="props.connectionCertificate.subjectAltName">{{ props.connectionCertificate.subjectAltName }}</span>
            </div>
            <div class="connection-row" v-if="props.connectionCertificate.fingerprint256">
              <span class="key">指纹</span>
              <span class="val mono" :title="props.connectionCertificate.fingerprint256">{{ props.connectionCertificate.fingerprint256 }}</span>
            </div>
            <div class="connection-row">
              <span class="key">TLS</span>
              <span class="val">
                {{ props.connectionCertificate.tlsProtocol || '（未知）' }}
                <span v-if="props.connectionCertificate.cipherName"> / {{ props.connectionCertificate.cipherName }}</span>
              </span>
            </div>
            <div class="connection-row" v-if="props.connectionCertificate.authorizationError">
              <span class="key">验证</span>
              <span class="val certificate-error">{{ props.connectionCertificate.authorizationError }}</span>
            </div>
          </template>
        </div>
      </div>

      <input
        id="address-bar"
        :value="props.addressBar"
        type="text"
        placeholder="Enter URL..."
        @input="emit('update:addressBar', ($event.target as HTMLInputElement).value)"
        @keydown="emit('addressEnter', $event as KeyboardEvent)"
      >
    </div>

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

    <div v-if="props.showWindowControls" id="nav-drag-handle" title="拖动窗口"></div>

    <div v-if="props.showWindowControls" id="window-controls-inline">
      <label class="pin-toggle" title="Keep on top of games">
        <input type="checkbox" :checked="props.alwaysOnTop" @change="emit('toggleAlwaysOnTop', ($event.target as HTMLInputElement).checked)">
        <span class="pin-icon"><Pin :size="14" /></span>
      </label>
      <button title="Minimize" @click="emit('minimize')"><Minimize2 :size="14" /></button>
      <button title="Maximize" @click="emit('maximize')"><Maximize2 :size="14" /></button>
      <button id="btn-close-inline" title="Hide (Ctrl+F8 to show)" @click="emit('closeWindow')"><X :size="14" /></button>
    </div>
  </div>
</template>

<style scoped>
#nav-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-color);
  padding: 5px;
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
}

#nav-bar button {
  -webkit-app-region: no-drag;
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

#address-bar-wrap {
  -webkit-app-region: no-drag;
  flex-grow: 1;
  display: flex;
  align-items: center;
  position: relative;
  background-color: #2d2d2d;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  margin: 0 10px;
  min-width: 120px;
}

#address-bar-wrap:focus-within {
  border-color: #4e6a8a;
}

#connection-indicator {
  -webkit-app-region: no-drag;
  width: 28px;
  min-width: 28px;
  height: 26px;
  padding: 0;
  margin: 0 0 0 2px;
  background: transparent;
  border: none;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a8adb7;
  cursor: pointer;
}

#connection-indicator:hover {
  background: #3a3d44;
}

#connection-indicator.state-secure {
  color: #63d08a;
}

#connection-indicator.state-insecure,
#connection-indicator.state-local {
  color: #d8a15c;
}

#connection-indicator.state-broken {
  color: #e67c7c;
}

#connection-indicator.state-internal {
  color: #8ab4ff;
}

#connection-popover {
  -webkit-app-region: no-drag;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  width: min(360px, calc(100vw - 24px));
  background: #22252a;
  border: 1px solid #3e434d;
  border-radius: 8px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  padding: 10px 12px;
  color: #d7dbe3;
}

#connection-popover-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.connection-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
  align-items: start;
  margin-top: 4px;
  font-size: 12px;
}

.connection-row .key {
  color: #9da4b0;
}

.connection-row .val {
  color: #e7ebf3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#connection-popover-desc {
  margin: 10px 0 2px;
  color: #aeb5c2;
  font-size: 12px;
  line-height: 1.4;
}

#certificate-section {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #353a44;
}

#certificate-title {
  font-size: 12px;
  color: #d9deea;
  margin-bottom: 4px;
  font-weight: 600;
}

.certificate-hint {
  font-size: 12px;
  color: #aeb5c2;
}

.certificate-error {
  font-size: 12px;
  color: #f09a9a;
}

.val.mono {
  font-family: Consolas, 'Courier New', monospace;
  letter-spacing: 0.1px;
  white-space: normal;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

#address-bar {
  -webkit-app-region: no-drag;
  flex-grow: 1;
  background: transparent;
  border: none;
  color: white;
  padding: 5px 10px 5px 0;
  min-width: 0;
  outline: none;
}

button svg {
  pointer-events: none;
}

#window-controls-inline {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  margin-left: 6px;
  border-left: 1px solid #3e3e42;
  padding-left: 6px;
}

#nav-drag-handle {
  flex: 0 0 28px;
  width: 28px;
  height: 26px;
  margin-left: 4px;
}

#window-controls-inline button {
  width: 30px;
  height: 28px;
}

#btn-close-inline:hover {
  background-color: #e81123 !important;
  color: #fff;
}

.pin-toggle {
  width: 30px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ccc;
  border-radius: 4px;
}

.pin-toggle:hover {
  background-color: var(--hover-color);
}

.pin-toggle input {
  display: none;
}

.pin-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
}

.pin-toggle input:checked + .pin-icon {
  opacity: 1;
  color: #fff;
}
</style>
