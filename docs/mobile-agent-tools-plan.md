# Mobile Agent Tools Plan

## Background

The goal is to let the in-app chat agent invoke real mobile capabilities when users ask for them, such as reading recent sleep data, checking steps, searching contacts, reading calendar events, or using device location.

The current chat flow already supports model tool calling, but only with server-side demo tools.

## Current State

- Chat requests are sent from `src/app/(tabs)/chatbot/index.tsx` using `useChat` and `DefaultChatTransport`.
- The API route `src/app/api/chat+api.ts` uses `streamText` and defines only two server-executed tools: `weather` and `convertFahrenheitToCelsius`.
- `src/features/chat/tools/registry.ts` is currently a flat, centralized catalog that mixes tool metadata, model-facing descriptions, Zod schemas, approval policy, and some server execution logic in one file.
- Tool execution knowledge is split across multiple places: `registry.ts` defines the catalog, `mobile-executors.ts` runs client tools, and `src/app/(tabs)/chatbot/index.tsx` contains separate input/output formatting and approval rendering rules.
- The server currently exposes one mostly static tool catalog rather than selecting a smaller toolset based on platform, permission state, session goal, or app capability context.
- Installed mobile capability packages already cover several valuable tool domains:
  - HealthKit via `@kingstinct/react-native-healthkit`
  - Contacts via `expo-contacts`
  - Calendar via `expo-calendar`
  - Location via `expo-location`
  - Files and pickers via `expo-file-system`, `expo-document-picker`, `expo-image-picker`
  - Device/runtime info via `expo-device`, `expo-constants`, `expo-network`
- Native permission/plugin setup already exists in `app.json` for HealthKit, contacts, calendar, location, and maps.
- The current chat execution model is foreground-bound streaming via `useChat` + `DefaultChatTransport`; when the app moves to background, the active stream can be interrupted by mobile OS lifecycle/network suspension.

## Key Architectural Decision

Mobile capabilities must not be implemented purely as server-side tools.

Recommended split:

- **Server tools**: remote APIs, weather, backend data, deterministic formatting helpers.
- **Client/mobile tools**: HealthKit, contacts, calendar, location, file pickers, deep links, and any action that requires device permissions or native modules.

This means the app should use AI SDK's client-side tool flow:

1. Declare the tool in the server route so the model can call it.
2. Forward the tool call to the client.
3. Execute the mobile capability on the device using `onToolCall`.
4. Return the result with `addToolOutput`.
5. Let the model continue with the tool result.

## Plan

### Phase 1 - Tooling foundation

- Define a shared tool registry shape.
- Tag each tool with domain, platform, permission requirements, and approval mode.
- Distinguish read-only tools from write/action tools.

### Phase 2 - Chat integration

- Refactor `src/app/api/chat+api.ts` to support both server tools and client/mobile tools.
- Refactor `src/app/(tabs)/chatbot/index.tsx` to handle `onToolCall` and `addToolOutput`.
- Add automatic continuation when all tool outputs are available.

### Phase 3 - First mobile tools

- Implement `get_recent_sleep` using HealthKit.
- Implement `get_today_steps` using HealthKit.
- Normalize outputs so the model receives compact summaries instead of raw native payloads.

### Phase 4 - Broader device capabilities

- Implement `search_contacts` using `expo-contacts`.
- Implement `get_upcoming_events` using `expo-calendar`.
- Implement `get_current_location` using `expo-location`.

### Phase 5 - Safety and UX

- Add confirmation flow for sensitive or write actions.
- Improve tool result rendering in chat.
- Add platform fallback messaging for unsupported tools.
- Add reusable permission-denied and unavailable error mapping.

### Phase 6 - Session orchestration and persistence

- Evolve each chat session from a purely foreground stream into a resumable task-oriented session.
- Support multiple concurrent sessions so users can start separate agent jobs such as weather, health, or calendar work in parallel.
- Add session persistence so unfinished agent work, tool state, and results survive app backgrounding, process death, and later resume.
- Distinguish UI presence from task execution so a session can continue conceptually even when its chat screen is not open.

### Phase 7 - Tooling architecture upgrade

- Refactor the flat registry into layered modules: capability manifests, exposure builders, executors, formatters, and safety guards.
- Keep typed AI SDK tools as the public contract, but borrow agent-clip's principles of progressive discovery, actionable errors, and strict separation between execution and presentation.
- Introduce dynamic tool exposure so the server can provide only the relevant subset of tools for the current platform, capability set, and task context.
- Move tool input/output formatting and approval summaries out of the chat screen into registry-owned metadata so tool behavior and tool presentation do not drift apart.
- Add a structured capability knowledge layer for higher-level app workflows so low-level tools like `open_external_url` stay small and deterministic.

## Tooling Architecture Upgrade

The reference design in `ref/Tools-design.md` and `ref/agent-clip/` is valuable mainly for its principles, not for a literal one-tool `run(command)` port.

For this Expo mobile app, a single stringly-typed command tool would be a regression because the current product depends on:

- typed JSON schemas for provider compatibility and safer tool calling,
- approval-aware UI for sensitive actions,
- device permission boundaries,
- and compact, structured tool outputs that the client can render consistently.

The recommended upgrade is therefore a hybrid model.

### Layer 1 - Capability manifests

Keep one canonical definition per capability, but make the manifest more explicit than the current `ChatToolDefinition`.

Suggested additional fields:

- `whenToUse`
- `whenNotToUse`
- `riskLevel`
- `permissions`
- `requiresFollowUp`
- `availability`
- `resolver`
- `formatInput`
- `formatOutput`
- `mapError`

This layer should describe what a tool is, not how the chat UI renders it or how the platform executes it.

### Layer 2 - Exposure builder

Add a builder such as `buildChatTools(context)` that decides which tools are actually shown to the model for a given request.

Recommended inputs:

- platform (`ios`, `android`, `web`)
- known capability flags
- active session/tool domain
- future app-skill availability summaries

This borrows the "progressive disclosure" idea from agent-clip without forcing a CLI interface. Instead of exposing the whole registry every turn, expose the smallest useful toolset.

### Layer 3 - Executors and guards

Keep low-level execution deterministic and separate from model-facing metadata.

Responsibilities:

- permission checks
- platform checks
- confirmation gating
- native module execution
- normalized success payloads
- normalized actionable errors

This is the mobile equivalent of agent-clip's execution layer: do the real work here, but do not mix presentation concerns into it.

### Layer 4 - Presentation metadata

The current chat screen has switch statements for `formatToolInput` and `formatToolOutput`. That will become brittle as the catalog grows.

Move those per-tool formatters into the tool manifests so:

- approval cards,
- compact result rendering,
- and debug visibility

all come from the same source of truth as the tool definition itself.

### Layer 5 - Skills and resolvers above raw tools

Do not expose every low-level primitive as if it were the final product interface.

Recommended split:

- low-level execution tools remain narrow and deterministic, such as `open_external_url`, `list_writable_calendars`, `get_current_location`
- higher-level capability knowledge lives in file-backed app skills / resolver docs, such as maps, ride-hailing, and future workflow-specific capability files

This matches the existing direction in `docs/mobile-agent-app-skills-registry-plan.md` and keeps the model from over-relying on ad-hoc descriptions inside one registry file.

### Suggested file split

One reasonable target layout is:

```text
src/features/chat/tools/
  types.ts
  manifests/
    server.ts
    mobile.ts
    app-actions.ts
  builders/
    build-chat-tools.ts
    build-tool-context.ts
  executors/
    mobile/
      health.ts
      calendar.ts
      contacts.ts
      location.ts
      external.ts
    server/
      time.ts
  formatters/
    input.ts
    output.ts
    errors.ts
  registry.ts
```

The important change is not the exact folder names. The important change is removing the current three-way split where tool definition, execution, and rendering drift independently.

## Proposed First Tool Set

### Read-only tools

- `get_recent_sleep`
- `get_today_steps`
- `search_contacts`
- `get_upcoming_events`
- `get_current_location`

### Action tools requiring confirmation

- `create_calendar_event`
- `open_external_url`
- `pick_document`
- `pick_image`

## Progress

- `Completed`: reviewed installed packages and current chat tool architecture.
- `Completed`: verified that HealthKit, contacts, calendar, and location permissions/plugins are present in `app.json`.
- `Completed`: confirmed that the current implementation lacks client-side tool execution.
- `Completed`: established documentation and delivery process for future work.
- `Completed`: implemented a shared chat tool registry for server tools and mobile tools.
- `Completed`: wired client-side mobile tool execution into the chat screen.
- `Completed`: implemented HealthKit `get_recent_sleep` and `get_today_steps` mobile tools.
- `Completed`: added `search_contacts`, `get_upcoming_events`, and `get_current_location` mobile tools.
- `Completed`: improved chat tool rendering with compact summaries for health, contacts, calendar, and location tools.
- `Completed`: fixed duplicate React list keys in chat rendering by switching to composite message/part keys.
- `Completed`: replaced the chat message container with `FlatList` for more stable list rendering.
- `Completed`: migrated the chatbot screen styling toward Uniwind/Tailwind `className` usage instead of inline styles.
- `Completed`: added confirmation-aware mobile tool flow in `src/app/(tabs)/chatbot/index.tsx`, including approval cards, approve/deny actions, and auto-continuation after approval responses.
- `Completed`: taught `onToolCall` to skip confirm-only mobile tools until the matching approval response has been granted.
- `Completed`: added `create_calendar_event` to the shared tool registry with `approvalMode: "confirm"`.
- `Completed`: implemented `create_calendar_event` in `src/features/chat/tools/mobile-executors.ts` with writable-calendar selection, ISO date validation, and normalized result output.
- `Completed`: added server-side `get_current_time` so the model can ground itself on a precise current timestamp when users ask about now/today or when calendar planning needs a time reference.
- `Completed`: added tool input examples for more complex tools and wrapped the chat model with AI SDK's tool-example middleware so providers like the current OpenAI-compatible Qwen backend still see few-shot guidance.
- `Completed`: fixed the approval execution gap for confirm-only client tools by executing the approved mobile tool directly on-device after the user presses Approve, instead of assuming the server will re-run a tool that has no server-side `execute` handler.
- `Completed`: implemented `open_external_url` as a confirm-only mobile tool with primary/fallback URL support, explicit scheme validation, and compact chat summaries.
- `Completed`: implemented `list_writable_calendars` as a read-only calendar helper so the agent can inspect writable calendars before choosing a target for event creation.
- `Completed`: reviewed the current flat tool registry against the `ref/Tools-design.md` and `ref/agent-clip/` reference design.
- `Completed`: decided to adopt agent-clip's principles selectively instead of replacing typed mobile tools with a single `run(command)` interface.
- `Completed`: recorded a layered upgrade direction for manifests, dynamic tool exposure, executors, formatters, and app-skill resolvers.
- `Completed`: generated the Phase 7 delivery contract docs in `docs/prd/mobile-agent-tooling-architecture-upgrade.md`, `docs/api/mobile-agent-tooling-architecture-upgrade.md`, and `docs/ui/mobile-agent-tooling-architecture-upgrade.md`.
- `Completed`: created GitHub Epic `#1` and implementation task `#2` for the Phase 7 tooling architecture upgrade so the PRD now has issue-level tracking.
- `Completed`: initialized Harness state files and mapped issue `#2` to `harness-tasks.json` task `task-001`.
- `Completed`: generated `tests/mobile-agent-tooling-architecture-upgrade-test-cases.md` as the executable QA contract for the Phase 7 MVP slice.
- `Completed`: extracted shared tool contracts into `src/features/chat/tools/types.ts`, plus manifest, builder, and presentation modules under `src/features/chat/tools/`.
- `Completed`: split mobile execution into domain modules under `src/features/chat/tools/executors/mobile/` and reduced `src/features/chat/tools/mobile-executors.ts` to a compatibility re-export.
- `Completed`: converted `src/features/chat/tools/registry.ts` into a thin facade that re-exports manifests, builders, and manifest-driven formatting helpers.
- `Completed`: moved chat tool input/output/approval/error formatting out of `src/app/(tabs)/chatbot/index.tsx` and into registry-owned presentation metadata.
- `Completed`: switched `src/app/api/chat+api.ts` from static `chatTools` import to `buildToolContext(...)` + `buildChatTools(context)` and started passing client platform context via request headers.
- `Completed`: added `tests/mobile-agent-tooling-architecture-upgrade.contract.ts` as a lightweight contract check compiled by `npx tsc --noEmit`.
- `Completed`: excluded `ref/` from the app TypeScript program so project validation reflects product code rather than archived reference code.
- `Completed`: hardened chat streaming error handling so provider timeout and 429 rate-limit failures are mapped to stable UI error messages instead of crashing the chat screen or breaking stream cleanup.
- `Recorded`: foreground streaming chat can be interrupted when the app backgrounds; this is an expected limitation of the current transport model and is not being solved in the current slice.
- `Recorded`: future product direction requires every session to become a resumable/background-capable agent task rather than a foreground-only stream.
- `Recorded`: future product direction also requires multiple concurrent sessions plus session persistence.

## Issues & Risks

- HealthKit is iOS-only and must be authorized before querying.
- Sensitive capabilities should not auto-run without explicit user approval.
- Raw native payloads can be too verbose or privacy-invasive for LLM context.
- Expo Go / dev-client / native-build differences can affect which tools are actually available.
- `create_calendar_event` currently requires the model to already know `title`, `startDate`, and `endDate`; ambiguous requests still need the assistant to ask follow-up questions first.
- AI SDK approval handling behaves differently for local/client tools versus provider/server-executed tools; for local tools without `execute`, an approval response alone does not create a tool result.
- The flat registry shape does not scale well as more tools, app integrations, and workflow-specific rules are added, because metadata, execution, and presentation logic are already split across multiple files.
- Tool rendering logic in `src/app/(tabs)/chatbot/index.tsx` duplicates tool-specific knowledge that should live next to the tool definitions.
- A static always-expose catalog increases tool-selection load for the model and makes it harder to give the assistant a sharp, context-relevant capability boundary.
- The current foreground streaming model is a mismatch for long-running autonomous agent work because mobile OS backgrounding can suspend the JS runtime and interrupt network streams.
- A future multi-session architecture will need explicit orchestration, cancellation, persistence, and resume semantics instead of assuming one active in-memory chat stream.
- `open_external_url` currently validates explicit URL schemes and blocks obviously unsafe schemes such as `javascript:`, `data:`, and `file:`, but it does not yet implement a full app-specific allowlist or install-detection layer.
- `list_writable_calendars` returns compact writable-calendar metadata, but calendar naming can still be ambiguous when users have multiple similar accounts or localized source names.
- The existing `docs/expo-dev-client-chat-api-notes.md` appears to contain encoding issues and may need cleanup later, but that is not required for this task.
- Provider retries can end in `RetryError` after timeout/429 responses; the UI transport therefore needs explicit server-side error-stream mapping and non-fatal client rendering instead of assuming the stream always closes cleanly.

## Decisions

- Use AI SDK client-side tools for device-native actions.
- Keep tool outputs compact and task-oriented.
- Start with read-only health tools because they are high-value and technically representative.
- Preserve implementation context in `docs/` on each meaningful phase.
- Keep tool definitions centralized so server route registration and client execution can evolve from one source of truth.
- Do not replace the mobile tool surface with a single `run(command)` tool; keep typed AI SDK tools as the public interface.
- Reuse agent-clip's deeper ideas instead: progressive capability disclosure, strong corrective errors, and execution/presentation separation.
- Evolve the current registry into a layered system of manifests, exposure builders, executors, formatters, and resolver-backed app skills.
- Phase 7 implementation should preserve the typed public tool surface where practical while allowing internal module boundaries to change aggressively.
- Treat low-level tools as execution primitives and keep higher-level workflow knowledge in separate capability docs or resolvers instead of inflating tool descriptions.
- Use AI SDK approval responses as the gate for confirm-only mobile tools, and only execute those tools on-device after the related approval has been recorded in chat state.
- Give the model a concrete notion of current time in two ways: a stamped system prompt and a deterministic `get_current_time` tool.
- Add tool input examples to complex tools and use middleware to fold those examples into tool descriptions for providers that ignore native `inputExamples` support.
- Do not treat the current foreground streaming chatbot implementation as the final execution model for mobile agents; it is an interim UI transport that will later sit on top of task/session orchestration.
- Plan for a session model where one user can own multiple agent sessions concurrently, each with its own goal, state, tool history, and resumable lifecycle.
- Session persistence is a first-class future requirement because autonomous agent work cannot depend on one foreground screen remaining open.
- The next app-integration phase should use an app skills / capability registry plus low-level `open_external_url` execution, with detailed design tracked in `docs/mobile-agent-app-skills-registry-plan.md`.
- Phase 7 implementation is being tracked through GitHub Epic `#1`, task issue `#2`, and Harness task `task-001` so the work can resume cleanly across sessions.
- For this repository state, Phase 7 validation will use `bun run lint` and `npx tsc --noEmit` as objective checks, with additional manual verification for tool-card rendering because there is no dedicated unit-test runner yet.
- Chat transport failures from the AI provider should degrade into user-visible retry guidance inside the chat UI, not a full-screen crash path; server responses must stay UI-message-stream compatible even when model startup fails.

## Implementation Notes

- Contacts access should use `expo-contacts`, not `expo-constants`.
- `expo-constants` remains useful for app/runtime metadata, not contact retrieval.
- The existing server tool examples in `src/app/api/chat+api.ts` are still useful as a pattern for schema definitions.
- Client-side mobile tools are declared in the server route but executed on-device through `useChat` `onToolCall` + `addToolOutput`.
- HealthKit authorization is requested immediately before read queries in the initial implementation for reliability.
- Contacts, calendar, and location tools follow the same pattern: request permission on demand, read native data, then normalize the output before it returns to the model.
- AI SDK message IDs can repeat during streaming/reconciliation, so chat list rendering should use composite keys that include the render index.
- `FlatList` is a better fit than `ScrollView` for streamed chat messages because it uses explicit keys and scales more predictably as messages grow.
- In this project, static React Native styling should prefer Uniwind/Tailwind `className` for consistency with the rest of the codebase.
- AI SDK's stock `lastAssistantMessageIsCompleteWithToolCalls` helper is not enough for confirmation flows by itself; the chatbot screen now uses custom auto-continue logic so denied approvals continue immediately, while approved local tools wait for a real tool result.
- For confirm-only client tools, the crucial detail is that approval and execution are two separate responsibilities: the approval response informs the model, while the device must still execute the mobile tool itself and publish the tool output with `addToolOutput`.
- `create_calendar_event` chooses the requested writable calendar when possible, otherwise falls back to the default iOS calendar or the best available writable event calendar on the device.
- The chatbot screen now only auto-continues on approval responses when the user denied a tool; approved local tools wait for an actual tool result before the next roundtrip.
- `get_current_time` is intentionally server-side and deterministic so the assistant has a reliable fallback for absolute dates like "today" and "now".
- Background interruption of streaming chat has been observed in practice when the app switches away; this is now treated as known behavior of the current architecture rather than a bug to fix inside the present task.
- The desired long-term behavior is not merely "resume the same stream" but "run each session as a resumable agent task" that can progress independently of whether its chat UI is currently mounted.
- The future session layer should support at least: multiple concurrent sessions, persisted message/task state, resumable tool execution, per-session status, and handoff between active UI and background processing.
- `open_external_url` uses `expo-linking` `openURL()` directly with fallback handling instead of relying on `canOpenURL()` for every app scheme, because custom-scheme detection on iOS depends on `LSApplicationQueriesSchemes` and would be too brittle for the initial generic implementation.
- `list_writable_calendars` should be the preferred preflight helper whenever the user asks to create an event on a specific calendar like work, personal, or a named account and the target is not already unambiguous.
- `src/app/api/chat+api.ts` now maps `RetryError` and `APICallError` failures into `toUIMessageStreamResponse({ onError })` or a fallback `createUIMessageStreamResponse(...)`, so early stream failures still produce a valid UI error part.
- `src/app/(tabs)/chatbot/index.tsx` now keeps the chat screen mounted on request failure, shows the error inline above the composer, clears stale errors on the next edit/send, and blocks repeated submits while a request is already in flight.

## Next Steps

1. Finish extracting shared tool types and manifest files so `src/features/chat/tools/registry.ts` becomes a thin facade.
2. Create the PR for issue `#2`, run the review loop, and merge once checks are green.
3. Reuse the confirmation flow for the next sensitive tools such as `pick_document` and `pick_image`.
4. Consider richer event-targeting inputs later, such as duration defaults, natural-language time resolution, or smarter calendar selection over `list_writable_calendars` results.
5. If calendar creation still feels brittle in practice, consider adding a stronger confirmation summary generated from structured event inputs before execution.
6. Design a real session/task layer for mobile agents, including background-capable execution semantics, multiple concurrent sessions, and explicit lifecycle states.
7. Design persistence for sessions, messages, tool calls, pending approvals, and task progress so agent work can survive app backgrounding or process death.
8. Implement the app skills / capability registry design in `docs/mobile-agent-app-skills-registry-plan.md`, starting with `open_external_url`, `list_writable_calendars`, Apple Maps, AMap, and DiDi.
9. Continue updating this file as each phase lands.
