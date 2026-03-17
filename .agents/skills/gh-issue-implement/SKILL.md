---
name: gh-issue-implement
description: 用于实现 GitHub issue：拉取 issue 详情→对齐交付物（PRD/API/UI、测试用例）→按验收标准做 TDD→（可选）创建 PR，并在 issue 中持续同步进度。
---

# GitHub Issue Implementation

Implement GitHub issues with full development lifecycle from issue analysis to PR creation.

## Purpose

Drive the complete issue-to-PR workflow: fetch issue details, analyze requirements, align deliverables, implement via TDD, track progress, and (optionally) create a pull request that closes the issue.

## When to Use

Trigger this skill when:
- User provides an issue number to implement (e.g., "implement issue #123")
- User requests "work on issue [number]"
- User asks to "develop" or "fix" a specific GitHub issue
- User mentions "implement gh issue" or similar phrases

## Workflow

### Phase 0: Harness & 语言约定（必做）

> 目标：确保每次实现都可续作、可追踪，并且与 GitHub issue/PR 联动。

1) **绑定 Harness（推荐但默认执行）**
- 若缺少状态文件：`python3 .agents/skills/harness/bin/harness.py --root . init`
- 为该 issue 建/认领一个 `harness-tasks.json` 里的任务（标题包含 issue #N），并在 `harness-progress.txt` 记录 issue/PR 编号与关键决策
- 只有在 `gh auth status` 不可用或用户明确要求本次不走 GitHub 时，才允许退化为本地-only

2) **语言约定（默认中文）**
- issue/PR/评论/进度更新默认中文叙述
- 代码、命令行、字段名、关键技术词（TDD/PRD/API/CI/worktree 等）保留英文

### Phase 1: Issue Analysis

1. **Fetch Issue Details:**
   ```bash
   gh issue view $ISSUE_NUMBER --json title,body,labels,comments,assignees
   ```

2. **Parse Requirements:**
   - Extract problem statement from issue body
   - Identify acceptance criteria (look for checkbox lists)
   - Note technical constraints from "Technical Notes" section
   - Review comments for clarifications or updates
   - Check labels for priority and type information

3. **Codebase Exploration:**
   - Identify affected files and components
   - Understand existing patterns and architecture
   - Locate relevant tests and documentation
   - 搜索相关代码与测试（例如 `rg`/文件树/README）

4. **Derive Task List:**
   - Break down acceptance criteria into concrete tasks
   - Identify files that need modification
   - Plan test coverage requirements
   - Note any dependencies or blockers

### Phase 2: Clarification (if needed)

通过普通对话向用户澄清，当出现以下情况：
- Requirements are ambiguous or incomplete
- Multiple valid implementation approaches exist
- Scope boundaries are unclear
- Testing strategy needs confirmation

Present lean implementation options with trade-offs when choices exist. Confirm approach before proceeding to development.

### Phase 3: Development

将实现流程与本仓库的 skills 串起来（推荐）：

1. **确认交付物是否齐全**  
   - 若 issue 缺少明确需求：先用 `product-requirements` 产出/更新 `docs/prd/*`、`docs/api/*`、`docs/ui/*`
   - 若缺少测试视角：用 `test-cases` 产出 `tests/*-test-cases.md`
2. **按验收标准做 TDD**  
   - 以 acceptance criteria / endpoint / user story 为粒度，循环使用 `tdd`（Red/Green/Refactor）
   - 每轮都运行 issue 指定的测试命令（或项目默认测试命令）
3. **完成后收敛**  
   - 若项目有覆盖率门槛：补齐关键路径与错误分支
   - 更新文档（API/UI/README）保证可交付

### Phase 4: Progress Updates

After each significant milestone（默认中文）:
```bash
gh issue comment $ISSUE_NUMBER --body "$(cat <<'EOF'
✅ 进度更新

- 已完成：<里程碑/验收标准>
- 变更摘要：<1-3 条>
- 验证：`<test_command>`（PASS/FAIL）
- 下一步：<下一步>

EOF
)"
```

Update frequency:
- After completing each acceptance criterion
- When encountering blockers or issues
- Before creating the PR

### Phase 5: PR Creation

1. **Verify Completion:**
   - All acceptance criteria met
   - Tests passing（覆盖率门槛以项目实际配置为准）
   - Code follows project conventions
   - No outstanding blockers

2. **Create Branch (if not already on one):**
   ```bash
   git checkout -b issue-$ISSUE_NUMBER
   ```

> 本模板默认 Auto Git：通过测试后自动 `commit`/`push`/创建 PR，并尝试开启 auto-merge（若仓库策略允许）。永不使用 `--force`，且不会直接 push 到受保护分支（由 `.githooks/pre-push` 拦截）。

3. **Commit Changes:**
   ```bash
   git add -A
   git commit -m "feat: implement issue #$ISSUE_NUMBER

   [Brief description of changes]

   Closes #$ISSUE_NUMBER"
   ```

4. **Push and Create PR:**
   ```bash
   git push -u origin issue-$ISSUE_NUMBER

   gh pr create \
     --title "Fix #$ISSUE_NUMBER: [Issue title]" \
     --body "$(cat <<'EOF'
   ## 摘要
   实现 #$ISSUE_NUMBER。

   ## 变更
   - [关键变更 1]
   - [关键变更 2]

   ## 测试
   - Test: `<test_command>`
   - 结果：PASS/FAIL（如 FAIL，贴关键失败点）

   ## 关闭
   Closes #$ISSUE_NUMBER
   EOF
   )"
   ```

5. **Enable Auto-merge (if supported):**
   ```bash
   gh pr merge --auto --squash --delete-branch
   ```

6. **Return PR URL:**
   Display the created PR URL, merge status (merged/auto-merge enabled/blocked), and summary of changes.

### Phase 6: Error Handling

**If Issue Fetch Fails:**
- Verify issue number is correct
- Check repository access permissions
- Surface gh CLI error message

**If Development Blocked:**
- Post comment on issue explaining blocker
- Ask user for guidance or clarification
- Document blocker in PR description if proceeding

**If PR Creation Fails:**
- Check for merge conflicts
- Verify branch is up to date with base
- Ensure all changes are committed
- Surface error message and suggest resolution

## Integration with Workflow

历史版本会把实现委托给一个 `/dev` 编排器（本模板已移除该别名）。为了适配 Codex（并与本模板的 PRD→TestCases→TDD→Issue→PR→Review 流程对齐），建议直接用 `product-requirements` / `test-cases` / `tdd` 来驱动实现；本 skill 仅负责 GitHub issue→分支→PR 的流水线管理。

## Best Practices

**Issue Comments:**
- Keep updates concise and actionable
- Use checkboxes to show progress
- Tag relevant stakeholders when needed
- Document any deviations from original plan

**PR Description:**
- Link to issue with "Closes #N" syntax
- Summarize key changes clearly
- Include testing approach and coverage
- Note any breaking changes or migrations

**Branch Naming:**
- Use `issue-N` or `fix-N` format
- Keep branch names short and descriptive
- Delete branch after PR merge

## Example Usage

```
User: "Implement issue #42"

Skill Actions:
1. Fetch issue #42 details
2. Parse: "Add user authentication with JWT"
3. Explore codebase for auth patterns
4. 对齐交付物（PRD/API/UI、测试用例），按验收标准做 TDD
5. Post progress updates to issue
6. Create PR linking to issue #42
```
