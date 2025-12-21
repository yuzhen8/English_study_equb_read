/**
 * CEFR Analyzer Module (WASM Version)
 * 
 * Handles EPUB text extraction and Rust/WASM analyzer invocation.
 * Replaces the legacy Python analyzer.
 */

import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// --- Interfaces ---

// The result format expected by the frontend (Legacy compatibility)
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

// The raw result from WASM
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

// Cache for the initialized WASM module
let wasmModuleCache: any = null;

/**
 * Load and initialize the WASM module.
 * For wasm-pack --target web, we need to call init() first.
 */
async function loadWasmModule(): Promise<any> {
    // Return cached module if already initialized
    if (wasmModuleCache) {
        return wasmModuleCache;
    }

    const isDev = !app.isPackaged;

    // Path resolution logic
    // Dev: cefr-core/pkg/ (relative to project root)
    // Prod: resources/cefr-core/pkg/

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

        // Check if files exist
        await fs.access(jsPath);
        await fs.access(wasmPath);

        // Dynamic import the JS module
        const wasmModule = require(jsPath);

        // For wasm-pack --target web, we need to manually initialize with the WASM binary
        // The module exports an `initSync` function for synchronous initialization
        // or `default` (init) for async initialization
        if (typeof wasmModule.initSync === 'function') {
            // Read WASM binary and initialize synchronously
            const wasmBinary = await fs.readFile(wasmPath);
            wasmModule.initSync(wasmBinary);
            console.log(`[CEFR] WASM module initialized synchronously`);
        } else if (typeof wasmModule.default === 'function') {
            // Async init with WASM path
            const wasmBinary = await fs.readFile(wasmPath);
            await wasmModule.default(wasmBinary);
            console.log(`[CEFR] WASM module initialized asynchronously`);
        } else {
            // Already initialized or bundler-style target
            console.log(`[CEFR] WASM module loaded (no explicit init needed)`);
        }

        // Cache the module
        wasmModuleCache = wasmModule;
        return wasmModule;
    } catch (e) {
        console.error(`[CEFR] Failed to load WASM module:`, e);
        throw new Error(`Failed to load CEFR Engine. Please ensure wasm-pack build is run. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
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
 * Setup CEFR analyzer IPC handlers
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
     * Check if analyzer is available
     */
    ipcMain.handle('cefr:check', async () => {
        try {
            // Check if WASM can be loaded
            await loadWasmModule();
            return {
                success: true,
                cefrDictPath: 'Embedded in WASM',
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
