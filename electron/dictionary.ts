import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import crypto from 'crypto';
import zlib from 'zlib';

// 使用 userData 进行持久存储 (跨更新保留)
const AUDIO_CACHE_DIR = path.join(app.getPath('userData'), 'audio_cache');

// 确保缓存目录立即存在
try {
    fs.ensureDirSync(AUDIO_CACHE_DIR);
    console.log('音频缓存目录:', AUDIO_CACHE_DIR);
} catch (e) {
    console.error('创建音频缓存目录失败:', e);
}

export function setupDictionaryHandlers() {
    ipcMain.handle('dict:get-audio', async (event, { url, word }) => {
        try {
            if (!url) throw new Error('No URL provided');

            // 基于 URL 哈希创建唯一文件名，以处理相同单词不同口音的情况
            const hash = crypto.createHash('md5').update(url).digest('hex');
            // 某些 URL 可能没有扩展名，默认为 .mp3
            const ext = path.extname(new URL(url).pathname) || '.mp3';
            // 清理单词以确保文件名安全
            const safeWord = word.replace(/[^a-z0-9]/gi, '_');
            const filename = `${safeWord}_${hash}${ext}`;
            const filePath = path.join(AUDIO_CACHE_DIR, filename);

            // 检查文件是否存在
            if (await fs.pathExists(filePath)) {
                return { success: true, path: filePath };
            }

            console.log(`正在下载音频 ${word} 从 ${url}`);

            // 下载文件
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve({ success: true, path: filePath }));
                writer.on('error', (err: any) => {
                    console.error('流写入错误:', err);
                    fs.unlink(filePath).catch(() => { }); // 出错时清理
                    resolve({ success: false, error: err.message });
                });
            });

        } catch (error: any) {
            console.error('音频下载错误:', error);
            return { success: false, error: error.message || String(error) };
        }
    });

    ipcMain.handle('dict:search-local', async (event, word) => {
        try {
            const { lookupFstOffset } = require('./cefrAnalyzer');

            // 1. 通过 WASM FST 查找偏移量
            // 返回 BigInt (u64) 或 undefined
            const offsetBigInt = await lookupFstOffset(word);

            if (offsetBigInt === undefined) {
                return { success: true, found: false };
            }

            // 2. 从 dict.data 读取数据
            const isDev = !app.isPackaged;
            let resourcesPath: string;
            if (isDev) {
                resourcesPath = path.join(process.cwd(), 'resources');
            } else {
                resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'resources');
            }
            const dataPath = path.join(resourcesPath, 'dict.data');

            // 检查是否存在
            if (!await fs.pathExists(dataPath)) {
                console.error('dict.data not found');
                return { success: false, found: false };
            }

            const offset = Number(offsetBigInt); // 安全转换为 number (文件大小 < 9PB)

            // Read Length (4 bytes u32 LE)
            const fd = await fs.open(dataPath, 'r');
            try {
                const lenBuf = Buffer.alloc(4);
                const { bytesRead } = await fs.read(fd, lenBuf, 0, 4, offset);
                if (bytesRead < 4) throw new Error('Failed to read entry length');

                const dataLen = lenBuf.readUInt32LE(0);

                // 读取并解压数据
                const compressedBuf = Buffer.alloc(dataLen);
                await fs.read(fd, compressedBuf, 0, dataLen, offset + 4);

                const decompressedBuf = zlib.inflateRawSync(compressedBuf);
                const jsonStr = decompressedBuf.toString('utf-8');
                const arr = JSON.parse(jsonStr); // Expect array

                // Reconstruct object from [phonetic, definition, translation, tag, exchange]
                const entry = {
                    word: word,
                    phonetic: arr[0],
                    definition: arr[1],
                    translation: arr[2],
                    tag: arr[3],
                    exchange: arr[4]
                };

                return {
                    success: true,
                    found: true,
                    data: entry
                };
            } finally {
                await fs.close(fd);
            }

        } catch (e: any) {
            console.error('Local dict search error:', e);
            return { success: false, error: e.message };
        }
    });
}
