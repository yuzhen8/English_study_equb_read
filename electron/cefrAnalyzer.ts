/**
 * CEFR 分析器模块 (WASM 版本)
 * 
 * 处理 EPUB 文本提取和 Rust/WASM 分析器调用。
 * 替代旧版 Python 分析器。
 */

import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// --- 接口 ---

// 前端期望的结果格式 (保留兼容性)
export interface CefrAnalysisResult {
    totalWords: number;
    uniqueWords: number; // Not strictly calculated in WASM yet, can approximate
    knownWordsCount: number;
    unknownWordsCount: number;
    unknownWordsRatio: number;
    distribution: {
        [key: string]: {
            count: number;
            percentage: number;
            uniqueWords: number;
        };
    };
    difficultyScore: number;
    primaryLevel: string;
    sampleUnknownWords: string[];
    allUnknownWords?: string[]; // All unknown words
    cefrDictionarySize: number;
    // New fields from WASM engine
    metrics?: {
        lexical_score?: number;
        adjusted_score?: number;
        syntax: any;
        discourse: any;
        sentence_count: number;
        avg_sentence_length: number;
    };
}

// 来自 WASM 的原始结果
interface WasmAnalysisResult {
    cefr_level: string;
    lexical_score: number;
    adjusted_score: number;
    metrics: {
        sentence_count: number;
        word_count: number;
        unique_word_count: number;
        avg_sentence_length: number;
        syntax: any;
        discourse: any;
    };
    details: Array<{
        text: string;
        lemma: string;
        pos: string;
        level: string; // "A1", "B2", "Unknown", etc.
        is_phrase: boolean;
    }>;
}

// 已初始化 WASM 模块的缓存
let wasmModuleCache: any = null;

/**
 * 加载并初始化 WASM 模块。
 * 对于 wasm-pack --target web，我们需要先调用 init()。
 */
async function loadWasmModule(): Promise<any> {
    // Return cached module if already initialized
    if (wasmModuleCache) {
        return wasmModuleCache;
    }

    const isDev = !app.isPackaged;

    // 路径解析逻辑
    // 开发环境: cefr-core/pkg/ (相对于项目根目录)
    // 生产环境: resources/cefr-core/pkg/

    let pkgPath: string;
    if (isDev) {
        pkgPath = path.join(process.cwd(), 'cefr-core', 'pkg');
    } else {
        const resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'resources');
        pkgPath = path.join(resourcesPath, 'cefr-core', 'pkg');
    }

    const jsPath = path.join(pkgPath, 'cefr_core.js');
    const wasmPath = path.join(pkgPath, 'cefr_core_bg.wasm');

    try {
        console.log(`[CEFR] Loading WASM JS from: ${jsPath}`);
        console.log(`[CEFR] Loading WASM binary from: ${wasmPath}`);

        // 检查文件是否存在
        await fs.access(jsPath);
        await fs.access(wasmPath);

        // 动态导入 JS 模块
        const wasmModule = require(jsPath);

        // 对于 wasm-pack --target web，我们需要手动使用 WASM 二进制文件进行初始化
        // 模块导出 `initSync` 函数用于同步初始化
        // 或 `default` (init) 用于异步初始化
        if (typeof wasmModule.initSync === 'function') {
            // 读取 WASM 二进制文件并同步初始化
            const wasmBinary = await fs.readFile(wasmPath);
            wasmModule.initSync(wasmBinary);
            console.log(`[CEFR] WASM 模块已同步初始化`);
        } else if (typeof wasmModule.default === 'function') {
            // 使用 WASM 路径异步初始化
            const wasmBinary = await fs.readFile(wasmPath);
            await wasmModule.default(wasmBinary);
            console.log(`[CEFR] WASM 模块已异步初始化`);
        } else {
            // 已初始化或打包器风格目标
            console.log(`[CEFR] WASM 模块已加载 (无需显式初始化)`);
        }

        // 缓存模块
        wasmModuleCache = wasmModule;
        return wasmModule;
    } catch (e) {
        console.error(`[CEFR] 加载 WASM 模块失败:`, e);
        throw new Error(`加载 CEFR 引擎失败。请确保已运行 wasm-pack build。错误: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Load the Dictionary FST Index into WASM.
 * This should be called once before dictionary lookups.
 */
export async function loadDictionaryIndex(): Promise<void> {
    const wasm = await loadWasmModule();

    // Check if already loaded? WASM doesn't expose "is_loaded". 
    // We can add a flag here or just re-load (low cost if small? FST is ~10MB).
    // Better to cache promise.
    if ((global as any).__fstLoaded) return;

    const isDev = !app.isPackaged;
    let resourcesPath: string;
    if (isDev) {
        resourcesPath = path.join(process.cwd(), 'resources');
    } else {
        resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'resources');
    }

    const fstPath = path.join(resourcesPath, 'dict.fst');

    try {
        if (!await fs.stat(fstPath).then(() => true).catch(() => false)) {
            console.warn('[FST] dict.fst not found at', fstPath);
            return;
        }

        console.log(`[FST] Loading index from ${fstPath}...`);
        const buffer = await fs.readFile(fstPath);

        // 传递 Uint8Array 给 WASM
        // buffer 是 Buffer，是 Uint8Array 的子类
        wasm.load_fst_index(buffer);
        console.log('[FST] 索引加载成功');
        (global as any).__fstLoaded = true;
    } catch (e) {
        console.error('[FST] 加载索引失败:', e);
        throw e;
    }
}

/**
 * Lookup offset in FST via WASM
 */
export async function lookupFstOffset(word: string): Promise<bigint | undefined> {
    const wasm = await loadWasmModule();
    // Ensure index is loaded
    await loadDictionaryIndex();

    return wasm.lookup_fst_offset(word);
}

/**
 * Map WASM result to Frontend result
 */
function mapWasmToResult(wasmResult: WasmAnalysisResult): CefrAnalysisResult {
    const totalWords = wasmResult.metrics.word_count;
    const uniqueWords = wasmResult.metrics.unique_word_count;
    const details = wasmResult.details;

    // Distribution
    // Distribution
    const counts: Record<string, number> = {
        'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'Unknown': 0
    };
    const uniqueSets: Record<string, Set<string>> = {
        'A1': new Set(), 'A2': new Set(), 'B1': new Set(), 'B2': new Set(), 'C1': new Set(), 'C2': new Set(), 'Unknown': new Set()
    };

    let unknownWordsCount = 0;

    details.forEach(token => {
        // Clean level string (unquote if needed, though serde handles it)
        let level = token.level.replace(/"/g, '');
        // Validate level key to avoid crashing on unexpected values
        if (!counts.hasOwnProperty(level)) {
            level = 'Unknown';
        }

        counts[level]++;
        uniqueSets[level].add(token.lemma);
    });

    unknownWordsCount = counts['Unknown'];
    const knownWordsCount = totalWords - unknownWordsCount;

    // Safe division
    const distribution: any = {};
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown']) {
        distribution[level] = {
            count: counts[level], // Token count
            percentage: totalWords > 0 ? (counts[level] / totalWords) * 100 : 0,
            uniqueWords: uniqueSets[level].size // Unique lemma count
        };
    }

    // Heuristic difficulty score
    const levelMap: Record<string, number> = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    const score = levelMap[wasmResult.cefr_level] || 0;

    return {
        totalWords,
        uniqueWords: uniqueWords,
        knownWordsCount,
        unknownWordsCount,
        unknownWordsRatio: totalWords > 0 ? unknownWordsCount / totalWords : 0,
        distribution,
        difficultyScore: score, // Returns 1-6 to match the UI's "/6" denominator
        primaryLevel: wasmResult.cefr_level,
        sampleUnknownWords: details
            .filter(d => {
                const l = String(d.level).replace(/"/g, '');
                return l === 'Unknown' || l === '?' || l === 'None';
            })
            .slice(0, 10)
            .map(d => d.text),
        allUnknownWords: Array.from(uniqueSets['Unknown']), // Return all unique unknown lemmas
        cefrDictionarySize: 5000,
        metrics: {
            // Include raw scores for frontend "Assesment Logic" display
            lexical_score: wasmResult.lexical_score,
            adjusted_score: wasmResult.adjusted_score,
            syntax: wasmResult.metrics.syntax,
            discourse: wasmResult.metrics.discourse,
            sentence_count: wasmResult.metrics.sentence_count,
            avg_sentence_length: wasmResult.metrics.avg_sentence_length
        }
    };
}


/**
 * 设置 CEFR 分析器 IPC 处理程序
 */
export function setupCefrAnalyzerHandlers(): void {

    ipcMain.handle('cefr:analyze', async (event, { text }: { text: string }) => {
        // Validate input
        if (!text || typeof text !== 'string') {
            return { success: false, error: '无效的输入：文本为空' };
        }

        const textLength = text.trim().length;
        console.log(`[CEFR] Starting WASM analysis of ${textLength} characters...`);

        try {
            const wasmModule = await loadWasmModule();

            // Invoke Rust function
            // analyze(text: &str) -> JsValue (JSON)
            const rawResult = wasmModule.analyze(text);

            // Note: If using serde_json::to_value, the result is already a JS object/JSON
            console.log(`[CEFR] Raw WASM result received. Level: ${rawResult.cefr_level}`);

            // DEBUG: Log unknown words
            if (rawResult.details) {
                const unknownWords = rawResult.details
                    .filter((d: any) => d.level === 'Unknown' || d.level === '?')
                    .map((d: any) => `${d.text} (${d.lemma})`);

                if (unknownWords.length > 0) {
                    console.log(`[CEFR Debug] Found ${unknownWords.length} unknown words:`);
                    // Print first 50 to avoid spamming if too many
                    console.log(unknownWords.slice(0, 50).join(', '));
                    if (unknownWords.length > 50) console.log(`...and ${unknownWords.length - 50} more.`);
                }
            }

            const finalResult = mapWasmToResult(rawResult);

            return { success: true, data: finalResult };
        } catch (error) {
            console.error('[CEFR] Analysis failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    /**
     * 检查分析器是否可用
     */
    ipcMain.handle('cefr:check', async () => {
        try {
            // 检查 WASM 是否可加载
            await loadWasmModule();
            return {
                success: true,
                cefrDictPath: '内置于 WASM',
                cefrDictSize: 'WASM'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    console.log('[CEFR] WASM Analyzer handlers registered');
}
