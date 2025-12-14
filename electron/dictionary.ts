import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import crypto from 'crypto';

// Use userData for persistent storage (preserved across updates)
const AUDIO_CACHE_DIR = path.join(app.getPath('userData'), 'audio_cache');

// Ensure cache directory exists immediately
try {
    fs.ensureDirSync(AUDIO_CACHE_DIR);
    console.log('Audio cache directory:', AUDIO_CACHE_DIR);
} catch (e) {
    console.error('Failed to create audio cache dir:', e);
}

export function setupDictionaryHandlers() {
    ipcMain.handle('dict:get-audio', async (event, { url, word }) => {
        try {
            if (!url) throw new Error('No URL provided');

            // Create a unique filename based on URL hash to handle same word different accents
            const hash = crypto.createHash('md5').update(url).digest('hex');
            // Some URLs might not have extension, default to .mp3
            const ext = path.extname(new URL(url).pathname) || '.mp3';
            // Clean word for filename safe
            const safeWord = word.replace(/[^a-z0-9]/gi, '_');
            const filename = `${safeWord}_${hash}${ext}`;
            const filePath = path.join(AUDIO_CACHE_DIR, filename);

            // Check if file exists
            if (await fs.pathExists(filePath)) {
                return { success: true, path: filePath };
            }

            console.log(`Downloading audio for ${word} from ${url}`);

            // Download file
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
                    console.error('Stream write error:', err);
                    fs.unlink(filePath).catch(() => { }); // Cleanup on error
                    resolve({ success: false, error: err.message });
                });
            });

        } catch (error: any) {
            console.error('Audio download error:', error);
            return { success: false, error: error.message || String(error) };
        }
    });

    ipcMain.handle('dict:search-local', async (event, word) => {
        try {
            // Lazy load DB? Or load at top? For now load here or use a singleton if we export it.
            // Let's assume we open it once or open per request (fast enough for sqlite).
            // Ideal: Open once.

            const dbPath = path.join(app.getAppPath(), 'resources/dict.db');
            // Check if DB exists
            if (!await fs.pathExists(dbPath)) {
                // Try dev path if not packed
                const devDbPath = path.join(app.getAppPath(), '../resources/dict.db'); // This might vary based on how electron runs in dev
                // Actually in dev, app.getAppPath() usually points to dist-electron or (.) 
                // Let's try standard resource path logic.
            }

            // For dev ease, let's look in expected location
            const RESOURCES_PATH = app.isPackaged
                ? path.join(process.resourcesPath, 'dict.db')
                : path.join(app.getAppPath(), 'resources/dict.db');

            // However, our script outputs to `windows/resources/dict.db`. 
            // `app.getAppPath()` in dev usually is `windows`.

            const dbLocation = path.join(app.getAppPath(), 'resources/dict.db');

            if (!fs.existsSync(dbLocation)) {
                console.warn(`Local dictionary DB not found at ${dbLocation}`);
                return { success: false, found: false };
            }

            const db = require('better-sqlite3')(dbLocation, { readonly: true });

            const row = db.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get(word);
            db.close();

            if (row) {
                return {
                    success: true,
                    found: true,
                    data: {
                        word: row.word,
                        phonetic: row.phonetic,
                        definition: row.definition,
                        translation: row.translation,
                        pos: row.pos,
                        collins: row.collins,
                        oxford: row.oxford,
                        tag: row.tag,
                        bnc: row.bnc,
                        frq: row.frq,
                        exchange: row.exchange
                    }
                };
            }

            return { success: true, found: false };

        } catch (e: any) {
            console.error('Local dict search error:', e);
            return { success: false, error: e.message };
        }
    });
}
