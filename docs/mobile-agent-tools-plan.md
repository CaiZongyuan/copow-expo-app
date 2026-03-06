# Mobile Agent Tools Plan

## Background

The goal is to let the in-app chat agent invoke real mobile capabilities when users ask for them, such as reading recent sleep data, checking steps, searching contacts, reading calendar events, or using device location.

The current chat flow already supports model tool calling, but only with server-side demo tools.

## Current State

- Chat requests are sent from `src/app/(tabs)/chatbot/index.tsx` using `useChat` and `DefaultChatTransport`.
- The API route `src/app/api/chat+api.ts` uses `streamText` and defines only two server-executed tools: `weather` and `convertFahrenheitToCelsius`.
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
- The current foreground streaming model is a mismatch for long-running autonomous agent work because mobile OS backgrounding can suspend the JS runtime and interrupt network streams.
- A future multi-session architecture will need explicit orchestration, cancellation, persistence, and resume semantics instead of assuming one active in-memory chat stream.
- `open_external_url` currently validates explicit URL schemes and blocks obviously unsafe schemes such as `javascript:`, `data:`, and `file:`, but it does not yet implement a full app-specific allowlist or install-detection layer.
- `list_writable_calendars` returns compact writable-calendar metadata, but calendar naming can still be ambiguous when users have multiple similar accounts or localized source names.
- The existing `docs/expo-dev-client-chat-api-notes.md` appears to contain encoding issues and may need cleanup later, but that is not required for this task.

## Decisions

- Use AI SDK client-side tools for device-native actions.
- Keep tool outputs compact and task-oriented.
- Start with read-only health tools because they are high-value and technically representative.
- Preserve implementation context in `docs/` on each meaningful phase.
- Keep tool definitions centralized so server route registration and client execution can evolve from one source of truth.
- Use AI SDK approval responses as the gate for confirm-only mobile tools, and only execute those tools on-device after the related approval has been recorded in chat state.
- Give the model a concrete notion of current time in two ways: a stamped system prompt and a deterministic `get_current_time` tool.
- Add tool input examples to complex tools and use middleware to fold those examples into tool descriptions for providers that ignore native `inputExamples` support.
- Do not treat the current foreground streaming chatbot implementation as the final execution model for mobile agents; it is an interim UI transport that will later sit on top of task/session orchestration.
- Plan for a session model where one user can own multiple agent sessions concurrently, each with its own goal, state, tool history, and resumable lifecycle.
- Session persistence is a first-class future requirement because autonomous agent work cannot depend on one foreground screen remaining open.
- The next app-integration phase should use an app skills / capability registry plus low-level `open_external_url` execution, with detailed design tracked in `docs/mobile-agent-app-skills-registry-plan.md`.

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

## Next Steps

1. Add platform and permission fallback copy for unsupported environments.
2. Consider extracting reusable permission helpers for all mobile tool domains.
3. Reuse the new confirmation flow for the next sensitive tools such as `pick_document` and `pick_image`.
4. Consider richer event-targeting inputs later, such as duration defaults, natural-language time resolution, or smarter calendar selection over `list_writable_calendars` results.
5. If calendar creation still feels brittle in practice, consider adding a stronger confirmation summary generated from structured event inputs before execution.
6. Design a real session/task layer for mobile agents, including background-capable execution semantics, multiple concurrent sessions, and explicit lifecycle states.
7. Design persistence for sessions, messages, tool calls, pending approvals, and task progress so agent work can survive app backgrounding or process death.
8. Implement the app skills / capability registry design in `docs/mobile-agent-app-skills-registry-plan.md`, starting with `open_external_url`, `list_writable_calendars`, Apple Maps, AMap, and DiDi.
9. Continue updating this file as each phase lands.
