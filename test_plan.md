# 测试实施与验证计划 (Test Implementation & Verification Plan)

鉴于目前项目尚未集成自动化测试框架，本计划旨在构建一个轻量级但覆盖关键路径的测试体系，重点保障核心业务逻辑（如混合词典、数据存储）的稳定性。

## 1. 技术栈选型

*   **测试运行器 (Test Runner)**: `Vitest`
    *   *理由*: 与 Vite 原生集成，配置简单，速度快，API 兼容 Jest。
*   **组件测试库**: `@testing-library/react` & `@testing-library/user-event`
    *   *理由*: React 官方推荐，关注用户交互而非实现细节。
*   **DOM 环境**: `jsdom`
*   **Mock 工具**: `Vitest` 内置 (兼容 Jest Mock)。

## 2. 测试范围与策略

### 2.1 核心服务 (Unit Tests)
*重点测试无 UI 的业务逻辑，Mock 外部依赖 (Electron IPC, HTTP 请求, DB).*

*   **`TranslationService.ts`**:
    *   测试多 Provider 切换逻辑。
    *   Mock `fetch` 请求，验证 Google/DeepSeek/Ollama 的 API 调用格式是否正确。
    *   测试错误处理（如网络失败时的 Fallback）。
*   **`HybridDictionaryService.ts`**:
    *   **核心**: 测试 `query()` 方法的聚合逻辑（并行请求、结果合并）。
    *   验证当本地词典为空时，是否正确回退到在线 API。
    *   验证音频缓存逻辑（Mock `window.electronAPI.getAudio`）。
*   **`WordStore.ts` & `LibraryStore.ts`**:
    *   Mock `dbOperations`，验证增删改查逻辑。
    *   测试状态更新（如 `updateStatus`）和统计计算（`getStats`）。

### 2.2 关键组件 (Component Integration Tests)
*重点测试交互流程，Stub Electron API。*

*   **`DictionaryDashboard.tsx`**:
    *   验证数据加载时的 Loading 状态。
    *   验证点击 "Add Word" 是否触发正确事件。
*   **`WordDetailPopup.tsx`**:
    *   验证传入 `DictionaryResult` 后，UI 是否正确渲染（音标、释义、例句）。
    *   测试点击 "Play Audio" 是否调用播放逻辑。

### 2.3 Electron 主进程 (Manual Verification / Future Automation)
*目前建议通过详细的手动验证清单覆盖，后期引入 Playwright for Electron。*

*   **IPC 通信**: 验证 `dict:query-local`, `dict:get-audio` 等通道。
*   **文件系统**: 验证 EPUB 导入、音频文件下载是否真的在磁盘创建文件。
*   **数据库**: 验证 SQLite/JSON Store 的持久化。

## 3. 实施步骤

### Phase 1: 基础设施配置 (预计 1 小时)
1.  安装依赖: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
2.  创建 `vitest.config.ts` (复用 `vite.config.ts` 配置)。
3.  配置 `src/test/setup.ts`:
    *   扩展 jest-dom 匹配器。
    *   **关键**: Mock `window.electronAPI` 全局对象，防止测试在非 Electron 环境下崩溃。

### Phase 2: 编写关键单元测试 (预计 2-3 小时)
1.  创建 `src/services/__tests__/WordStore.test.ts`: 覆盖基本的 CRUD。
2.  创建 `src/services/__tests__/HybridDictionaryService.test.ts`: 模拟 API 响应，测试聚合。

### Phase 3: 建立手动验证清单 (Verification Checklist)
在每次发布/合并前执行的冒烟测试 (Smoke Test)。

#### 验证清单示例:
*   [ ] **启动**: 应用能正常启动，无白屏。
*   [ ] **书库**:
    *   [ ] 能够拖拽/选择导入一本 `.epub` 书籍。
    *   [ ] 重启应用后，书籍依然存在。
    *   [ ] 能够打开书籍并翻页。
*   [ ] **查词**:
    *   [ ] 选中单词能弹出 Popup。
    *   [ ] 联网环境下能显示英文释义和播放音频。
    *   [ ] 断网环境下（如有本地库）能显示基础释义。
*   [ ] **生词本**:
    *   [ ] 点击 "+ Add" 能保存单词。
    *   [ ] Dictionary Dashboard 能看到新增单词统计。

## 4. 下一步行动
1.  执行 Phase 1：安装并配置 Vitest。
2.  为 `TranslationService` 编写第一个测试用例以验证环境。
