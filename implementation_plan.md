# CEFR 引擎算法升级计划

目标：解决当前 CEFR 引擎在词性标注、句法分析、NER 和分词方面的核心痛点，提升分析准确度。

## 1. 分词 (Tokenization) 优化
**痛点**：无法处理缩写（如 "don't" -> "do", "n't"），导致单词识别为 Unknown。
**文件**：`cefr-core/src/lib.rs`
**方案**：
- 实现一个更智能的 `tokenize` 函数。
- 显式处理常见英语缩写映射（Contractions）：
    - `n't` -> `not`
    - `'re` -> `are`
    - `'m` -> `am`
    - `'ll` -> `will`
    - `'ve` -> `have`
    - `'d` -> `would/had` (需根据上下文，暂时统一处理或保留)
- 将 "cannot" 拆分为 "can", "not"。

## 2. 词性标注 (POS Tagging) 升级
**痛点**：当前仅取字典首个词性，无上下文感知（"book" 永远是名词）。
**文件**：`cefr-core/src/pos.rs`
**方案**：
- **引入上下文规则 (Rule-based Tagger / Brill-lite)**：
    - 在查表前/后应用规则进行修正。
    - **规则示例**：
        - `Preposition/Article` + `Unknown/Ambiguous` -> 倾向于 `Noun` (e.g., "a book").
        - `To` + `Ambiguous` -> 倾向于 `Verb` (e.g., "to book").
        - `Modal` (can, will) + `Ambiguous` -> 倾向于 `Verb`.
        - `Noun` + `Unknown/Ambiguous` -> 可能是 `Verb` (SVO结构) 或 `Noun` (复合名词)，优先考虑动词如果句子缺谓语。
- **实现简单 Viterbi (可选/进阶)**：如果是轻量级，可以硬编码一些基本的 Bigram 概率，但规则法性价比最高且代码量小。

## 3. 句法分析 (Syntax Analysis) 增强
**痛点**：
- 被动语态漏判不规则动词（"was sold"），误判形容词（"am tired"）。
- 句法树深度算法过于依赖逗号。
**文件**：`cefr-core/src/syntax.rs`
**方案**：
- **被动语态**：
    - 引入**不规则过去分词表** (Irregular Past Participles)，如 `sold`, `written`, `eaten`。
    - 改进 Regex 或逻辑，允许 `be` 和 `verb` 之间存在副词 (e.g., "was *always* sold")。
    - 排除常见 "系动词 + 形容词" 的误判 (如 `tired`, `bored` 虽然是分词形式，但在字典中常标记为 Adj，利用 POS 结果排除)。
- **句法深度**：
    - 废除“逗号计数法”。
    - 改为**从句标记计数法**：基于 `Clause Markers` (that, which, who, if, because, although) 和连词。
    - 赋予不同连接词不同的权重。

## 4. 命名实体识别 (NER) 改进
**痛点**：句首大写无法识别，常见名（"Brown"）冲突。
**文件**：`cefr-core/src/discourse.rs`
**方案**：
- **句首处理**：对于句首的大写单词，尝试将其转换为**小写**去字典查找。
    - 如果小写形式在字典中是**高频常用词**（如 "The", "Wait"），则不认为是人名。
    - 如果小写形式在字典中不存在，或者是非常低频的词，则保留其作为专有名词的可能性。
- **常见名与普通词冲突**：
    - 引入一个小的“常见人名/地名白名单”。
    - 或者利用上下文：如果 "Brown" 前面有 "Mr.", "Mrs.", "Dr."，则强制判定为实体。

## 执行顺序
1.  **Tokenization** (Lib): 基础，影响后续所有步骤。
2.  **POS** (Pos): 核心，提升词性准确度。
3.  **Syntax** (Syntax): 依赖准确的 POS。
4.  **NER** (Discourse): 独立优化。