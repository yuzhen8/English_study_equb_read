# CEFR 引擎算法升级报告

以下核心算法已升级并通过编译验证：

## 1. 智能分词 (Tokenization)
- **文件**: `cefr-core/src/lib.rs`
- **改进**: 引入 `tokenize_sentence` 和 `expand_contraction`。
- **效果**: 自动拆分缩写（如 `don't` -> `do`, `not`），大幅减少因缩写导致的 "Unknown" 词汇，提升词汇覆盖率。

## 2. 上下文感知词性标注 (POS Tagging)
- **文件**: `cefr-core/src/pos.rs`
- **改进**: 实现了基于规则的标注器 (`rule-based tagger`)。
- **规则**:
    - `Determiner/Adj` + `Unknown/Ambiguous` -> `Noun` (e.g. "a *book*")
    - `To` + `Ambiguous` -> `Verb` (e.g. "to *book*")
    - `Modal` + `Ambiguous` -> `Verb` (e.g. "can *book*")
- **效果**: 解决了 "book", "date" 等常见多性词的误判问题，句法分析基础更牢固。

## 3. 稳健句法分析 (Syntax Analysis)
- **文件**: `cefr-core/src/syntax.rs`
- **改进**:
    - **被动语态**: 废除 Regex，改用 Token 遍历。支持 `Be + Adverb? + PastParticiple` 结构。
    - **不规则动词**: 内置 `IRREGULAR_PAST_PARTICIPLES` 表（如 `sold`, `written`），不再遗漏非规则变化的被动语态。
    - **句法树深度**: 废除逗号计数，改用 `Clause Markers` (that, which, if...) 和连词加权，更符合语言学逻辑。
- **效果**: 准确识别 "was sold", "was always taken" 等被动结构；复杂句判定更精准。

## 4. 命名实体识别 (NER)
- **文件**: `cefr-core/src/discourse.rs`
- **改进**:
    - **句首处理**: 句首大写单词先转小写查词典，若字典无此词则判为实体（而不是盲目判为 Unknown）。
    - **头衔识别**: 引入 `TITLES` 表 (`Mr`, `Dr`...)，强制将随后的常见名（如 "Brown"）识别为实体。
- **效果**: 修正了句首专有名词漏判和 "Mr. Brown" 被误判为颜色的问题。

## 验证与构建
- **构建状态**: `wasm-pack build --target nodejs` **成功**。
- **下一步**: 重启 Electron 应用即可体验升级后的分析引擎。
