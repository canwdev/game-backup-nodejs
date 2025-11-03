import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@backend': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
  build: {
    outDir: '../docs',
  },
  plugins: [vue(), viteSingleFile()],
})
