# 混合词典服务实施计划 (Hybrid Dictionary Service Plan)

本计划旨在构建一个快速、丰富且支持离线的“混合”词典查询服务。

## 1. 核心架构

混合系统将结合三种数据源，按优先级聚合结果：
1.  **本地词典 (Local Core)**: 极速响应，提供基础中文释义、音标和简明例句。
    *   *数据源*: ECDICT (skywind3000/ECDICT) 的精简版 (SQLite 格式) 或 CSV 索引。
    *   *优势*: 离线可用，零延迟。
2.  **在线词典 (Online API)**: 提供原汁原味的英英释义、标准发音音频、词源和丰富例句。
    *   *数据源*: Free Dictionary API (及其他备选)。
    *   *优势*: 数据实时，内容详尽，包含真实发音。
3.  **AI 智能助手 (AI Fallback)**: 处理长难句、上下文翻译和深度词析。
    *   *数据源*: 现有的 `TranslationService` (Ollama/Google/DeepSeek)。
    *   *优势*: 理解语境，能解释生僻词或短语。

## 2. 数据流与聚合逻辑

```mermaid
graph TD
    A[用户查询单词] --> B{HybridDictionaryService}
    B -->|1. 并行请求| C[Local Dict (SQLite/DB)]
    B -->|1. 并行请求| D[Online API]
    
    C -->|返回中文释义/音标| E[聚合器 Aggregator]
    D -->|返回英文释义/音频URL| E
    
    E --> F{结果完整?}
    F -->|是| G[返回完整 DictionaryResult]
    F -->|否/需要解释| H[调用 AI Translation]
    H --> G
    
    subgraph "Main Process (Node.js)"
        C
        I[Audio Store (File System)]
    end
    
    D -->|获取音频URL| J{音频缓存检查}
    J -->|本地有| K[读取本地文件]
    J -->|本地无| L[下载并保存]
    L --> K
```

## 3. 详细模块设计

### 3.1 本地词典模块 (Local Dictionary)
由于浏览器环境 (Renderer) 不适合加载数百MB的词典数据，我们将把繁重的查询任务放在 **Main Process**。

*   **技术栈**: 优先使用 `better-sqlite3`。若构建受限，使用 `sqlite3` 或预生成的 IndexedDB 导入。
*   **数据准备**: 需要将 ECDICT 数据转换为 SQLite.
*   **IPC 接口**:
    *   `dict:query-local(word)`: 返回基础释义。

### 3.2 在线词典模块 (Online Dictionary)
*   **Endpoint**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
*   **处理逻辑**:
    *   解析 JSON，提取 `phonetics` (text & audio), `meanings`。
    *   Main 进程代理请求以统一管理缓存和跨域。

### 3.3 音频管理系统 (Audio Manager)
我们将在 Main 进程实现一个自动缓存的播放器。
*   **存储位置**: `User Data/audio_cache/`
*   **工作流**:
    1.  `getAudio(word, url)` 被调用。
    2.  检查本地是否有缓存。
    3.  **Hit**: 返回 `local://` 路径。
    4.  **Miss**: 下载并保存，返回新路径。

### 3.4 统一数据结构 (Types)
```typescript
interface DictionaryResult {
    word: string;
    phonetics: {
        text: string;    // e.g. /tɛst/
        audio?: string;  // Local path or URL
    }[];
    meanings: {
        partOfSpeech: string; // n. v. adj.
        definitions: {
            definition: string;
            example?: string;
            translation?: string; // 来自本地词典的中文
        }[];
    }[];
    source: {
        local: boolean;
        online: boolean;
        ai: boolean;
    };
    tags?: string[]; // e.g. "zk", "gk", "toefl"
}
```

## 4. 实施步骤

### Phase 1: 基础设施搭建 (Electron Main Process)
- [ ] 安装必要的后端依赖 (如 `axios`, `fs-extra` 等用于下载)。
- [ ] 在 `electron/main.ts` 中设置 IPC 处理程序。
- [ ] 实现音频下载与文件系统操作 `dict:get-audio`。

### Phase 2: 核心服务层 (Frontend Service)
- [ ] 创建 `src/services/DictionaryService.ts`。
- [ ] 实现 `HybridDictionary` 类，负责调度 IPC 和 API 请求。
- [ ] 定义并导出 `DictionaryResult` 类型。

### Phase 3: UI 升级
- [ ] 更新 `WordDetailPopup` 使用新的数据结构。
- [ ] 优化音频播放组件。

## 5. 立即行动项
1.  在 Electron 主进程创建音频下载和简单查询接口。
2.  创建前端服务类。
