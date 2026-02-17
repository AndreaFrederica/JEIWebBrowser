import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'
import checker from 'vite-plugin-checker'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [checker({ typescript: { tsconfigPath: 'tsconfig.node.json' } }), externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'webview-home': resolve(__dirname, 'src/preload/webview-home.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'webview'
          }
        }
      }),
      checker({ typescript: { tsconfigPath: 'tsconfig.web.json' } })
    ],
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
