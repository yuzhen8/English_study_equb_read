# WASM Integration Plan

## Goal
Replace the existing Python-based CEFR analyzer with the new Rust/WASM engine (`cefr-core`).

## Steps
1.  **Modify `electron/cefrAnalyzer.ts`**:
    - Remove Python child process logic.
    - Implement dynamic loading of the WASM module.
    - Adapt the WASM output to the `CefrAnalysisResult` interface to maintain frontend compatibility.
    - Add WASM path resolution for both Dev and Production environments.
2.  **Clean up**:
    - Remove `scripts/build_analyzer.py` (if exists from previous tasks).
    - Remove `py_env` usage references.
3.  **Frontend Update (Optional)**:
    - If the result structure needs distinct changes, I will update the TypeScript interfaces. For now, I will map to the existing structure.

## Code Path
- **WASM Module Name**: `cefr-core`
- **Output Dir**: `cefr-core/pkg/`
- **Import Method**: `require` (CommonJS in Node) or `import()` (ESM). Electron main process is usually CommonJS or transpiled.

## Result Mapping Strategy
| Old Field | Source in WASM | Logic |
| :--- | :--- | :--- |
| `totalWords` | `metrics.word_count` | Direct map |
| `primaryLevel` | `cefr_level` | Direct map |
| `distribution` | `details` | Aggregated count by `level` field |
| `unknownWordsRatio` | `details` | Count of "Unknown" / Total |
| `difficultyScore` | `cefr_level` | Convert A1->1 .. C2->6 |

## Build Requirement
User must run `wasm-pack build --target nodejs` in `cefr-core/` before running the app.