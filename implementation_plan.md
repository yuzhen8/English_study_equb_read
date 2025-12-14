# 实施计划 - UI 还原与功能增强

## 目标描述
1.  **词典页**: 严格还原上传的 UI 设计图，包含复合统计卡片、波浪图和浮动操作按钮。
2.  **书库页**: 实现类似“书架”的功能，支持导入图书后持久保存，并可进行删除管理。
3.  **质量保证**: 建立自动化测试基础设施，确保核心业务逻辑的稳定性。

## 拟议变更

### [Hybrid Dictionary Service (混合词典服务)]
*详细设计参考: `hybrid_dictionary_plan.md`*

#### [NEW] [electron/main.ts]
- **IPC Handlers**:
  - `dict:get-audio(url, word)`: 下载并缓存音频，返回本地文件路径。
  - `dict:search-local(word)`: (暂缓/Mock) 本地词典查询接口，预留 SQLite 调用位置。

#### [NEW] [src/services/DictionaryService.ts]
- **HybridDictionaryService**:
  - `search(word)`: 聚合 Local + Online + AI 结果。
  - `getAudio(audioUrl, word)`: 调用 IPC 获取可播放路径。

#### [NEW] [src/services/LocalDictionary.ts]
- (Placeholder) 本地词典的简单实现或 Mock，用于测试聚合逻辑。

### [UI] WordDetailPopup Refactoring

Refactor `WordDetailPopup` to become the central "Smart Word Card" of the application.

#### [MODIFY] [WordDetailPopup.tsx](file:///f:/equb_English_learning/windows/src/components/WordDetailPopup.tsx)
-   **Data Source**: Switch from `WordStore.getWord` to `HybridDictionaryService.query`.
    -   `const [result, setResult] = useState<DictionaryResult | null>(null);`
-   **UI Layout**:
    -   **Header**:
        -   Word text (Bold, Large)
        -   Phonetic script (IPA) with **Audio Button** (Speaker icon).
        -   Tags bubbles (e.g., "ZK/GK", "Frq: 1200").
    -   **Body (Scrollable)**:
        -   **Context Section**: Display the sentence where the word was clicked (if available).
        -   **Meaning Section**:
            -   **Local**: Concise Chinese definition.
            -   **Online/AI**: Collapsible section ("Deep Dive") showing English definition, details, and AI explanation.
    -   **Footer (Fixed)**:
        -   Action Button: "Add to Dictionary" (if new) / "Mark as Mastered" / "Remove" (if existing).
        -   Status Indicator: Current status icon.

#### [MODIFY] [DictionaryDashboard.tsx](file:///f:/equb_English_learning/windows/src/pages/Dictionary/DictionaryDashboard.tsx)
-   Connect functionality: The floating "Add Word" button should trigger `WordDetailPopup` with an empty/search state or a pre-filled input.

#### [NEW] [AudioPlayer.tsx](file:///f:/equb_English_learning/windows/src/components/AudioPlayer.tsx)
-   Simple functional component to handle playing audio from URL or Local Path.
-   Logic: `new Audio(src).play()`. Handle errors.

### [UI 组件: 词典页 (Dictionary)]
*参考图片: image_acde20.png*

#### [NEW] [src/pages/Dictionary/DictionaryDashboard.tsx]
- **结构布局**:
  1.  **Header**: 左对齐标题 "词典"，下方 Tabs ("我的单词" [active], "群组")。
  2.  **AllWordsBar**: 一个圆角白色条，左侧显示 "所有单词"，右侧显示数量 pill (e.g., "12") 和箭头。点击跳转到列表页。
  3.  **StatsContainer (大圆角白色容器)**:
      - **FilterRow**: 顶部的时间筛选 Pills (周 [active], 月份, 年, 全部时间)。
      - **DashboardContent**: Flex 布局。
          - **StatItems**: 
              - `NewCard`: 蓝色渐变圆角矩形，包含 "..." 图标，文本 "新的"，大数字 "5"。
              - `StatusItem`: 简单的图标+文本+数字组合 (用于 "进行中" 和 "已学习")。
          - **Chart**: 位于 StatItems 下方，蓝色波浪面积图 (AreaChart)，横轴为周六至周五。
  4.  **FloatingActionButton (FAB)**: 
      - 固定在右下角 (fixed/absolute)。
      - 黑色圆角矩形，白色 "+" 图标和 "添加单词" 文本。

### [功能逻辑: 书库管理 (Library)]

#### [NEW] [src/services/LibraryStore.ts]
- **功能**: 管理图书的元数据持久化。
- **数据结构**: `Book { id, title, author, coverUrl, filePath, progress }`。
- **方法**:
  - `addBook(file)`: 解析 epub，提取封面，生成 ID，存入 localStorage/IndexedDB。
  - `getBooks()`: 返回图书列表。
  - `deleteBook(id)`: 从存储中移除。

#### [NEW] [src/pages/Library/LibraryHome.tsx]
- **Header**: "书库" 标题，右侧 "导入" 按钮。
- **BookGrid**: 响应式网格布局 (`grid-cols-3` or `grid-cols-4`)。
- **BookCard**: 
  - 显示封面图片 (coverUrl)。
  - 显示标题和进度条。
  - **交互**: 点击封面打开阅读器；右上角提供 "删除" 按钮或右键菜单。
- **EmptyState**: 当没有书时，显示 "点击导入开始阅读"。

### [页面: 锻炼 (Exercise)]
*保持现有计划*
- **HeroCard**: "混合练习" 蓝色卡片。
- **ModeList**: 垂直列表 (闪卡, 多项选择)。

### [通用组件]
#### [UPDATE] [src/components/Layout/BottomNav.tsx]
- 确保图标顺序符合最新需求：首页/词典/书库/锻炼/个人。
- (根据图片，书库似乎是一个单独的入口，或者集成在首页，此处暂定为独立 Tab)。

### [测试与验证 (Testing & Verification)]
*详细计划参考: `test_plan.md`*

#### [NEW] 测试基础设施
- **技术栈**: Vitest + React Testing Library + JSDOM。
- **配置**:
  - `vitest.config.ts`: 集成 Vite 配置。
  - `src/test/setup.ts`: 配置全局 Mock (尤其是 Electron IPC)。

#### [NEW] 单元测试 (Services)
- `src/services/__tests__/WordStore.test.ts`: 测试单词的 CRUD 和统计生成。
- `src/services/__tests__/HybridDictionaryService.test.ts`: 测试多源数据聚合逻辑 (Mock fetch 和 IPC)。

#### [NEW] 集成测试 (Components)
- `src/pages/Dictionary/__tests__/DictionaryDashboard.test.tsx`: 测试数据加载状态和交互。

### [Optimization] Dictionary Performance & UI
#### [MODIFY] [WordDetailPopup.tsx](file:///f:/equb_English_learning/windows/src/components/WordDetailPopup.tsx)
- **Async Audio Loading**: 
  - 确保 `hybridDictionary.query` 返回基础数据后立即渲染 UI。
  - 音频获取 (Audio Fetch) 应在后台异步执行，不阻塞界面显示。
- **UI Refinement**:
  - 调整弹窗样式，避免"全屏占用"感 (优化 Modal 尺寸或样式)。
  - 移除长时间的 "Loading" 遮罩，替换为局部 Loading 或即时响应。

### [路由配置 update]
```jsx
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<DictionaryDashboard />} /> {/* 默认 */}
    <Route path="dictionary/list" element={<WordList />} /> {/* 点击"所有单词"跳转 */}
    <Route path="library" element={<LibraryHome />} />
    <Route path="exercise" element={<ExerciseHub />} />
    <Route path="profile" element={<Profile />} />
    <Route path="settings" element={<SettingsPage />} /> {/* NEW */}
  </Route>
  <Route path="reader/:bookId" element={<ReaderView />} />
</Routes>
```