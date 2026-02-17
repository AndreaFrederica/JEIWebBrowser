# JEI Storage API Documentation

Persistent storage API for webview pages in JEI Browser.

## Overview

`JEIStorage` is a persistent storage API available to webview pages, similar to `localStorage` but with key differences:

- Data persists across browser sessions
- Storage is backed by electron-store (file-based storage)
- Default scope is isolated by origin (protocol + host + port)
- Optional namespace scope is supported for shared buckets
- All operations are asynchronous (Promise-based)

## Availability

The API is available in webview contexts via `window.JEIStorage`.

```javascript
// Check if API is available
if (window.JEIStorage) {
  // Use JEIStorage
}
```

## API Reference

### getItem(key, namespace?)

Retrieves a value from storage.

**Parameters:**
- `key` (string) - The key to retrieve
- `namespace` (string, optional) - Namespace scope name. If omitted, uses current origin scope.

**Returns:** `Promise<string | null>` - The stored value, or `null` if not found

**Example:**
```javascript
const username = await window.JEIStorage.getItem('username')
const sharedToken = await window.JEIStorage.getItem('token', 'shared-auth')
if (username) {
  console.log('Welcome back, ' + username)
}
```

### setItem(key, value, namespace?)

Stores a key-value pair.

**Parameters:**
- `key` (string) - The key to store under
- `value` (string) - The value to store
- `namespace` (string, optional) - Namespace scope name. If omitted, uses current origin scope.

**Returns:** `Promise<void>` - Resolves when the value is stored

**Example:**
```javascript
await window.JEIStorage.setItem('username', 'player1')
await window.JEIStorage.setItem('level', '42')
await window.JEIStorage.setItem('token', 'abc123', 'shared-auth')
```

### removeItem(key, namespace?)

Removes a single item from storage.

**Parameters:**
- `key` (string) - The key to remove
- `namespace` (string, optional) - Namespace scope name. If omitted, uses current origin scope.

**Returns:** `Promise<void>` - Resolves when the item is removed

**Example:**
```javascript
await window.JEIStorage.removeItem('cachedData')
await window.JEIStorage.removeItem('token', 'shared-auth')
```

### clear(namespace?)

Removes all items for current origin scope, or a namespace scope when specified.

**Parameters:**
- `namespace` (string, optional) - Namespace scope name. If omitted, clears current origin scope.

**Returns:** `Promise<void>` - Resolves when storage is cleared

**Example:**
```javascript
await window.JEIStorage.clear()
await window.JEIStorage.clear('shared-auth')
```

### keys(namespace?)

Gets all keys stored for current origin scope, or a namespace scope when specified.

**Parameters:**
- `namespace` (string, optional) - Namespace scope name. If omitted, lists current origin scope.

**Returns:** `Promise<string[]>` - Array of all stored keys

**Example:**
```javascript
const keys = await window.JEIStorage.keys()
const nsKeys = await window.JEIStorage.keys('shared-auth')
console.log('Stored keys:', keys)
// ['username', 'level', 'lastLogin']
```

### getLength(namespace?)

Gets the number of items stored for current origin scope, or a namespace scope when specified.

**Parameters:**
- `namespace` (string, optional) - Namespace scope name. If omitted, counts current origin scope.

**Returns:** `Promise<number>` - Count of stored items

**Example:**
```javascript
const count = await window.JEIStorage.getLength()
const nsCount = await window.JEIStorage.getLength('shared-auth')
console.log(`Total items stored: ${count}`)
```

## Usage Examples

### Basic Usage

```javascript
// Store user preferences
await window.JEIStorage.setItem('theme', 'dark')
await window.JEIStorage.setItem('fontSize', '16')

// Retrieve preferences
const theme = await window.JEIStorage.getItem('theme') || 'light'
const fontSize = await window.JEIStorage.getItem('fontSize') || '14'

// Apply preferences
document.body.classList.add(theme)
document.body.style.fontSize = fontSize + 'px'
```

### Caching Data

```javascript
async function fetchWithCache(url) {
  const cached = await window.JEIStorage.getItem(url)
  if (cached) {
    return JSON.parse(cached)
  }

  const response = await fetch(url)
  const data = await response.json()
  await window.JEIStorage.setItem(url, JSON.stringify(data))
  return data
}
```

### Session State

```javascript
// Save game state
async function saveGameState(state) {
  await window.JEIStorage.setItem('gameState', JSON.stringify(state))
}

// Load game state
async function loadGameState() {
  const saved = await window.JEIStorage.getItem('gameState')
  return saved ? JSON.parse(saved) : null
}
```

### Storage Management

```javascript
// List all stored items
async function listAllItems() {
  const keys = await window.JEIStorage.keys()
  const items = {}

  for (const key of keys) {
    items[key] = await window.JEIStorage.getItem(key)
  }

  return items
}

// Remove specific items by pattern
async function removeItemsByPattern(pattern) {
  const keys = await window.JEIStorage.keys()
  const regex = new RegExp(pattern)

  for (const key of keys) {
    if (regex.test(key)) {
      await window.JEIStorage.removeItem(key)
    }
  }
}
```

## Storage Scope

Without namespace, data is isolated by origin:

| Origin | Accessible Data |
|--------|-----------------|
| `jei-home://home` | Only data stored by `jei-home://home` |
| `https://example.com` | Only data stored by `https://example.com` |
| `https://api.example.com` | Separate from `https://example.com` |

With namespace, all callers using the same namespace read/write the same bucket:

| Call | Scope |
|------|-------|
| `setItem('token', 'a', 'shared-auth')` | `namespace://shared-auth` |
| `getItem('token', 'shared-auth')` | `namespace://shared-auth` |
| `keys('shared-auth')` | `namespace://shared-auth` |

If `namespace` is empty string or whitespace, it falls back to origin scope.

## Error Handling

Always handle potential errors:

```javascript
try {
  await window.JEIStorage.setItem('key', 'value')
} catch (error) {
  console.error('Storage error:', error)
  // Handle error appropriately
}
```

## TypeScript Support

TypeScript definitions are included. Import types from the preload declaration file:

```typescript
// Type definitions are automatically available
const storage: JEIStorage = window.JEIStorage

// With proper typing
interface GameState {
  level: number
  score: number
}

const savedState = await window.JEIStorage.getItem('gameState')
if (savedState) {
  const state: GameState = JSON.parse(savedState)
}
```

## Best Practices

1. **Use meaningful keys** - Prefix keys to avoid conflicts
   ```javascript
   await window.JEIStorage.setItem('app:user', 'alice')
   await window.JEIStorage.setItem('app:session', 'xyz123')
   ```

2. **Use namespace intentionally** - Use stable names for shared data
   ```javascript
   await window.JEIStorage.setItem('token', 'abc123', 'shared-auth')
   ```

3. **Serialize complex data** - Use JSON for objects
   ```javascript
   await window.JEIStorage.setItem('data', JSON.stringify({ x: 1, y: 2 }))
   ```

4. **Check for null** - `getItem` returns `null` for missing keys
   ```javascript
   const value = await window.JEIStorage.getItem('key') ?? 'default'
   ```

5. **Clean up unused data** - Remove old keys to prevent storage bloat
   ```javascript
   await window.JEIStorage.removeItem('tempData')
   ```

## Comparison with localStorage

| Feature | localStorage | JEIStorage |
|---------|--------------|------------|
| Persistence | Session-limited | Persistent across sessions |
| Async | Synchronous | Asynchronous (Promise-based) |
| Storage limit | ~5-10MB | Limited by disk space |
| Scope | Origin | Origin (default) + Namespace (optional) |
| Backend | Browser storage | electron-store (file-based) |

## See Also

- [JEIHome API](./JEIHome-API.md) - Browser-level functionality
- [Main Process Documentation](../README.md) - Overall browser architecture
