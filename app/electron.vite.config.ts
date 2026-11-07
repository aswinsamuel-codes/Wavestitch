import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
    // onnxruntime-node is a transitive dependency with native binaries: never bundle it.
    build: { externalizeDeps: { include: ['onnxruntime-node'] } }
  },
  preload: {
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } }
  },
  renderer: {
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          decoder: resolve(__dirname, 'src/renderer/decoder.html')
        }
      }
    }
  }
})
