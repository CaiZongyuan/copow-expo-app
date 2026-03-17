---
name: worktree
description: git worktree 并行开发。一条 issue 一个 worktree 一个 agent 会话，实现多任务并行且互不干扰。触发于 `/worktree` 或用户要求并行开发、创建隔离工作目录。
---

# git worktree 并行开发

> Source of Truth：`AGENTS.md`。本 skill 补充 worktree 的实践细节；流程约束以 `AGENTS.md` 为准。

## 概述

Git worktree 允许在同一仓库创建多个独立工作目录（各自分支），并行推进多个任务，避免"依赖/端口/清理命令"互相误伤。

**两种使用场景**：
1. **Codex App**：自动在 `$CODEX_HOME/worktrees` 创建 worktree
2. **Codex CLI**：手动创建 worktree 实现多终端并行

## 何时使用

- 需要同时开发多个独立功能/issue
- 一个任务的改动可能破坏另一个任务的环境
- 想要并行跑多个 Codex 会话
- 需要隔离测试不同版本

---

## Codex App Worktree

### 创建 Worktree

1. 在新线程视图，选择 **Worktree**
2. 选择起始分支（main / feature / 当前分支含未提交改动）
3. 提交任务，Codex 自动创建 worktree

> Codex 在 `$CODEX_HOME/worktrees` 创建 worktree，默认处于 detached HEAD 状态。

### 两种工作流

#### Option 1：在 Worktree 上工作

适合可以在 worktree 上直接验证的场景（依赖和工具已安装）：

1. 使用 **Create branch here** 创建分支
2. 提交改动、推送分支、创建 PR
3. 可用 "Open" 按钮打开 IDE
4. 完成后 archive 线程，worktree 可被清理

#### Option 2：同步到 Local Checkout

适合需要在主目录验证的场景（如只能跑一个应用实例）：

1. 点击 **Sync with local**
2. 选择创建新分支或同步到已有分支
3. 同步方式：
   - **Overwrite**：使目标匹配源（覆盖历史）
   - **Apply**：应用 patch（保留目标历史）

> 可以创建多个 worktree 同步到同一 feature branch。

### Worktree 管理

| 条件 | 行为 |
|------|------|
| 线程被 pin | 永不清理 |
| 添加到 sidebar | 永不清理 |
| >4 天 且 >10 个 worktree | archive 线程时自动清理 |

清理前会保存快照，可随时恢复。

---

## Codex CLI Worktree

### TL;DR

```bash
# 0) 预检
git status --short
git fetch origin --prune

# 1) 创建 worktree
ISSUE=123
git worktree add -b "issue-$ISSUE" "../wt-issue-$ISSUE" origin/main

# 2) 进入并安装依赖
cd "../wt-issue-$ISSUE"
npm install  # 或 bun i / uv sync / poetry install

# 3) 启动 Codex
codex
```

### 验证

```bash
git worktree list
```

### 推荐约定

| 项目 | 约定 |
|------|------|
| 目录位置 | 兄弟目录，如 `../wt-issue-123`（不要嵌套） |
| 分支命名 | `issue-123` / `feature/auth` / `fix/issue-456` |
| 目录命名 | 与分支对应，如 `../wt-issue-123` |

### 提交与推送

```bash
git add -A
git commit -m "feat: implement issue #123"
git push -u origin issue-123
```

### 清理（合并后）

```bash
# 回到主目录
cd /path/to/repo

# 1) 删除 worktree
git worktree remove ../wt-issue-123

# 2) 删除本地分支
git branch -d issue-123
```

手动删目录后执行：

```bash
git worktree prune
```

---

## 常见问题

### 端口冲突

两个 worktree 跑同一服务时：

```bash
# Terminal 1
PORT=3000 npm run dev

# Terminal 2
PORT=3001 npm run dev
```

### 分支检出限制

**错误**：`fatal: 'feature/a' is already used by worktree at '...'`

**原因**：Git 限制同一分支只能在一个 worktree 检出，避免 race condition。

**解决**：
- 在 worktree 上切到其他分支
- 或使用 "Sync with local" 工作流

### 常见报错

| 错误 | 解决方案 |
|------|----------|
| `'<path>' already exists` | 换路径或确认目录可删 |
| `not a valid object name: origin/main` | 先 `git fetch origin` |
| `git worktree remove` 失败 | 先提交/stash，或用 `--force` |
| `Cannot delete branch ... checked out at ...` | 先删除 worktree 再删分支 |

### 变基/冲突

```bash
git fetch origin --prune
git rebase origin/main

# 冲突后
git add <files>
git rebase --continue
```

**经验法则**：冲突多说明改动高度重叠，考虑串行或先合并一个 PR。

---

## 与 Multi-agent 结合

| 场景 | 建议 |
|------|------|
| 多 agent 并行 | 每个 agent 一个 worktree |
| 共享进度 | 使用同一个 `HARNESS_STATE_ROOT` |
| Harness 联动 | 见 `.agents/skills/harness/SKILL.md` |

---

## FAQ

**Q: `.codex/` 配置是共享的吗？**

如果在 Git 跟踪，所有 worktree 共享；如果在 `.gitignore`，各自独立。

**Q: 可以嵌套创建 worktree 吗？**

不可以。目标目录不能在现有 worktree 内部。

**Q: 为什么每个 worktree 要单独装依赖？**

`git worktree` 共享 Git 对象库，但不共享 `node_modules/`、虚拟环境等。

---

## 参考链接

- [OpenAI Codex Worktrees 官方文档](https://developers.openai.com/codex/app/worktrees/)
