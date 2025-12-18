import { app, BrowserWindow, ipcMain, net, session, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'



import { ConfigManager } from './store';
import { setupDictionaryHandlers } from './dictionary';
import { setupCefrAnalyzerHandlers } from './cefrAnalyzer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const configManager = new ConfigManager();

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: app.isPackaged ? false : true, // Allow local resources in production
            allowRunningInsecureContent: true
        },
    });

    if (app.isPackaged) {
        // Use loadFile which handles ASAR paths natively and correctly
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    }
};

app.on('ready', async () => {
    createWindow();

    // Set proxy from config
    const currentConfig = configManager.getAll();
    if (currentConfig.proxy) {
        try {
            await session.defaultSession.setProxy({ proxyRules: currentConfig.proxy });
            console.log(`Proxy set to ${currentConfig.proxy}`);
        } catch (err) {
            console.error('Failed to set proxy:', err);
        }
    }

    setupDictionaryHandlers();
    setupCefrAnalyzerHandlers();

    ipcMain.handle('translate-text', (event, { text, targetLang }) => {
        return new Promise((resolve) => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

            const request = net.request(url);

            request.on('response', (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk.toString();
                });

                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        console.error(`Translation API error: ${response.statusCode}`, data);
                        resolve({ success: false, error: `HTTP error! status: ${response.statusCode}` });
                        return;
                    }

                    try {
                        const parsedData = JSON.parse(data);
                        // Parse GTX format:
                        // 0: Translation segments [[["translated", "original", ...], ...]]
                        // 1: Definitions/Parts of speech [["noun", ["word1", "word2", ...], [["definition1", ...], ...]], ...]

                        // Extract translation
                        let translation = '';
                        if (Array.isArray(parsedData) && Array.isArray(parsedData[0])) {
                            translation = parsedData[0].map((item: any) => item[0]).join('');
                        }

                        // Extract definitions if available
                        let definitions: string[] = [];
                        if (parsedData[1] && Array.isArray(parsedData[1])) {
                            parsedData[1].forEach((part: any) => {
                                const pos = part[0]; // noun, verb, etc.
                                if (part[2] && Array.isArray(part[2])) {
                                    part[2].forEach((def: any) => {
                                        // def[0] is the definition text, def[1] is example (optional)
                                        const defText = def[0];
                                        definitions.push(`[${pos}] ${defText}`);
                                    });
                                }
                            });
                        }

                        // Extract pronunciation (phonetic)
                        // Usually at parsedData[0][1][3] or similar, varies. 
                        // Often parsedData[0][1] is NOT consistent for phonetics in 'gtx' client.
                        // But let's check basic structure. 
                        // parsedData[0] array last element usually contains phonetic if single word?
                        // For now we will skip deep phonetic extraction unless we are sure.

                        resolve({
                            success: true,
                            translation,
                            data: parsedData, // Send raw data back for frontend to process further if needed
                            definitions
                        });

                    } catch (e) {
                        console.error('JSON Parse error:', e);
                        resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
                    }
                });

                response.on('error', (error: Error) => {
                    resolve({ success: false, error: error.message });
                });
            });

            request.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });

            request.end();
        });
    });

    // Handler to change proxy dynamically
    ipcMain.handle('set-proxy', async (event, proxyRules) => {
        try {
            await session.defaultSession.setProxy({ proxyRules });
            // Also update config
            configManager.set({ proxy: proxyRules });
            return { success: true };
        } catch (error) {
            console.error('Set proxy error:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    ipcMain.handle('get-settings', () => {
        return configManager.getAll();
    });

    ipcMain.handle('save-settings', async (event, newSettings) => {
        try {
            configManager.set(newSettings);
            // Apply proxy if changed
            if (newSettings.proxy !== undefined) {
                await session.defaultSession.setProxy({ proxyRules: newSettings.proxy });
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    });

    ipcMain.handle('translate-microsoft', async (event, { text, targetLang }) => {
        return new Promise((resolve) => {
            // 1. Get Token
            const tokenRequest = net.request('https://edge.microsoft.com/translate/auth');
            tokenRequest.on('response', (response) => {
                let token = '';
                response.on('data', (chunk) => { token += chunk.toString(); });
                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        resolve({ success: false, error: 'Failed to get Microsoft token' });
                        return;
                    }

                    // 2. Translate
                    // Microsoft generic uses 'zh-Hans' for Simplified Chinese, not 'zh-CN'
                    const msTarget = targetLang === 'zh-CN' ? 'zh-Hans' : targetLang;
                    const url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&from=auto&to=${msTarget}`;

                    const request = net.request({
                        method: 'POST',
                        url: url
                    });

                    request.setHeader('Authorization', `Bearer ${token}`);
                    request.setHeader('Content-Type', 'application/json');

                    request.write(JSON.stringify([{ Text: text }]));

                    request.on('response', (transResponse) => {
                        let data = '';
                        transResponse.on('data', (chunk) => { data += chunk.toString(); });
                        transResponse.on('end', () => {
                            if (transResponse.statusCode !== 200) {
                                resolve({ success: false, error: `Microsoft API error: ${transResponse.statusCode}` });
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].translations) {
                                    const translation = parsed[0].translations[0].text;
                                    resolve({ success: true, translation, definitions: [] }); // Microsoft simple API might not give definitions easily in this format
                                } else {
                                    resolve({ success: false, error: 'Invalid response format' });
                                }
                            } catch (e) {
                                resolve({ success: false, error: String(e) });
                            }
                        });
                        transResponse.on('error', (e: any) => resolve({ success: false, error: String(e) }));
                    });

                    request.on('error', (e: any) => resolve({ success: false, error: String(e) }));
                    request.end();
                });
                response.on('error', (e: any) => resolve({ success: false, error: String(e) }));
            });
            tokenRequest.on('error', (e: any) => resolve({ success: false, error: String(e) }));
            tokenRequest.end();
        });
    });

    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const data = await fs.readFile(filePath);
            return { success: true, data: data.buffer };
        } catch (error) {
            console.error('Read file error:', error);
            return { success: false, error: String(error) };
        }
    });

    ipcMain.handle('select-file', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'EPUB Books', extensions: ['epub'] }]
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0]; // Return the first selected file path
    });

    // SRS 调试日志接口
    ipcMain.handle('debug:log-srs', async (event, data: any) => {
        try {
            const desktopPath = app.getPath('desktop');
            const logFilePath = path.join(desktopPath, 'linga_srs_debug.json');

            // 读取现有日志（如果存在）
            let existingLogs: any[] = [];
            try {
                const existingData = await fs.readFile(logFilePath, 'utf-8');
                existingLogs = JSON.parse(existingData);
                if (!Array.isArray(existingLogs)) {
                    existingLogs = [existingLogs];
                }
            } catch {
                // 文件不存在或解析失败，使用空数组
                existingLogs = [];
            }

            // 添加时间戳和新数据
            const logEntry = {
                timestamp: new Date().toISOString(),
                ...data
            };
            existingLogs.push(logEntry);

            // 写入文件
            await fs.writeFile(logFilePath, JSON.stringify(existingLogs, null, 2), 'utf-8');

            return { success: true, path: logFilePath };
        } catch (error) {
            console.error('SRS Log error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Generic AI Fetch Proxy to bypass CORS
    ipcMain.handle('ai:fetch', async (event, { url, method = 'GET', headers = {}, body }) => {
        return new Promise((resolve) => {
            try {
                const request = net.request({
                    url,
                    method
                });

                Object.entries(headers).forEach(([key, value]) => {
                    request.setHeader(key, value as string);
                });

                request.on('response', (response) => {
                    let data = '';
                    response.on('data', (chunk) => { data += chunk.toString(); });
                    response.on('end', () => {
                        resolve({
                            ok: response.statusCode >= 200 && response.statusCode < 300,
                            status: response.statusCode,
                            statusText: response.statusMessage,
                            data: data
                        });
                    });
                });

                request.on('error', (error) => {
                    console.error('AI Proxy request error:', error);
                    resolve({
                        ok: false,
                        status: 500,
                        statusText: 'Internal Error',
                        error: error.message
                    });
                });

                if (body) {
                    request.write(typeof body === 'string' ? body : JSON.stringify(body));
                }
                request.end();
            } catch (err) {
                console.error('AI Proxy setup error:', err);
                resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Setup Error',
                    error: String(err)
                });
            }
        });
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
