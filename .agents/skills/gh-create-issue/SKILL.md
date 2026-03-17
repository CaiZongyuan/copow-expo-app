---
name: gh-create-issue
description: 从 PRD/需求生成可追踪的 GitHub issues（支持 epic + 子 issue）。默认中文撰写，技术词保留英文。
---

# GitHub Issue Creator（默认中文）

把 PRD/需求转成结构化 GitHub issues：可追踪、可验收、可拆分（epic + 子 issue）。

## 默认约定（重要）

- **语言**：标题/正文/评论默认中文叙述；代码、命令行、字段名、关键技术词（PRD/API/TDD/CI/worktree 等）保留英文
- **可验收**：每个 issue 必须有明确的验收标准（Acceptance Criteria），并写清楚验证方式（测试命令或手工步骤）
- **不猜需求**：优先从磁盘读取 `docs/prd|api|ui/*`（或用户提供的文本），缺什么再问什么

## 何时使用（When to Use）

- 你已经有 PRD（`docs/prd/<feature>.md`），希望把它变成可执行的交付切片
- 用户说“帮我建一个 issue / 把需求拆成 issues / 做一个 epic”
- 你需要把 Harness / Dev Plan 的任务同步到 GitHub 作为协作主线

## 工作流（Workflow）

### Phase 1：复杂度评估（决定 Simple vs Epic）

**更像 Simple 的信号：**
- 单一 feature / bug fix
- 影响 1–3 个模块或文件范围清晰
- 验收标准清晰且可一次性验证
- 预计 1 个 session 或 0.5–1 天内能交付

**更像 Epic 的信号：**
- 涉及多端（backend + frontend）或多模块联动
- 需要分阶段上线/迁移
- 影响 4+ 个模块，或存在显著依赖关系
- 需要多轮澄清/多角色并行（PO/QA/Implementer/Reviewer）

满足 2 条以上 Epic 信号 → 用 Epic 模式；否则 Simple 模式。

### Phase 2A：创建 Simple Issue

1) **收集最小输入**（每轮只问 2–3 个问题，避免把用户问崩）
- 目标/背景（Why now）
- 范围（In scope / Out of scope）
- 验收标准（可测试）
- 验证方式（测试命令/手工步骤）

2) **Issue 正文模板（默认中文）**

```markdown
## 背景 / 问题描述
[用中文说明问题与影响面；涉及的组件/接口名保留英文]

## 目标 / 方案概述
[高层方案；必要时列 2 个备选并说明取舍]

## 验收标准（Acceptance Criteria）
- [ ] [可测试标准 1]
- [ ] [可测试标准 2]

## 验证方式（Validation）
- Test: `<test_command>`
- 或手工步骤：...

## 技术说明（Technical Notes）
- 风险：...
- 依赖：...
- 参考文档：`docs/prd/<feature>.md` / `docs/api/<feature>.md` / `docs/ui/<feature>.md`
```

3) **创建 Issue（gh）**

```bash
gh issue create \
  --title "[Feature] <中文简述>" \
  --body "<markdown body>" \
  --label "type:feature,priority:p1"
```

4) 返回 issue URL / number，并提示下一步用 `gh-issue-implement` 开始实现。

### Phase 2B：创建 Epic + 子 Issues

1) **澄清与拆解**
- 明确范围边界与成功标准（Success Criteria）
- 按“验收标准 / endpoint / 用户路径 / 风险”拆成可独立交付的子任务
- 每个子任务尽量 1–3 天可交付

2) **Epic 正文模板（默认中文）**

```markdown
## 概述
[高层目标与背景]

## Goals
- ...

## Sub-Issues
[创建子 issue 后回填列表]

## Success Criteria
- ...

## 技术说明（Technical Notes）
- 架构/迁移点：...
- 风险与回滚：...
- 参考 PRD：`docs/prd/<feature>.md`
```

3) **创建 Epic Label（可选）**

```bash
EPIC_NAME="epic:$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-20)"
gh label create "$EPIC_NAME" --description "Epic: $TITLE" --color "0366d6" || true
```

4) **创建 Epic Issue**

```bash
EPIC_NUMBER=$(
  gh issue create \
    --title "[Epic] $TITLE" \
    --body "<markdown body>" \
    --label "epic,priority:p1" \
    --json number -q .number
)
```

5) **创建子 Issues（每个子任务一个 issue）**

```bash
gh issue create \
  --title "[Task] $SUBTASK_TITLE" \
  --body "Part of #$EPIC_NUMBER

$SUBTASK_BODY" \
  --label "$EPIC_NAME,type:feature,priority:p2"
```

6) **回填 Epic 的 Sub-Issues 列表**（用 checklist 方便追踪）

```bash
gh issue edit $EPIC_NUMBER --body "<updated markdown with sub-issues>"
```

7) 返回 epic URL + 子 issue 列表。

### Phase 2C（可选）：添加到 GitHub Project

如果用户希望把 issues 挂到 GitHub Project 看板：

1) 先确认（不要猜）：
- `--owner <org-or-user>`
- `<project-number>`
- 要添加哪些 items（epic + 子 issues 或仅子 issues）

2) 添加：

```bash
gh project item-add <project-number> --owner <org-or-user> --url <issue-url>
```

## labels（建议）

- `priority:p0/p1/p2/p3`
- `type:feature/bug/enhancement/refactor`
- `area:<component>`
- `epic` + `epic:<name>`（epic 关联）

创建 label（如不存在可 `|| true`）：

```bash
gh label create "priority:p1" --description "High priority" --color "d93f0b" || true
```

## 最终检查（Validation Checklist）

- issue 有清晰的验收标准（checkbox）
- 写明验证方式（测试命令/手工步骤）
- scope 边界明确（In/Out of scope）
- 依赖/风险（如有）已记录

## 错误处理

- `gh` 命令失败：直接贴出 stderr 并停止（不要瞎猜）
- 需求不清：回到“最小输入”提问（每轮 2–3 个问题）
- epic 创建失败：降级为 Simple issue（但保留拆解结论）
