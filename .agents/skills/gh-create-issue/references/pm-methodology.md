# PM Task Breakdown（Issue 拆解方法）

## 拆解目标

把一个 feature 拆成“可独立交付、可验证、可并行”的 issue 切片，避免一个 issue 包含太多不确定性。

## 切片维度（优先顺序）

1. **按验收标准切**：一条 acceptance criteria ≈ 一个小任务/子任务
2. **按接口切**：一个 endpoint + 对应测试 + 文档更新
3. **按用户路径切**：登录→创建→查看→编辑→删除等关键流
4. **按风险切**：先做高风险/不确定性最大的 spike（可单独 issue）

## 每个 Issue 的最小完备信息（DoR）

- Problem Statement（谁痛、为什么痛）
- Scope（做什么/不做什么）
- Acceptance Criteria（可测试）
- 测试命令/验证方式（能跑起来）
- 影响范围（模块/目录/接口）
- 风险与依赖（外部系统/权限/数据迁移）

## Done Definition（DoD）

- 验收标准全部满足
- 自动化测试覆盖关键路径与错误分支
- 文档更新：PRD/API/UI 至少不矛盾
- CI 绿、无阻塞 review 结论

