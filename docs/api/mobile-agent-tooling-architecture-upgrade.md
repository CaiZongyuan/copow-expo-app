# API Specification: Mobile Agent Tooling Architecture Upgrade

**Version**: 1.0  
**Date**: 2026-03-17  
**Source PRD**: `docs/prd/mobile-agent-tooling-architecture-upgrade.md`

## Overview
- **Auth**: None
- **Base URL**: N/A, this document defines internal TypeScript module contracts rather than external HTTP endpoints
- **Error Format**: Normalized tool errors with user/actionable messages, not raw native exceptions

## Conventions
- **Idempotency**: Read-only tools should remain idempotent at the logical level; confirm-only action tools still require explicit approval before execution
- **Pagination**: Not applicable for this phase
- **Rate Limit**: Not applicable for this phase
- **Public Contract Stability**: Existing tool names and their core input/output schema should remain stable by default

## Module Contracts

### `ToolManifest`
- **Purpose**: Canonical contract for one chat tool capability
- **Permission**: Internal only
- **Shape**
  - Identity: `name`, `label`, `description`
  - Scope: `runtime`, `domain`, `platforms`, `permissions`, `riskLevel`
  - Behavior guidance: `whenToUse`, `whenNotToUse`, `requiresFollowUp`
  - Availability: `availability(context) => ToolAvailability`
  - Schemas: `inputSchema`, `outputSchema`, `inputExamples`
  - Execution binding: `executorKey` or `execute`
  - Presentation: `formatInput`, `formatOutput`, `formatApproval`, `formatError`
  - Safety: `approvalMode`, `mapError`
- **Edge Cases**
  - A tool may be declared but unavailable in the current platform or capability state
  - A tool may omit custom formatters and fall back to shared defaults

### `ToolContext`
- **Purpose**: Context object used by builders, availability checks, and future resolver hooks
- **Permission**: Internal only
- **Request**
  - `platform`: `"ios" | "android" | "web"`
  - `knownCapabilities`: feature flags such as HealthKit available, calendar configured, external linking enabled
  - `domainScope`: optional requested domain subset such as `health`, `calendar`, `external`
  - `sessionHints`: optional task hints for progressive disclosure
  - `debug`: optional flag to widen exposure for development
- **Response**
  - A normalized object with safe defaults for missing fields
- **Edge Cases**
  - Unknown platform should degrade to a conservative tool subset
  - Missing capability data should not expose unsupported tools by default

### `buildToolContext(input)`
- **Purpose**: Normalize raw runtime state into a safe `ToolContext`
- **Permission**: Internal only
- **Request**
  - Partial runtime information from client or server
- **Response**
  - Normalized `ToolContext`
- **4xx/5xx**
  - No external HTTP errors; invalid local input should throw typed configuration errors during development
- **Edge Cases**
  - Absent platform or capabilities fall back to conservative defaults

### `buildChatTools(context)`
- **Purpose**: Produce the actual AI SDK tools exposed for one request
- **Permission**: Internal only
- **Request**
  - Normalized `ToolContext`
- **Response**
  - `Record<string, Tool>` compatible with AI SDK `streamText({ tools })`
- **Edge Cases**
  - If no domain scope is provided, builder may return the default safe subset
  - If `debug` is enabled, builder may include a broader catalog for local development

### `getToolManifest(name)`
- **Purpose**: Retrieve manifest metadata for UI rendering, approval flow, and debug inspection
- **Permission**: Internal only
- **Request**
  - `name: ChatToolName`
- **Response**
  - `ToolManifest | undefined`
- **Edge Cases**
  - Unknown names should return `undefined`, not crash the renderer

### `executeMobileTool(name, input, context?)`
- **Purpose**: Run a mobile tool on-device through domain executors and guards
- **Permission**: Internal only
- **Request**
  - `name: MobileToolName`
  - `input`: validated tool input
  - `context`: optional runtime state for availability and guard checks
- **Response**
  - Normalized tool output matching the manifest `outputSchema`
- **4xx/5xx**
  - Permission denied
  - Platform unsupported
  - Native API unavailable
  - Invalid or unsafe input
- **Edge Cases**
  - Confirm-only tools are still executed only after approval has already been recorded elsewhere
  - Fallback execution such as `open_external_url` may return which URL actually opened

## Suggested File-Level API Boundaries

### `src/features/chat/tools/types.ts`
- Shared types for `ToolManifest`, `ToolContext`, `ToolAvailability`, `ToolPresentation`, `ToolError`

### `src/features/chat/tools/manifests/server.ts`
- Server tool manifests and server-side execution bindings

### `src/features/chat/tools/manifests/mobile.ts`
- Mobile tool manifests referencing domain executors and guards

### `src/features/chat/tools/builders/build-tool-context.ts`
- Runtime context normalization and safe defaults

### `src/features/chat/tools/builders/build-chat-tools.ts`
- AI SDK tool exposure builder

### `src/features/chat/tools/executors/mobile/*`
- Domain-level native execution modules such as health, contacts, calendar, location, external

### `src/features/chat/tools/guards/*`
- Reusable permission, platform, availability, and risk checks

### `src/features/chat/tools/registry.ts`
- Thin facade only; re-export stable public helpers rather than remaining the main definition bucket

## Data Models

### `ToolAvailability`
```ts
type ToolAvailability =
  | { available: true }
  | {
      available: false;
      reason:
        | "unsupported_platform"
        | "permission_missing"
        | "capability_unavailable"
        | "disabled_by_scope";
      message: string;
    };
```

### `ToolError`
```ts
type ToolError = {
  code:
    | "permission_denied"
    | "unsupported_platform"
    | "capability_unavailable"
    | "validation_failed"
    | "execution_failed";
  message: string;
  retryable: boolean;
  suggestedAction?: string;
};
```

### `ToolPresentation`
```ts
type ToolPresentation<TInput = unknown, TOutput = unknown> = {
  formatInput?: (input: TInput) => string;
  formatOutput?: (output: TOutput) => string;
  formatApproval?: (input: TInput) => string;
  formatError?: (error: ToolError) => string;
};
```

## Non-Functional
- Builder and manifest lookup should be lightweight enough for each chat roundtrip.
- Module boundaries should make it possible to add a new tool without editing unrelated UI files.
- Presentation and execution contracts should remain separately testable.
- The design must keep room for future resolver-backed app skills without forcing a second full rewrite.
