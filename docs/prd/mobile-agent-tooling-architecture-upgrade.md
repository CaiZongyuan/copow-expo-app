# Product Requirements Document: Mobile Agent Tooling Architecture Upgrade

**Version**: 1.0  
**Date**: 2026-03-17  
**Author**: Codex  
**Quality Score**: 93/100

---

## Executive Summary

本次需求聚焦 [`docs/mobile-agent-tools-plan.md`](../mobile-agent-tools-plan.md) 中的 `Phase 7 - Tooling architecture upgrade`，目标不是新增更多 mobile tools，而是重构现有 chat tools 架构，使其能持续承载更多能力、更多平台差异、更多审批与展示规则，而不继续把复杂度堆进一个扁平 `registry.ts` 和聊天页面中的分支逻辑。

当前实现已经验证了 client-side tools、approval flow、HealthKit/Contacts/Calendar/Location 等能力可行，但工具定义、暴露策略、执行、格式化、错误映射、审批展示仍然分散在 [`src/features/chat/tools/registry.ts`](../../src/features/chat/tools/registry.ts), [`src/features/chat/tools/mobile-executors.ts`](../../src/features/chat/tools/mobile-executors.ts), [`src/app/api/chat+api.ts`](../../src/app/api/chat+api.ts), [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx)。该结构已开始限制扩展速度与正确性。

本次交付应同时完成两件事：一是定义目标分层架构与模块契约，二是把第一阶段可落地切片写成明确、可测试、可直接开发的 acceptance criteria。Phase 6 的 session/persistence/background execution 不在本次范围内。

---

## Problem Statement

**当前情况**:

- tools 元数据、Zod schema、AI SDK tool 构造、部分 server execute 逻辑混在一个集中式 registry 中。
- mobile execution、permission check、platform check、error mapping、approval summary、tool UI formatting 分散在多个文件，知识边界不清。
- chat screen 仍然通过 `switch` 维护 `formatToolInput` / `formatToolOutput` / approval rendering，导致工具行为与工具展示容易漂移。
- server 目前基本暴露一份静态全量工具集，而不是按 platform、capability、task context 做 progressive disclosure。

**拟议方案**:

把当前扁平 registry 重构为一套分层 tools 架构，至少包含：

- capability manifests
- exposure builders
- executors and guards
- formatter / presentation metadata
- registry facade

并继续保持 typed AI SDK tools 作为公开契约，而不是退回到单一 `run(command)` 风格接口。

**业务影响**:

- 降低新增/修改 tool 的改动面，减少把业务知识写死在 chat UI 的风险。
- 为后续 `pick_document`、`pick_image`、app skills、dynamic exposure、domain-scoped sessions 提供稳定基础。
- 提升 tool selection 精度、审批一致性、错误可恢复性与交付可维护性。

---

## Success Metrics

**Primary KPIs:**

- 工具新增/迁移改动面: 新增一个标准 mobile tool 时，常规路径不需要修改 [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx) 或 [`src/app/api/chat+api.ts`](../../src/app/api/chat+api.ts) 的 tool-specific `switch`/硬编码分支。
- 单一事实来源: 每个 tool 的 capability metadata、approval mode、presentation formatter、availability rule 有一个 canonical manifest，避免多处重复定义。
- 动态暴露能力: server 通过 `buildChatTools(context)` 暴露当前最小必要工具集，而不是默认全量暴露。
- 外部契约稳定性: 当前已上线 tool names 与基础 input/output schema 默认保持稳定；如确需调整，必须在实现阶段显式记录迁移理由与影响。

**Validation**:

- 通过 TypeScript 类型约束保证 manifest、builder、executor、formatter 之间的契约一致。
- 通过 implementation 验收验证当前 tool 集在重构后仍可完成现有 read-only 与 confirm-only flows。
- 通过代码审查确认聊天页不再持有 per-tool formatting / approval summary 的中心化 `switch` 逻辑。

---

## User Personas

### Primary: Mobile Agent Platform Engineer

- **Role**: 维护 Expo chat agent 与 native tool 架构的工程师
- **Goals**: 快速新增能力、控制风险、减少跨文件重复修改
- **Pain Points**: 当前 tool 定义、执行、展示、审批逻辑分散；改动容易漏改
- **Technical Level**: Advanced

### Secondary: Product Engineer Adding a New Capability

- **Role**: 为 chat agent 增加新能力的功能开发者
- **Goals**: 按既有模式实现新 tool，而不是重新理解整条链路
- **Pain Points**: 不清楚 metadata 放哪里、formatter 放哪里、什么时候要改 server route 或 chat screen
- **Technical Level**: Intermediate to Advanced

---

## User Stories & Acceptance Criteria

### Story 1: 定义分层 tool manifest

**As a** mobile agent platform engineer  
**I want to** 为每个 tool 建立明确、可扩展的 manifest 契约  
**So that** tool 的能力定义、风险边界、presentation metadata 能从同一来源演进

**Acceptance Criteria:**
- [ ] 现有 `ChatToolDefinition` 被提升为更明确的 manifest 契约，至少覆盖 `runtime`, `domain`, `platforms`, `approvalMode`, `permissions`, `riskLevel`, `whenToUse`, `whenNotToUse`, `availability`, `inputSchema`, `outputSchema`, `inputExamples`, `formatInput`, `formatOutput`, `mapError`。
- [ ] manifest 只描述 tool 是什么以及如何被暴露，不直接承载 chat screen 组件逻辑。
- [ ] server tools 与 mobile tools 至少按独立 manifest module 组织，避免所有定义继续堆在一个文件中。

### Story 2: 引入动态 tool exposure builder

**As a** platform engineer  
**I want to** 根据 platform、capability 与任务上下文构建本轮可用工具集  
**So that** model 只看到最小必要能力边界

**Acceptance Criteria:**
- [ ] 存在明确的 `buildToolContext(...)` 与 `buildChatTools(context)` 设计。
- [ ] builder 至少支持 `platform`, `knownCapabilities`, `domainScope`, `runtimeAvailability` 这些输入。
- [ ] server route 从静态 `chatTools` 导入迁移为通过 builder 获取 tools。
- [ ] builder 支持默认安全回退：当上下文不完整时，仍可返回一个保守但可用的工具子集。

### Story 3: 把执行、守卫、错误映射从 UI 中剥离

**As a** feature engineer  
**I want to** 把 permission/platform/approval/error 规则沉到 executors and guards  
**So that** UI 不再承担执行层知识

**Acceptance Criteria:**
- [ ] mobile execution 逻辑按 domain 或 responsibility 分拆，避免一个不断膨胀的 `mobile-executors.ts` 成为下一轮瓶颈。
- [ ] permission checks、platform checks、availability checks、normalized actionable errors 有可复用 helper 或 guard 层承载。
- [ ] confirm-only client tools 仍保持“审批记录”和“设备执行”分离，但聊天页只负责编排，不再内置每个 tool 的专有业务判断。

### Story 4: 让 presentation metadata 成为 registry-owned contract

**As a** chat UI maintainer  
**I want to** 从 manifest 读取 tool label、approval summary、compact input/output formatter  
**So that** tool 行为和 tool 展示来自同一事实来源

**Acceptance Criteria:**
- [ ] [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx) 不再维护中心化的 per-tool `formatToolInput` / `formatToolOutput` `switch`。
- [ ] approval-requested、approval-responded、output-available 等状态需要的摘要信息可由 manifest metadata 驱动。
- [ ] 当 formatter 缺省时，系统有统一 fallback，而不是让 chat screen 为每个 tool 补洞。

### Story 5: 迁移当前 tool set 而不破坏现有产品能力

**As a** product owner  
**I want to** 在重构期间保住现有已验证能力  
**So that** 架构升级不会引入不必要的产品回退

**Acceptance Criteria:**
- [ ] 当前已存在的 `get_current_time`, `get_recent_sleep`, `get_today_steps`, `search_contacts`, `get_upcoming_events`, `list_writable_calendars`, `create_calendar_event`, `open_external_url`, `get_current_location` 都有明确迁移路径。
- [ ] typed AI SDK tools 继续作为公开接口；不得退化为单一 stringly-typed command tool。
- [ ] 如个别 tool schema 需要调整，必须以安全性、可解释性或一致性为理由，并在实现阶段同步更新文档与测试。

---

## Functional Requirements

### Core Features

**Feature 1: Layered Tool Manifest System**
- Description: 为所有 chat tools 提供统一的 manifest 类型与模块组织。
- User flow: 开发者定义 manifest -> builder 读取 manifest -> runtime 选择暴露 -> UI 使用 presentation metadata -> executor 执行。
- Edge cases: tool 仅在部分 platform 可用；tool 需要 confirm；tool 在当前环境 capability 不可用。
- Error handling: manifest 必须支持 availability 与 mapError，避免 UI 层猜测失败原因。

**Feature 2: Tool Exposure Builder**
- Description: 根据上下文裁剪实际暴露给 model 的工具集合。
- User flow: server route 构建 context -> 调用 `buildChatTools(context)` -> 返回最小必要工具集。
- Edge cases: 未知 platform、权限未知、domain scope 未指定、开发模式需要全量暴露。
- Error handling: builder 在上下文缺失时回退到保守子集，而不是崩溃或无条件全量暴露。

**Feature 3: Executors and Guards Layer**
- Description: 把 native execution 与 guard/normalization 职责显式下沉。
- User flow: on-device tool call -> guard 检查 -> executor 执行 -> normalize success/error -> addToolOutput。
- Edge cases: permission denied、platform unsupported、native API unavailable、fallback URL 失败。
- Error handling: 对 model 和 UI 返回可行动错误，而不是原生异常原文。

**Feature 4: Registry-owned Presentation Metadata**
- Description: tool-specific 展示逻辑从 chat screen 迁回 registry/manifests。
- User flow: UI 读取 manifest presentation metadata -> 渲染 compact summary / approval body / fallback debug text。
- Edge cases: formatter 缺失、tool output 为部分字段、approval state 没有额外 reason。
- Error handling: 统一 fallback formatter，避免渲染空白或直接输出不可读对象。

### Out of Scope

- Phase 6 的 session orchestration、background execution、task persistence。
- 本次不强制引入全新的用户可见 tool 能力，只关注架构升级与现有能力迁移。
- 本次不要求完成 app skills registry 的实现细节，只要求新的 tools architecture 能为其预留 resolver / capability knowledge 挂载点。
- 不把产品接口改造成单一 `run(command)` 或任意字符串执行模型。

---

## Technical Constraints

### Performance

- `buildChatTools(context)` 应为轻量同步或可预测开销的构建步骤，不能显著增加每轮 chat request 的启动成本。
- formatter 与 availability 逻辑应避免在 render path 中做昂贵操作。

### Security

- confirm-only tools 的审批门禁必须继续存在，且审批与执行职责仍保持分离。
- manifest / builder 不得绕过 platform、permission、unsafe URL scheme 等既有安全边界。
- 外部 app handoff 仍需遵守当前 `open_external_url` 的 scheme validation 与后续 allowlist 扩展方向。

### Integration

- **AI SDK**: 继续使用 typed AI SDK tools 作为 model-facing contract。
- **Expo native modules**: 需要兼容 HealthKit、Contacts、Calendar、Location、Linking 等当前 execution 入口。
- **expo-router chat screen**: 现有 [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx) 需要迁移为消费 registry metadata，而不是继续内置 tool 知识。
- **API route**: 现有 [`src/app/api/chat+api.ts`](../../src/app/api/chat+api.ts) 需要改为从 builder 获取 tool 子集。

### Technology Stack

- Expo SDK 55, React 19, React Native 0.83, TypeScript。
- `ai` / `@ai-sdk/react` / OpenAI-compatible provider 模式保持不变。
- 当前项目仍是 foreground chat stream 模式，本次不改变其 session model。

---

## MVP Scope & Phasing

### Phase 1: MVP (Required for Initial Launch)

- 抽出共享 tool types 与 manifest contract
- 形成 `manifests / builders / executors / formatters or presentation / guards` 的最小目录骨架
- 为当前现有 tool set 完成迁移设计
- 定义并接入 `buildChatTools(context)`
- 把 tool-specific input/output formatting 与 approval summary 从 chat screen 中移出
- 提供统一 fallback formatter 与 error mapper

**MVP Definition**: 当前已存在工具能力在不回退产品行为的前提下，完成从扁平 registry 到分层 tools architecture 的第一阶段迁移，并让后续新增 tool 不再依赖修改聊天页的硬编码逻辑。

### Phase 2: Enhancements (Post-Launch)

- 为 app skills / resolver layer 提供更正式的 capability knowledge 挂接方式
- 根据 permission state 或 task goal 做更细粒度的 exposure builder 策略
- 进一步按 domain 拆分 mobile executors 与 guards

### Future Considerations

- session-aware tool exposure
- persisted approvals / resumable execution
- domain-level capability packs beyond raw tools

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| 迁移过程中现有 tool 行为回退 | Med | High | 保持 public tool names/schema 稳定，逐步迁移并记录对照表 |
| 过度设计导致第一阶段落不下去 | Med | High | 先定义最小分层 contract，只要求支撑当前工具集与下一批工具 |
| builder 规则过早复杂化 | Med | Med | Phase 1 只支持 platform/capability/domainScope 的核心维度 |
| formatter 下沉后 UI 调试可见性下降 | Low | Med | 保留统一 debug fallback 文本与原始 payload 可选输出 |
| guard/error mapper 分散再次形成新耦合 | Med | Med | 按 domain 组织，并定义统一 error/result shape |

---

## Dependencies & Blockers

**Dependencies:**
- [`docs/mobile-agent-tools-plan.md`](../mobile-agent-tools-plan.md): 本次重构范围与架构方向的 source of truth
- [`docs/mobile-agent-app-skills-registry-plan.md`](../mobile-agent-app-skills-registry-plan.md): 后续 resolver / app capability layer 的衔接方向
- 当前实现文件: [`src/features/chat/tools/registry.ts`](../../src/features/chat/tools/registry.ts), [`src/features/chat/tools/mobile-executors.ts`](../../src/features/chat/tools/mobile-executors.ts), [`src/app/api/chat+api.ts`](../../src/app/api/chat+api.ts), [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx)

**Known Blockers:**
- 当前聊天流仍为 foreground stream，无法在本次设计中顺带解决 session / persistence 问题。
- 现有 UI 与 execution 层已形成若干隐式耦合，迁移时需要显式梳理，不适合一次性大爆炸改写。

---

## Appendix

### Glossary

- **Manifest**: 单个 tool 的 canonical capability definition。
- **Exposure Builder**: 根据上下文裁剪本轮暴露给 model 的工具集合。
- **Guard**: 在 execution 前处理 platform、permission、availability、approval 等安全与可用性检查。
- **Presentation Metadata**: 用于渲染 tool 输入、输出、approval summary 的展示层元数据。

### References

- [`docs/mobile-agent-tools-plan.md`](../mobile-agent-tools-plan.md)
- [`docs/mobile-agent-app-skills-registry-plan.md`](../mobile-agent-app-skills-registry-plan.md)
- [`src/features/chat/tools/registry.ts`](../../src/features/chat/tools/registry.ts)
- [`src/features/chat/tools/mobile-executors.ts`](../../src/features/chat/tools/mobile-executors.ts)
- [`src/app/api/chat+api.ts`](../../src/app/api/chat+api.ts)
- [`src/app/(tabs)/chatbot/index.tsx`](../../src/app/(tabs)/chatbot/index.tsx)

---

*This PRD captures the delivery contract for the mobile agent tooling architecture upgrade and is intended to be used as the implementation baseline for the next development slice.*
