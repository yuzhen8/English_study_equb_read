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
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings)
})
