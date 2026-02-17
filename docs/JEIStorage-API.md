# JEI Storage API Documentation

Persistent storage API for webview pages in JEI Browser.

## Overview

`JEIStorage` is a persistent storage API available to webview pages, similar to `localStorage` but with key differences:

- Data persists across browser sessions
- Storage is backed by electron-store (file-based storage)
- Data is isolated by origin (protocol + host + port)
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

### getItem(key)

Retrieves a value from storage.

**Parameters:**
- `key` (string) - The key to retrieve

**Returns:** `Promise<string | null>` - The stored value, or `null` if not found

**Example:**
```javascript
const username = await window.JEIStorage.getItem('username')
if (username) {
  console.log('Welcome back, ' + username)
}
```

### setItem(key, value)

Stores a key-value pair.

**Parameters:**
- `key` (string) - The key to store under
- `value` (string) - The value to store

**Returns:** `Promise<void>` - Resolves when the value is stored

**Example:**
```javascript
await window.JEIStorage.setItem('username', 'player1')
await window.JEIStorage.setItem('level', '42')
```

### removeItem(key)

Removes a single item from storage.

**Parameters:**
- `key` (string) - The key to remove

**Returns:** `Promise<void>` - Resolves when the item is removed

**Example:**
```javascript
await window.JEIStorage.removeItem('cachedData')
```

### clear()

Removes all items for the current origin.

**Returns:** `Promise<void>` - Resolves when storage is cleared

**Example:**
```javascript
await window.JEIStorage.clear()
```

### keys()

Gets all keys stored for the current origin.

**Returns:** `Promise<string[]>` - Array of all stored keys

**Example:**
```javascript
const keys = await window.JEIStorage.keys()
console.log('Stored keys:', keys)
// ['username', 'level', 'lastLogin']
```

### getLength()

Gets the number of items stored for the current origin.

**Returns:** `Promise<number>` - Count of stored items

**Example:**
```javascript
const count = await window.JEIStorage.getLength()
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

## Storage Isolation

Data is isolated by origin. Different origins cannot access each other's data:

| Origin | Accessible Data |
|--------|-----------------|
| `jei-home://home` | Only data stored by `jei-home://home` |
| `https://example.com` | Only data stored by `https://example.com` |
| `https://api.example.com` | Separate from `https://example.com` |

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

2. **Serialize complex data** - Use JSON for objects
   ```javascript
   await window.JEIStorage.setItem('data', JSON.stringify({ x: 1, y: 2 }))
   ```

3. **Check for null** - `getItem` returns `null` for missing keys
   ```javascript
   const value = await window.JEIStorage.getItem('key') ?? 'default'
   ```

4. **Clean up unused data** - Remove old keys to prevent storage bloat
   ```javascript
   await window.JEIStorage.removeItem('tempData')
   ```

## Comparison with localStorage

| Feature | localStorage | JEIStorage |
|---------|--------------|------------|
| Persistence | Session-limited | Persistent across sessions |
| Async | Synchronous | Asynchronous (Promise-based) |
| Storage limit | ~5-10MB | Limited by disk space |
| Scope | Origin | Origin |
| Backend | Browser storage | electron-store (file-based) |

## See Also

- [JEIHome API](./JEIHome-API.md) - Browser-level functionality
- [Main Process Documentation](../README.md) - Overall browser architecture
