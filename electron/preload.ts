import { contextBridge, ipcRenderer } from 'electron'
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector: string, text: string) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type as keyof NodeJS.ProcessVersions] || "Unknown")
    }
})

contextBridge.exposeInMainWorld('electronAPI', {
    translate: (text: string, targetLang: string) => ipcRenderer.invoke('translate-text', { text, targetLang }),
    translateMicrosoft: (text: string, targetLang: string) => ipcRenderer.invoke('translate-microsoft', { text, targetLang }),
    setProxy: (proxyRules: string) => ipcRenderer.invoke('set-proxy', proxyRules),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    selectFile: () => ipcRenderer.invoke('select-file'),
    getAudio: (url: string, word: string) => ipcRenderer.invoke('dict:get-audio', { url, word }),
    searchLocal: (word: string) => ipcRenderer.invoke('dict:search-local', word),
    // SRS 调试日志
    logSRS: (data: any) => ipcRenderer.invoke('debug:log-srs', data),
    // CEFR 分析
    analyzeCEFR: (text: string) => ipcRenderer.invoke('cefr:analyze', { text }),
    checkCEFR: () => ipcRenderer.invoke('cefr:check'),
    saveBookFile: (id: string, arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-book-file', { id, arrayBuffer }),
    deleteBookFile: (id: string) => ipcRenderer.invoke('delete-book-file', id),
    // Backup & Restore
    saveBackupData: (data: string) => ipcRenderer.invoke('backup:saveData', data),
    loadBackupData: () => ipcRenderer.invoke('backup:loadData'),
    exportBooks: () => ipcRenderer.invoke('backup:exportBooks'),
    aiFetch: (options: { url: string, method?: string, headers?: any, body?: any }) => ipcRenderer.invoke('ai:fetch', options)
})
