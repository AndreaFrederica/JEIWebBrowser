<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'JsonTreeNode'
})

interface JsonTreeEntry {
  key: string
  value: unknown
}

const props = withDefaults(
  defineProps<{
    nodeKey?: string
    value: unknown
    depth?: number
    parseDepth?: number
    autoParseJsonString?: boolean
    maxAutoParseDepth?: number
    initiallyOpen?: boolean
  }>(),
  {
    nodeKey: undefined,
    depth: 0,
    parseDepth: 0,
    autoParseJsonString: true,
    maxAutoParseDepth: 4,
    initiallyOpen: false
  }
)

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim()
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

function normalizeNodeValue(value: unknown, depth: number): unknown {
  if (!props.autoParseJsonString || depth >= props.maxAutoParseDepth) return value
  if (typeof value !== 'string') return value
  if (!looksLikeJson(value)) return value

  try {
    const parsed = JSON.parse(value)
    return normalizeNodeValue(parsed, depth + 1)
  } catch {
    return value
  }
}

const resolvedValue = computed(() => normalizeNodeValue(props.value, props.parseDepth))

const isArray = computed(() => Array.isArray(resolvedValue.value))
const isObject = computed(
  () => resolvedValue.value !== null && typeof resolvedValue.value === 'object' && !Array.isArray(resolvedValue.value)
)
const isContainer = computed(() => isArray.value || isObject.value)
const parsedFromJsonString = computed(() => typeof props.value === 'string' && typeof resolvedValue.value !== 'string')

const entries = computed<JsonTreeEntry[]>(() => {
  if (isArray.value) {
    return (resolvedValue.value as unknown[]).map((item, index) => ({
      key: String(index),
      value: item
    }))
  }

  if (isObject.value) {
    return Object.entries(resolvedValue.value as Record<string, unknown>).map(([key, value]) => ({
      key,
      value
    }))
  }

  return []
})

function leafText(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'bigint') return `${value.toString()}n`
  try {
    const serialized = JSON.stringify(value)
    if (typeof serialized === 'string') return serialized
  } catch {
    // fall through
  }
  return String(value)
}

function leafClass(value: unknown): string {
  if (value === null) return 'json-null'
  if (typeof value === 'string') return 'json-string'
  if (typeof value === 'number') return 'json-number'
  if (typeof value === 'boolean') return 'json-boolean'
  if (typeof value === 'undefined') return 'json-undefined'
  return 'json-other'
}
</script>

<template>
  <div class="json-node" :style="{ '--depth': String(depth) }">
    <template v-if="isContainer">
      <details class="json-branch" :open="initiallyOpen || depth <= 1">
        <summary class="json-summary">
          <span v-if="nodeKey" class="json-key">"{{ nodeKey }}"</span>
          <span v-if="nodeKey" class="json-colon">:</span>
          <span class="json-type">{{ isArray ? 'Array' : 'Object' }}</span>
          <span class="json-count">({{ entries.length }})</span>
          <span v-if="parsedFromJsonString" class="json-tag">parsed</span>
        </summary>

        <div class="json-children">
          <JsonTreeNode
            v-for="entry in entries"
            :key="entry.key"
            :node-key="isArray ? `[${entry.key}]` : entry.key"
            :value="entry.value"
            :depth="depth + 1"
            :parse-depth="parseDepth + 1"
            :auto-parse-json-string="autoParseJsonString"
            :max-auto-parse-depth="maxAutoParseDepth"
          />
        </div>
      </details>
    </template>

    <template v-else>
      <div class="json-leaf">
        <span v-if="nodeKey" class="json-key">"{{ nodeKey }}"</span>
        <span v-if="nodeKey" class="json-colon">:</span>
        <span class="json-value" :class="leafClass(resolvedValue)">{{ leafText(resolvedValue) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.json-node {
  margin-left: calc(var(--depth) * 14px);
}

.json-branch {
  margin: 2px 0;
}

.json-summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  list-style: none;
}

.json-summary::-webkit-details-marker {
  display: none;
}

.json-summary::before {
  content: "▸";
  color: #999;
  font-size: 10px;
  transform: translateY(-1px);
}

.json-branch[open] > .json-summary::before {
  content: "▾";
}

.json-children {
  margin-top: 4px;
}

.json-leaf {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-height: 20px;
}

.json-key {
  color: #9cdcfe;
}

.json-colon {
  color: #808080;
}

.json-type {
  color: #4ec9b0;
}

.json-count {
  color: #808080;
}

.json-tag {
  font-size: 10px;
  color: #dcdcaa;
  border: 1px solid #5a5a42;
  border-radius: 10px;
  padding: 1px 6px;
}

.json-value {
  white-space: pre-wrap;
  word-break: break-word;
}

.json-string {
  color: #ce9178;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null,
.json-undefined {
  color: #808080;
}

.json-other {
  color: #d4d4d4;
}
</style>
