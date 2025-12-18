/**
 * CEFR Analyzer Module
 * 
 * Handles EPUB text extraction and Python analyzer invocation
 */

import { ipcMain, app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// CEFR Analysis Result Interface
export interface CefrAnalysisResult {
    totalWords: number;
    uniqueWords: number;
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
    cefrDictionarySize: number;
}

/**
 * Get the path to the Python analyzer script
 * In development: py_env/analyzer.py
 * In production: resources/analyzer.exe (TODO: PyInstaller)
 */
function getAnalyzerPath(): { executable: string; args: string[]; cwd: string } {
    const isDev = !app.isPackaged;

    if (isDev) {
        // Development mode: use uv run
        const projectRoot = path.resolve(__dirname, '..');
        const pyEnvPath = path.join(projectRoot, 'py_env');
        const analyzerScript = path.join(pyEnvPath, 'analyzer.py');

        return {
            executable: 'uv',
            args: ['run', 'python', analyzerScript],
            cwd: pyEnvPath
        };
    } else {
        // Production mode: use bundled executable
        const resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'resources');
        const analyzerExe = path.join(resourcesPath, 'analyzer.exe');

        return {
            executable: analyzerExe,
            args: [],
            cwd: resourcesPath
        };
    }
}

/**
 * Get the path to the CEFR vocabulary CSV file
 */
function getCefrDictPath(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
        return path.resolve(__dirname, '..', 'resources', 'cefrj-vocabulary-profile-1.5.csv');
    } else {
        const resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'resources');
        return path.join(resourcesPath, 'cefrj-vocabulary-profile-1.5.csv');
    }
}

/**
 * Run the Python analyzer on the given text file
 */
async function runPythonAnalyzer(textFilePath: string): Promise<CefrAnalysisResult> {
    const analyzerConfig = getAnalyzerPath();
    const cefrPath = getCefrDictPath();

    // Build command args
    const fullArgs = [
        ...analyzerConfig.args,
        textFilePath,
        '--cefr',
        cefrPath
    ];

    console.log(`[CEFR] Running analyzer: ${analyzerConfig.executable} ${fullArgs.join(' ')}`);

    return new Promise((resolve, reject) => {
        const childProc: ChildProcess = spawn(analyzerConfig.executable, fullArgs, {
            cwd: analyzerConfig.cwd,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        let stdout = '';
        let stderr = '';

        childProc.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString('utf-8');
        });

        childProc.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString('utf-8');
        });

        childProc.on('close', (code: number | null) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result as CefrAnalysisResult);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse analyzer output: ${e}`));
                }
            } else {
                reject(new Error(`Analyzer exited with code ${code}: ${stderr}`));
            }
        });

        childProc.on('error', (err: Error) => {
            reject(new Error(`Failed to start analyzer: ${err.message}`));
        });
    });
}

/**
 * Extract plain text from EPUB content
 * This function receives the already-extracted text from the frontend
 */
async function createTempTextFile(text: string): Promise<string> {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `epub_text_${Date.now()}.txt`);

    await fs.writeFile(tempFile, text, 'utf-8');

    // Verify file was created
    const stats = await fs.stat(tempFile);
    console.log(`[CEFR] Temp file created: ${tempFile} (${stats.size} bytes)`);

    return tempFile;
}

/**
 * Clean up temporary file
 */
async function cleanupTempFile(filePath: string): Promise<void> {
    try {
        // Check if file exists before trying to delete
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`[CEFR] Temp file cleaned up: ${filePath}`);
    } catch (e: any) {
        // Only log if it's not a "file not found" error
        if (e.code !== 'ENOENT') {
            console.error(`[CEFR] Failed to delete temp file: ${e}`);
        }
    }
}

/**
 * Setup CEFR analyzer IPC handlers
 */
export function setupCefrAnalyzerHandlers(): void {
    /**
     * Analyze EPUB text content
     * Input: { text: string } - The extracted text content from EPUB
     * Output: CefrAnalysisResult
     */
    ipcMain.handle('cefr:analyze', async (event, { text }: { text: string }) => {
        // Validate input
        if (!text || typeof text !== 'string') {
            console.error('[CEFR] Invalid input: text is empty or not a string');
            return { success: false, error: '无效的输入：文本为空' };
        }

        const textLength = text.trim().length;
        console.log(`[CEFR] Starting analysis of ${textLength} characters...`);

        if (textLength === 0) {
            console.error('[CEFR] Text is empty after trimming');
            return { success: false, error: '提取的文本为空，请确保书籍内容可读' };
        }

        if (textLength < 50) {
            console.warn(`[CEFR] Very short text (${textLength} chars), results may be unreliable`);
        }

        let tempFile: string | null = null;

        try {
            // Create temporary text file
            tempFile = await createTempTextFile(text);

            // Run Python analyzer
            const result = await runPythonAnalyzer(tempFile);
            console.log(`[CEFR] Analysis complete: ${result.totalWords} words, primary level: ${result.primaryLevel}`);

            return { success: true, data: result };
        } catch (error) {
            console.error('[CEFR] Analysis failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        } finally {
            // Clean up temp file
            if (tempFile) {
                await cleanupTempFile(tempFile);
            }
        }
    });

    /**
     * Check if analyzer is available
     */
    ipcMain.handle('cefr:check', async () => {
        try {
            const cefrPath = getCefrDictPath();
            await fs.access(cefrPath);

            // Check if CEFR dict exists
            const stats = await fs.stat(cefrPath);

            return {
                success: true,
                cefrDictPath: cefrPath,
                cefrDictSize: stats.size
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    console.log('[CEFR] Analyzer handlers registered');
}
