# CEFR 分析引擎使用指南 (Rust/WASM)

我已实现了基于 Rust 的 **高性能 CEFR 分析引擎** 并将其编译为 WASM。该引擎使用纯算法（启发式规则）来从 12 个维度分析文本，无需依赖沉重的 AI 模型。

## 📂 项目结构

- **`cefr-core/`**: Rust 项目根目录。
  - **`Cargo.toml`**: 依赖配置，包含 `wasm-bindgen`, `serde`, `aho-corasick`, `regex` 等。
  - **`assets/dictionary.csv`**: 基于 CSV 的内置词典，包含词元(Lemma)、词性(POS)、CEFR等级及抽象性标记。
  - **`src/lib.rs`**: 主要入口文件。导出了 `analyze(text)` 函数供 WASM 调用。
  - **`src/dictionary.rs`**: 处理 CSV 加载及高效的 HashMap 查找。集成了 `Aho-Corasick` 算法用于短语匹配。
  - **`src/pos.rs`**: 词性标注 (POS) 的封装层（当前实现了基础查找逻辑，可扩展为 `viterbi_pos_tagger`）。
  - **`src/syntax.rs`**: 实现 `SyntacticAnalyzer`，用于分析从句密度、被动语态正则检测及树深度估算。
  - **`src/discourse.rs`**: 实现 `DiscourseAnalyzer`，用于分析连接词复杂度、抽象性指标及命名实体识别 (NER)。

## 🛠 已实现的算法

### 1. 词汇分析 (Lexical Analysis)
- **POS 查找**: 将 Token 映射为标准词性标签。
- **短语提取**: 使用 `Aho-Corasick` 算法以 $O(n)$ 时间复杂度识别多词短语 (例如 "in spite of")。
- **等级评分**: 单词/短语等级的加权平均 (A1=1.0 至 C2=6.0)。

### 2. 句法分析 (Syntactic Analysis)
- **从句密度**: 计算从属连词 (`because`, `although` 等) 与句子数量的比例。
- **被动语态**: 使用正则模式 `\b(be_verb)\s+(ed|en_suffix)\b` 进行识别。
- **树深度**: 通过逗号和连词嵌套深度进行估算。

### 3. 如果与认知分析 (Discourse & Cognitive)
- **连接词复杂度**: 对使用 B2/C1 高级连接词的情况进行加分。
- **抽象性**: 计算带有抽象后缀 (`-tion`, `-ment`, `-ity` 等) 单词的比例。
- **NER (启发式)**: 识别潜在的命名实体 (非句首的大写单词)，避免将其误判为生僻词。

## 🚀 构建与使用

### 1. 构建 WASM 模块
在 `cefr-core/` 目录下运行以下命令：
```bash
wasm-pack build --target nodejs
# 或者如果用于 Web 环境:
wasm-pack build --target web
```
*注意: 请确保已安装 `wasm-pack`。*

### 2. 在 TypeScript/Electron 中使用
```typescript
import * as wasm from "./pkg/cefr_core";

const text = "However, the utilization of complex analysis is challenging.";
const result = wasm.analyze(text);

console.log(result);
/* 输出示例:
{
  "cefr_level": "C1",
  "metrics": {
    "syntax": { "clause_density": 0.0, "passive_ratio": 0.0, ... },
    "discourse": { "abstract_noun_ratio": 0.2, ... }
  },
  "details": [...]
}
*/
```

## ⚠️ 注意事项
- 本地构建可能因网络原因无法下载 Rust crates。请确保您的网络环境通畅。
- `src/pos.rs` 中的 `viterbi_pos_tagger` 集成目前为 fallback 模式。如果您有特定的模型文件，可以取消注释相关代码以启用完整功能。
