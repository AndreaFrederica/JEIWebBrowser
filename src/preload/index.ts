import { contextBridge, ipcRenderer } from 'electron'

const ipc = {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args))
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('ipc', ipc)
} else {
  // @ts-ignore
  window.ipc = ipc
}
