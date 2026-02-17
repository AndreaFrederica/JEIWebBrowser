<script setup lang="ts">
defineProps<{
  visible: boolean
  shortcut: string
  homepage: string
  status: string
}>()

const emit = defineEmits<{
  close: []
  save: []
  'update:shortcut': [value: string]
  'update:homepage': [value: string]
}>()
</script>

<template>
  <div class="modal" :class="{ hidden: !visible }">
    <div class="modal-content">
      <span class="close" @click="emit('close')">&times;</span>
      <h2>Settings</h2>
      <div class="setting-item">
        <label for="setting-shortcut">Toggle Shortcut (e.g. CommandOrControl+F8):</label>
        <input
          id="setting-shortcut"
          :value="shortcut"
          type="text"
          placeholder="CommandOrControl+F8"
          @input="emit('update:shortcut', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div class="setting-item">
        <label for="setting-homepage">Home Page:</label>
        <input
          id="setting-homepage"
          :value="homepage"
          type="text"
          placeholder="jei://home"
          @input="emit('update:homepage', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <button id="save-settings" @click="emit('save')">Save</button>
      <p id="settings-status" :style="{ color: status === 'Settings saved!' ? 'lightgreen' : 'red' }">{{ status }}</p>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  z-index: 100;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: var(--bg-color);
  padding: 20px;
  border: 1px solid var(--border-color);
  width: 80%;
  max-width: 600px;
  max-height: 80%;
  overflow-y: auto;
  border-radius: 5px;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: white;
  text-decoration: none;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item label {
  display: block;
  margin-bottom: 5px;
  color: #ccc;
}

.setting-item input {
  width: 100%;
  padding: 8px;
  background-color: #2d2d2d;
  border: 1px solid #3e3e42;
  color: white;
  border-radius: 4px;
  box-sizing: border-box;
}

#save-settings {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

#save-settings:hover {
  background-color: #0063a5;
}

#settings-status {
  margin-top: 10px;
  font-size: 12px;
  height: 15px;
}

.hidden {
  display: none !important;
}
</style>
