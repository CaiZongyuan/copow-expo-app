# Test Cases: Mobile Agent Tooling Architecture Upgrade

## Overview
- **Feature**: Mobile agent tooling architecture upgrade
- **Requirements Source**: `docs/prd/mobile-agent-tooling-architecture-upgrade.md`
- **Issue**: `#2`
- **Test Coverage**: manifest layering, builder exposure, presentation metadata migration, executor split, schema stability
- **Last Updated**: 2026-03-17

## Test Case Categories

### 1. Functional Tests

#### TC-F-001: Build tool context with safe normalized defaults
- **Requirement**: Story 2 / `buildToolContext(input)`
- **Priority**: High
- **Preconditions**:
  - `buildToolContext` is exported from the tools builder layer
- **Test Steps**:
  1. Call `buildToolContext({})`
  2. Inspect the returned context object
- **Expected Results**:
  - The result includes a valid `platform`
  - `knownCapabilities`, `runtimeAvailability`, and `domainScope` are present with safe defaults
  - Missing inputs do not crash the builder layer

#### TC-F-002: Build chat tools from normalized context
- **Requirement**: Story 2 / `buildChatTools(context)`
- **Priority**: High
- **Preconditions**:
  - Server and mobile manifests are registered
- **Test Steps**:
  1. Build context for `platform: "ios"`
  2. Call `buildChatTools(context)`
  3. Inspect the returned tool record
- **Expected Results**:
  - The result is compatible with AI SDK `tools`
  - Server tools remain available
  - iOS mobile tools are exposed when the context allows them

#### TC-F-003: Registry exposes manifest metadata through a thin facade
- **Requirement**: Story 1 / Story 4
- **Priority**: High
- **Preconditions**:
  - Shared `ToolManifest` types exist
- **Test Steps**:
  1. Import `getToolManifest(...)` and `chatToolDefinitions`
  2. Read manifest metadata for an existing tool such as `get_current_time`
- **Expected Results**:
  - The registry file re-exports data instead of holding the full implementation
  - The manifest includes runtime, domain, approval, schema, and presentation metadata

#### TC-F-004: Chat UI renders tool input and output through manifest presentation metadata
- **Requirement**: Story 4
- **Priority**: High
- **Preconditions**:
  - Chatbot screen renders tool parts
- **Test Steps**:
  1. Render a tool part for `input-available`
  2. Render a tool part for `output-available`
  3. Render a tool part for `approval-requested`
- **Expected Results**:
  - UI uses manifest-owned formatting helpers
  - Chatbot screen does not keep a central per-tool formatter `switch`
  - Fallback formatting exists for tools without custom presentation

#### TC-F-005: Mobile executor layer is split by domain
- **Requirement**: Story 3
- **Priority**: Medium
- **Preconditions**:
  - Domain executor modules exist under `src/features/chat/tools/executors/mobile/`
- **Test Steps**:
  1. Inspect the mobile executor directory
  2. Verify imports from the top-level mobile executor entry
- **Expected Results**:
  - Health, contacts, calendar, location, and external executors live in separate modules
  - Shared helpers are reused instead of duplicating guard logic

### 2. Edge Case Tests

#### TC-E-001: Unknown platform falls back to a conservative tool subset
- **Requirement**: Story 2 edge cases
- **Priority**: High
- **Preconditions**:
  - Builder supports `platform`
- **Test Steps**:
  1. Build context with `platform: "web"` or unknown input
  2. Call `buildChatTools(context)`
- **Expected Results**:
  - Unsupported mobile-only tools are not exposed
  - The builder still returns a usable safe subset instead of crashing

#### TC-E-002: Missing custom formatter uses fallback presentation
- **Requirement**: Story 4 fallback behavior
- **Priority**: Medium
- **Preconditions**:
  - Shared fallback formatters exist
- **Test Steps**:
  1. Read a manifest with no custom formatter override
  2. Render input and output for that tool in the chatbot UI
- **Expected Results**:
  - The UI renders compact fallback text
  - The result is readable and does not expose raw unformatted objects unnecessarily

#### TC-E-003: Public tool schema stays stable after the refactor
- **Requirement**: Story 5
- **Priority**: High
- **Preconditions**:
  - Existing tool names are still exported
- **Test Steps**:
  1. Inspect the tool names in the registry facade
  2. Compare input/output schema fields for the existing tool set
- **Expected Results**:
  - Existing tool names still exist
  - Major required schema fields remain unchanged unless documented

### 3. Error Handling Tests

#### TC-ERR-001: Availability or platform mismatches map to actionable tool errors
- **Requirement**: Story 3 / API `ToolError`
- **Priority**: High
- **Preconditions**:
  - `mapError` exists on manifests or shared helpers
- **Test Steps**:
  1. Trigger a permission/platform error in a mobile executor
  2. Inspect the returned error text or normalized tool error
- **Expected Results**:
  - The user-facing error is actionable
  - Raw native exception details are not leaked directly to the UI

#### TC-ERR-002: Builder handles incomplete context safely
- **Requirement**: Story 2 fallback behavior
- **Priority**: High
- **Preconditions**:
  - `buildToolContext` accepts partial input
- **Test Steps**:
  1. Omit `knownCapabilities` and `runtimeAvailability`
  2. Call `buildToolContext(...)` and `buildChatTools(...)`
- **Expected Results**:
  - No crash occurs
  - The builder response remains conservative and usable

### 4. State Transition Tests

#### TC-ST-001: Approval-requested to approval-responded still renders through shared presentation logic
- **Requirement**: Story 4 / UI approval states
- **Priority**: Medium
- **Preconditions**:
  - Approval-requested and approval-responded tool parts already exist in the chat flow
- **Test Steps**:
  1. Render a confirm-only tool in `approval-requested`
  2. Approve or deny the tool
  3. Render the `approval-responded` state
- **Expected Results**:
  - Approval summary text still renders correctly
  - The state transition does not require per-tool UI branching in the chatbot screen

## Test Coverage Matrix

| Requirement ID | Test Cases | Coverage Status |
|---------------|------------|-----------------|
| Story 1 | TC-F-003 | Complete |
| Story 2 | TC-F-001, TC-F-002, TC-E-001, TC-ERR-002 | Complete |
| Story 3 | TC-F-005, TC-ERR-001 | Complete |
| Story 4 | TC-F-004, TC-E-002, TC-ST-001 | Complete |
| Story 5 | TC-E-003 | Complete |

## Notes
- The repo currently has no dedicated unit-test runner for this area, so this slice validates primarily with `bun run lint` and `npx tsc --noEmit`, plus targeted manual inspection of tool rendering.
- If a dedicated test runner is introduced later, convert the highest-priority cases first: TC-F-001, TC-F-002, TC-F-004, TC-E-001, and TC-ERR-001.
