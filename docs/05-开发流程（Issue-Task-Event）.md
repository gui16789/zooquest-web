# 开发流程（Issue → Task → Event）

目标：每次开发都可追溯、可复盘，避免需求漂移与屎山演进。

> 你已有 `开发流水线.md` 的模板，这里把它落到 GitHub Issue 的工作流里。

## 0. 基本约定
- 每次开发先建 **Issue**（对应一个 Task）
- 每次合并/部署后补一条 **Event 记录**（对齐一次提交或一次大改）
- Task ID 与 Event ID 用统一编号

## 1. Task（Issue）模板（建议）

### 标题格式
`DEV-YYYYMMDD-XXX｜一句话标题`

### Issue 正文模板
```
## Context｜上下文
- 背景：
- 关联关卡/单元：u?
- 关联文档：docs/xx.md

## Constraints｜约束
- 技术栈：Next.js + Supabase
- 不做的事：
- 数据来源：docx -> content.json

## Expected Output｜预期产物
- 代码：涉及目录/文件
- 文档：需要更新哪些 docs
- 验收：可复现的验收步骤

## Checkpoints｜检查点
1. 规则/设计确认（文档）
2. 实现完成（代码）
3. 验证（lint/build + 线上验证）
4. Event 记录补齐

## Notes & Decisions｜关键决策
- 决策点：
- 放弃方案：
- 风险：
```

## 2. Event 记录模板（你指定版）

> 用来记录“这次操作做了什么”，粒度可以是一次提交、一次大改、一次排查。

- **Event ID**：`EV-YYYYMMDD-01`
- **Related Task ID**：关联的任务卡
- **Time｜时间**：
- **Type｜类型**：代码修改 / 配置变更 / 排障 / 回滚 / 文档更新

**What happened｜做了什么**

- 改动说明：
- 涉及文件 / 模块：
- 相关 commit / PR 链接：

**Result｜结果**

- 成功 / 失败：
- 影响范围：
- 后续跟进：

---

## 3. 建议的落地方式（MVP 期间）
- 每个 Task（Issue）对应一个 Git 分支：`dev/DEV-YYYYMMDD-XXX-short-title`
- 合并到 `main` 后：
  - 更新对应 docs
  - 补一条 Event（可以用 `docs/events/EV-...md` 文件保存，或直接写在 Issue 评论里）

## 4. 我建议的 Task 拆分（针对你刚提的需求）
- Task A：定义 5 大题型与玩法映射（已在 docs/01）
- Task B：Unit1 题型落地（T1/T2/T3 优先）
- Task C：8 关卡地图配置与展示
- Task D：勋章体系落地（通关/完美/坚持）
- Task E：docx 内容抽取增强（为 T2/T3/T4/T5 提供结构化数据）
