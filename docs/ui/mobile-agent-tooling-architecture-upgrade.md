# UI Specification: Mobile Agent Tooling Architecture Upgrade

**Version**: 1.0  
**Date**: 2026-03-17  
**Source PRD**: `docs/prd/mobile-agent-tooling-architecture-upgrade.md`

## Pages / Routes
- **`/(tabs)/chatbot`**: 现有聊天页，继续作为 tool call、approval、tool result 的主要展示入口；本次不新增独立 route。

## Page Details

### `/(tabs)/chatbot`
- **Primary Actions**:
  - 发送自然语言消息
  - 查看 tool input / output / error / approval 状态
  - 对 confirm-only tools 执行 Approve / Deny
- **UI States**: loading / tool input streaming / approval requested / approval responded / tool output success / tool output error / normal assistant message
- **Form Validation**:
  - 用户输入框维持当前聊天输入规则
  - tool approval 操作只对当前 pending tool call 生效
- **Accessibility**:
  - approval actions 需要明确可读标签
  - tool state 文本在视觉上应清晰区分信息性结果与危险性操作
  - 不能只依赖颜色表达 approve / deny / error
- **Analytics**:
  - 本次不新增埋点要求

## UI Requirements

### Tool Card Rendering
- tool 卡片继续显示 label、状态摘要、可选操作按钮。
- label、input summary、output summary、approval body、error summary 由 manifest presentation metadata 提供，而不是由聊天页硬编码 `switch` 维护。
- 当 manifest 未定义专用 formatter 时，UI 使用统一 fallback 文本格式。

### Approval Experience
- confirm-only tools 必须继续在聊天页中展示明确审批卡片。
- approval card 至少展示：
  - tool label
  - concise action summary
  - risk cue such as leaving app / writing to calendar / opening external app
- 用户点击 `Approve` 后，UI 先记录 approval response，再等待设备执行结果。
- 用户点击 `Deny` 后，UI 立即把 denial 作为对话状态反馈给模型。

### Output Experience
- read-only tools 输出优先展示 compact human-readable summary，而不是原始 JSON。
- action tools 输出优先展示结果确认摘要，例如已创建事件、已打开外部链接、实际打开的 URL 等。
- 若 tool output 包含调试信息，默认不在主视觉中大量展开，除非需要 fallback 展示。

### Error Experience
- tool 执行错误优先展示可行动文案，例如 permission denied、unsupported platform、calendar unavailable，而不是底层异常堆栈。
- 对于 unsupported 或 unavailable 状态，UI 应保留足够信息让 assistant 可以继续给出 fallback 建议。

## Components (Reusable)

- **`ToolPartCard`**
  - Props: `toolName`, `state`, `input`, `output`, `error`, `approval`
  - Responsibility: 统一渲染一个 tool part 的外观骨架

- **`ToolStateBody`**
  - Props: `manifest`, `part`
  - Responsibility: 基于 manifest presentation metadata 渲染当前状态摘要

- **`ToolApprovalActions`**
  - Props: `toolCallId`, `toolName`, `input`
  - Responsibility: 渲染 Approve / Deny，并触发当前既有 approval flow

> 以上名称是推荐目标，不强制要求实现时完全同名；关键是聊天页不再持有大段 per-tool 业务分支。

## Copywriting

- 审批提示文案应明确说出动作，例如：
  - `Approval required before opening the external app.`
  - `Approval required before creating the calendar event.`
- permission 错误文案应明确缺什么：
  - `Calendar permission was not granted.`
  - `HealthKit is only available on iOS devices.`
- fallback 文案应短、可扫描、适合聊天流，不展示过长原始 payload。

---

## UI/UX Prototype

本次不要求单独的 HTML prototype。现有聊天页面已足以承载本阶段 UI 变更，重点是：

1. 去掉聊天页中的 per-tool formatter `switch`
2. 保留清晰的 tool card 与 approval card 结构
3. 让新增 tool 在不修改聊天页专有分支的情况下也能获得一致展示
