---
name: multi-agent
description: Codex Multi-agent 并行协作。把任务拆给多个专业 agent 并行执行，降低同一上下文自我放宽的风险。触发于 `/multi-agent` 或用户要求分角色协作、并行探索、批量任务。
---

# Multi-agent 并行协作

> Source of Truth：`AGENTS.md`。本 skill 补充 multi-agent 的配置与实践；流程约束以 `AGENTS.md` 为准。

## 概述

Codex 可以通过生成多个专业 agent 并行工作，然后收集结果到单一响应。适合：
- 高度并行的复杂任务（如代码库探索）
- 多步骤功能计划实现
- 需要"分角色"避免自我放宽的场景

> ⚠️ Multi-agent 是**实验性功能**，需要显式启用。

## 启用方式

### CLI 启用

```
/experimental
```

启用 **Multi-agents**，然后重启 Codex。

### 配置文件启用

在 `~/.codex/config.toml` 或项目 `.codex/config.toml`：

```toml
[features]
multi_agent = true
```

## 内置角色

Codex 内置以下角色：

| 角色 | 用途 |
|------|------|
| `default` | 通用回退角色 |
| `worker` | 执行导向，用于实现和修复 |
| `explorer` | 只读代码库探索 |
| `monitor` | 长时间运行命令/任务监控（优化等待/轮询） |

你可以用同名自定义角色覆盖内置角色。

## 配置结构

### 主配置（`.codex/config.toml`）

```toml
[features]
multi_agent = true

[agents]
max_threads = 6           # 并发 agent 线程上限（默认 6）
max_depth = 1             # agent 嵌套深度（默认 1）
job_max_runtime_seconds = 1800  # CSV 任务默认超时

# 自定义角色
[agents.po]
description = "只负责需求澄清与产出 docs/prd、docs/api、docs/ui；不写实现代码。"
config_file = "agents/po.toml"

[agents.qa]
description = "只负责测试策略与测试用例/测试代码（Red）；不写业务实现。"
config_file = "agents/qa.toml"

[agents.implementer]
description = "只按既定 PRD/API 与测试去实现最小代码；不改测试语义/验收口径。"
config_file = "agents/implementer.toml"

[agents.reviewer]
description = "只做代码审查与风险评估；不直接改代码，只输出问题清单与建议。"
config_file = "agents/reviewer.toml"
```

### 角色配置文件（`agents/*.toml`）

```toml
model = "gpt-5.2"
model_reasoning_effort = "high"
sandbox_mode = "read-only"  # 或 "workspace-write"

developer_instructions = """
你是 reviewer 角色：

- 只做代码审查，输出问题清单与建议。
- 优先关注：correctness / security / test gaps。
- 不要直接修改代码。
"""
```

**可覆盖的设置**：
- `model` 和 `model_reasoning_effort`：为角色选择特定模型
- `sandbox_mode`：标记为 `read-only`
- `developer_instructions`：给角色额外指令

## 使用示例

### 示例 1：PR Review 并行检查

```
Review this branch against main. Spawn one agent per point, wait for all of them, and summarize the result:

1. Security issues
2. Code quality
3. Bugs
4. Race conditions
5. Test flakiness
6. Maintainability
```

### 示例 2：分角色开发

```
Have explorer map the affected code paths, reviewer find real risks, and implementer fix the critical issues.
```

## CSV 批量任务（spawn_agents_on_csv）

当有很多相似任务时，用 CSV 批量分发：

```
Create /tmp/components.csv with columns path,owner and one row per frontend component.

Then call spawn_agents_on_csv with:
- csv_path: /tmp/components.csv
- id_column: path
- instruction: "Review {path} owned by {owner}. Return JSON with keys path, risk, summary."
- output_csv_path: /tmp/components-review.csv
```

每个 worker 必须调用 `report_agent_job_result` 一次。

## CLI 操作

| 命令 | 用途 |
|------|------|
| `/agent` | 切换活动 agent 线程，检查进行中的线程 |
| `/experimental` | 启用实验功能 |

## 注意事项

1. **子 agent 继承父 agent 的 sandbox 策略**：运行时覆盖会传递给子 agent
2. **批准请求**：非活动线程的批准请求会在 CLI 中显示
3. **非交互模式**：需要新批准的操作会失败并返回错误
4. **配置文件验证**：`config_file` 必须指向存在的文件，否则 spawn 会失败

## 与 Worktree 结合

多 agent 并行时建议结合 `git worktree`：

- 一条 issue / 一个 worktree / 一个 agent 会话
- 多 agent 并行时共享同一个 `HARNESS_STATE_ROOT`

详见：`.agents/skills/worktree/SKILL.md`

## 参考链接

- [OpenAI Codex Multi-agent 官方文档](https://developers.openai.com/codex/multi-agent)
