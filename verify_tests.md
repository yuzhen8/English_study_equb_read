# 测试验证指南 (Test Verification Guide)

已为项目配置了基于 **Vitest** 和 **React Testing Library** 的测试基础设施。由于环境限制，自动验证步骤可能未完全捕获输出，请按照以下步骤在本地验证测试环境。

## 1. 验证依赖安装

确保 `package.json` 中包含以下开发依赖：
*   `vitest`
*   `jsdom`
*   `@testing-library/react`
*   `@testing-library/jest-dom`
*   `@testing-library/user-event`

如果缺失或版本不兼容，请运行：
```bash
npm install
```

## 2. 运行测试

在终端中执行以下命令运行所有测试：

```bash
npm test
# 或者
npx vitest run
```

### 预期输出
你应该看到类似以下的绿色输出：

```text
 ✓ src/test/simple.test.ts (1)
 ✓ src/services/__tests__/WordStore.test.ts (3)
 ✓ src/services/__tests__/HybridDictionaryService.test.ts (2)

 Test Files  3 passed (3)
      Tests  6 passed (6)
```

## 3. 已包含的测试范围

1.  **Smoke Test**: `src/test/simple.test.ts` - 验证 Vitest 环境本身是否工作。
2.  **Service Unit Test**: `src/services/__tests__/WordStore.test.ts`
    *   测试单词添加 (防重复)。
    *   测试统计数据计算 (New/Learning/Mastered)。
3.  **Service Integration Test**: `src/services/__tests__/HybridDictionaryService.test.ts`
    *   测试混合查询逻辑 (本地未命中 -> 在线获取)。
    *   测试在线 API 结果解析与音频缓存触发。
    *   测试 AI 翻译回退机制。

## 4. 下一步计划
*   完善 `TranslationService.test.ts`。
*   添加组件级集成测试 (`DictionaryDashboard.tsx`)。
