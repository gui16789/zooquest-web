# 内容结构化规范（Content Spec，v1）

目标：把 docx 复习资料整理成稳定的 JSON（content），供“题目生成器”随机出题。

> 原则：MVP 允许半自动（脚本抽取 + 人工补齐），但 schema 必须稳定、可版本化。

## 1. 顶层结构
- `schemaVersion`：当前为 `1`
- `subject/grade/term`：学科/年级/上下册
- `units`：8 个单元（u1-u8）

示例：
```json
{
  "schemaVersion": 1,
  "subject": "chinese",
  "grade": 2,
  "term": "up",
  "units": []
}
```

## 2. 单元 Unit
```json
{
  "unitId": "u1",
  "title": "第一单元",
  "sections": []
}
```

## 3. Section 类型（对应 5 大题型）

### 3.1 `char_table`（T1 拼音认读）
- items：`hanzi/pinyin/words`

### 3.2 `word_disambiguation`（T2 字词辨析）
- 支持三类 item（MVP 可先用其中一种）：
  - `polyphone`：多音字（汉字 + 多个读音 + 例词）
  - `syn_ant`：近义/反义词
  - `confusing`：易混词辨析（手工配置型）

### 3.3 `sentence_pattern`（T3 句子仿写）
- `patterns[]`：句型模板集合
- 每个 pattern：
  - `template`：带 slot 的模板（如 `{a}一边{v1}，一边{v2}。`）
  - `slots`：槽位定义
  - `wordBank`：每个 slot 的词库

### 3.4 `poem`（T4 古诗背诵）
- `poems[]`：诗词
- 每首诗：`title/author/lines[]`

### 3.5 `reading_comprehension`（T5 课文理解）
- `passages[]`：阅读材料
- 每篇 passage：`text + questions[]`
- 题型：
  - `mcq`：选择题
  - `true_false`：判断题

## 4. 与“普通关卡 / Boss关卡”的关系
- 普通关卡（u1）：T1/T2/T3 的 section 为主
- Boss 关卡（u1）：T4/T5 的 section 为主

工程上建议：同一个 unit 里允许同时存在 5 类 section，运行时按关卡类型（普通/Boss）选择不同的题型来源。

## 5. 生成与维护方式（MVP）
- T1：可通过脚本从 docx 表格抽取（已有 `tools/extract_char_table.py`）
- T2/T3/T4/T5：
  - 优先：从 docx 对应段落/表格抽取
  - 兜底：手工整理成 JSON（先跑起来），后续老师端再提升自动化
