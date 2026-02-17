export {}

declare global {
  interface Window {
    ipc: {
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, listener: (...args: any[]) => void) => void
    }
  }
}
