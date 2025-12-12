import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            epubjs: 'epubjs/dist/epub.js',
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    }
})
