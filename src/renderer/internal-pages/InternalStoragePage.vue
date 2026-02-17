<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Copy, Edit, Globe, Trash2 } from 'lucide-vue-next'
import JsonTreeNode from '../components/internal/JsonTreeNode.vue'

const ipcRenderer =
  window.ipc ??
  ({
    send: () => {},
    invoke: async () => null,
    on: () => {}
  } as const)

const emit = defineEmits<{
  navigate: [url: string]
}>()

interface StorageItem {
  key: string
  value: unknown
  origin: string
}

interface StorageOriginItem {
  key: string
  value: unknown
}

const storageData = ref<Record<string, StorageOriginItem[]>>({})
const allItems = ref<StorageItem[]>([])
const selectedOrigin = ref<string>('all')
const loading = ref(false)
const error = ref('')
const editingItem = ref<StorageItem | null>(null)
const editKeyValue = ref('')
const newKey = ref('')
const newValue = ref('')
const newOrigin = ref('')
const showAddForm = ref(false)
const searchQuery = ref('')
const formatJson = ref(true)
const autoParseNestedJson = ref(true)

const origins = computed(() => {
  return Object.keys(storageData.value).sort()
})

function stringifyUnknown(value: unknown, spacing = 0): string {
  if (typeof value === 'string') return value
  try {
    const serialized = JSON.stringify(value, null, spacing)
    if (typeof serialized === 'string') return serialized
  } catch {
    // Fallback to simple string conversion
  }
  return String(value ?? '')
}

function toSearchableText(value: unknown): string {
  return stringifyUnknown(value).toLowerCase()
}

const filteredItems = computed(() => {
  let items = allItems.value

  // Filter by origin
  if (selectedOrigin.value !== 'all') {
    items = items.filter((item) => item.origin === selectedOrigin.value)
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item) =>
        item.key.toLowerCase().includes(query) ||
        toSearchableText(item.value).includes(query) ||
        item.origin.toLowerCase().includes(query)
    )
  }

  return items
})

function formatValue(value: unknown): string {
  // If value is already a string, try to parse it as JSON
  if (typeof value === 'string') {
    if (!formatJson.value) return value
    try {
      const parsed = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return value
    }
  }

  // If value is not a string, format it directly
  if (!formatJson.value) {
    return stringifyUnknown(value)
  }
  return stringifyUnknown(value, 2)
}

function displayValue(item: StorageItem): string {
  return formatValue(item.value)
}

async function loadStorage(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await ipcRenderer.invoke('webview-storage-getAll')
    storageData.value = data || {}

    // Flatten all items
    const flat: StorageItem[] = []
    for (const [origin, items] of Object.entries(storageData.value)) {
      for (const item of items) {
        flat.push({
          key: item.key,
          value: item.value,
          origin
        })
      }
    }
    allItems.value = flat
  } catch (e) {
    error.value = `加载失败: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    loading.value = false
  }
}

async function deleteItem(item: StorageItem): Promise<void> {
  if (!confirm(`确定要删除 "${item.origin}:${item.key}" 吗？`)) return
  try {
    await ipcRenderer.invoke('webview-storage-admin-delete', item.origin, item.key)
    await loadStorage()
  } catch (e) {
    error.value = `删除失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

function startEdit(item: StorageItem): void {
  editingItem.value = item
  // Convert value to formatted JSON string for editing
  if (typeof item.value === 'string') {
    editKeyValue.value = item.value
  } else {
    editKeyValue.value = stringifyUnknown(item.value, 2)
  }
}

function cancelEdit(): void {
  editingItem.value = null
  editKeyValue.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editingItem.value) return
  try {
    let valueToSave: unknown = editKeyValue.value

    // Try to parse as JSON if it looks like JSON
    const trimmed = editKeyValue.value.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        valueToSave = JSON.parse(trimmed)
      } catch {
        // Keep as string if not valid JSON
      }
    }

    await ipcRenderer.invoke('webview-storage-admin-set', editingItem.value.origin, editingItem.value.key, valueToSave)
    await loadStorage()
    cancelEdit()
  } catch (e) {
    error.value = `保存失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function addNewItem(): Promise<void> {
  if (!newKey.value.trim()) {
    error.value = '键名不能为空'
    return
  }
  if (!newOrigin.value.trim()) {
    error.value = '来源不能为空'
    return
  }
  try {
    let valueToSave: unknown = newValue.value

    // Try to parse as JSON if it looks like JSON
    const trimmed = newValue.value.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        valueToSave = JSON.parse(trimmed)
      } catch {
        // Keep as string if not valid JSON
      }
    }

    await ipcRenderer.invoke('webview-storage-admin-set', newOrigin.value.trim(), newKey.value.trim(), valueToSave)
    newKey.value = ''
    newValue.value = ''
    newOrigin.value = ''
    showAddForm.value = false
    await loadStorage()
  } catch (e) {
    error.value = `添加失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function clearOrigin(origin: string): Promise<void> {
  if (!confirm(`确定要清空 "${origin}" 的所有数据吗？此操作不可恢复！`)) return
  try {
    await ipcRenderer.invoke('webview-storage-admin-clear-origin', origin)
    await loadStorage()
  } catch (e) {
    error.value = `清空失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function clearAll(): Promise<void> {
  if (!confirm('确定要清空所有存储数据吗？此操作不可恢复！')) return
  if (!confirm('再次确认：真的要清空所有数据吗？')) return
  try {
    await ipcRenderer.invoke('webview-storage-admin-clear-all')
    await loadStorage()
  } catch (e) {
    error.value = `清空失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

function copyValue(value: unknown): void {
  const text = typeof value === 'string' ? value : stringifyUnknown(value, 2)
  navigator.clipboard.writeText(text)
}

function copyKey(key: string): void {
  navigator.clipboard.writeText(key)
}

function copyOrigin(origin: string): void {
  navigator.clipboard.writeText(origin)
}

async function openStorageDir(): Promise<void> {
  try {
    await ipcRenderer.invoke('webview-storage-open-dir')
  } catch (e) {
    error.value = `打开目录失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

const storageCount = computed(() => allItems.value.length)
const totalSize = computed(() => {
  return allItems.value.reduce((acc, item) => {
    const valueSize = stringifyUnknown(item.value).length
    return acc + item.key.length + valueSize
  }, 0)
})

onMounted(() => {
  void loadStorage()
})
</script>

<template>
  <div class="storage-page">
    <div class="header">
      <h1>存储查看器</h1>
      <div class="stats">
        <span class="stat">共 {{ storageCount }} 条数据</span>
        <span class="stat">约 {{ (totalSize / 1024).toFixed(2) }} KB</span>
        <span class="stat">{{ origins.length }} 个来源</span>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="selectedOrigin" class="origin-select">
        <option value="all">所有来源</option>
        <option v-for="origin in origins" :key="origin" :value="origin">
          {{ origin }}
        </option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索键、值或来源..."
        class="search-input"
      >
      <label class="format-toggle">
        <input v-model="formatJson" type="checkbox">
        树状 JSON
      </label>
      <label v-if="formatJson" class="format-toggle">
        <input v-model="autoParseNestedJson" type="checkbox">
        解析嵌套 JSON 字符串
      </label>
      <button class="btn" @click="void loadStorage()">刷新</button>
      <button class="btn secondary" @click="showAddForm = !showAddForm">
        {{ showAddForm ? '取消' : '添加' }}
      </button>
      <button
        v-if="selectedOrigin !== 'all'"
        class="btn danger"
        @click="clearOrigin(selectedOrigin)"
      >
        清空当前来源
      </button>
      <button class="btn danger" @click="clearAll()">清空全部</button>
      <button class="btn secondary" @click="openStorageDir()">打开存储目录</button>
      <button class="btn secondary" @click="emit('navigate', 'jei://settings')">返回设置</button>
    </div>

    <div v-if="showAddForm" class="add-form">
      <input
        v-model="newOrigin"
        type="text"
        placeholder="来源 (例如: https://example.com)"
        class="input origin-input"
      >
      <input
        v-model="newKey"
        type="text"
        placeholder="键名"
        class="input"
      >
      <textarea
        v-model="newValue"
        placeholder="值 (支持 JSON 格式)"
        class="textarea"
        rows="3"
      ></textarea>
      <button class="btn" @click="addNewItem()">保存</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="filteredItems.length === 0" class="empty">
      {{ searchQuery ? '没有找到匹配的数据' : '存储为空' }}
    </div>

    <div v-else class="items-list">
      <div
        v-for="item in filteredItems"
        :key="`${item.origin}:${item.key}`"
        class="storage-item"
        :class="{ editing: editingItem?.origin === item.origin && editingItem?.key === item.key }"
      >
        <div v-if="editingItem?.origin === item.origin && editingItem?.key === item.key" class="edit-mode">
          <div class="edit-meta">
            <span class="edit-origin">{{ item.origin }}</span>
            <span class="edit-separator">:</span>
            <span class="edit-key">{{ item.key }}</span>
          </div>
          <textarea
            v-model="editKeyValue"
            class="edit-textarea"
            rows="8"
          ></textarea>
          <div class="edit-actions">
            <button class="btn" @click="saveEdit()">保存</button>
            <button class="btn secondary" @click="cancelEdit()">取消</button>
          </div>
        </div>

        <div v-else class="view-mode">
          <div class="item-header">
            <div class="item-title">
              <span class="item-origin">{{ item.origin }}</span>
              <span class="item-separator">:</span>
              <span class="item-key">{{ item.key }}</span>
            </div>
            <div class="item-actions">
              <button class="icon-btn" title="复制来源" @click="copyOrigin(item.origin)">
                <Globe :size="14" />
              </button>
              <button class="icon-btn" title="复制键" @click="copyKey(item.key)">
                <Copy :size="14" />
              </button>
              <button class="icon-btn" title="复制值" @click="copyValue(item.value)">
                <Copy :size="14" />
              </button>
              <button class="icon-btn" title="编辑" @click="startEdit(item)">
                <Edit :size="14" />
              </button>
              <button class="icon-btn danger" title="删除" @click="deleteItem(item)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div v-if="formatJson" class="item-value tree-view">
            <JsonTreeNode
              :value="item.value"
              :initially-open="true"
              :auto-parse-json-string="autoParseNestedJson"
              :max-auto-parse-depth="5"
            />
          </div>
          <pre v-else class="item-value">{{ displayValue(item) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #d4d4d4;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 13px;
  opacity: 0.7;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.origin-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
  font-size: 13px;
  min-width: 200px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
}

.format-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #007acc;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.btn:hover {
  background: #005a9e;
}

.btn.secondary {
  background: #252526;
}

.btn.secondary:hover {
  background: #2d2d2d;
}

.btn.danger {
  background: #3a2323;
  border-color: #5a2c2c;
  color: #ffb8b8;
}

.btn.danger:hover {
  background: #4a2a2a;
}

.add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.input, .textarea {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
  background: #252526;
  color: #fff;
  font-size: 13px;
}

.input {
  width: 200px;
}

.origin-input {
  flex: 1;
  min-width: 250px;
}

.textarea {
  flex: 1;
  min-width: 300px;
  resize: vertical;
  font-family: 'Consolas', 'Monaco', monospace;
}

.error {
  padding: 12px;
  background: #3a2323;
  border: 1px solid #5a2c2c;
  border-radius: 8px;
  color: #ffb8b8;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 40px;
  opacity: 0.7;
}

.empty {
  text-align: center;
  padding: 40px;
  opacity: 0.5;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.storage-item {
  background: #252526;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  overflow: hidden;
}

.storage-item.editing {
  border-color: #007acc;
}

.view-mode, .edit-mode {
  padding: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.item-origin {
  font-weight: 600;
  color: #569cd6;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.item-separator {
  color: #808080;
}

.item-key {
  font-weight: 600;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  color: #ccc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #2d2d2d;
  color: #fff;
}

.icon-btn.danger:hover {
  background: #3a2323;
  color: #ffb8b8;
}

.item-value {
  margin: 0;
  padding: 10px;
  background: #1e1e1e;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow: auto;
}

.item-value.tree-view {
  white-space: normal;
  word-break: normal;
  line-height: 1.4;
}

.edit-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.edit-origin {
  font-weight: 600;
  color: #569cd6;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.edit-separator {
  color: #808080;
}

.edit-key {
  font-weight: 600;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.edit-textarea {
  width: 100%;
  padding: 10px;
  background: #1e1e1e;
  border: 1px solid #2d2d2d;
  border-radius: 6px;
  color: #fff;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  resize: vertical;
  min-height: 200px;
  margin-bottom: 10px;
}

.edit-actions {
  display: flex;
  gap: 10px;
}
</style>
