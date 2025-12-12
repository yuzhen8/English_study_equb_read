# 实施计划 - UI 还原与功能增强

## 目标描述
1.  **词典页**: 严格还原上传的 UI 设计图，包含复合统计卡片、波浪图和浮动操作按钮。
2.  **书库页**: 实现类似“书架”的功能，支持导入图书后持久保存，并可进行删除管理。

## 拟议变更

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

### [路由配置 update]
```jsx
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<DictionaryDashboard />} /> {/* 默认 */}
    <Route path="dictionary/list" element={<WordList />} /> {/* 点击"所有单词"跳转 */}
    <Route path="library" element={<LibraryHome />} />
    <Route path="exercise" element={<ExerciseHub />} />
    <Route path="profile" element={<Profile />} />
  </Route>
  <Route path="reader/:bookId" element={<ReaderView />} />
</Routes>