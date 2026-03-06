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
- `Pending`: add confirmation flow for sensitive tools before introducing write actions.

## Issues & Risks

- HealthKit is iOS-only and must be authorized before querying.
- Sensitive capabilities should not auto-run without explicit user approval.
- Raw native payloads can be too verbose or privacy-invasive for LLM context.
- Expo Go / dev-client / native-build differences can affect which tools are actually available.
- The existing `docs/expo-dev-client-chat-api-notes.md` appears to contain encoding issues and may need cleanup later, but that is not required for this task.

## Decisions

- Use AI SDK client-side tools for device-native actions.
- Keep tool outputs compact and task-oriented.
- Start with read-only health tools because they are high-value and technically representative.
- Preserve implementation context in `docs/` on each meaningful phase.
- Keep tool definitions centralized so server route registration and client execution can evolve from one source of truth.

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

## Next Steps

1. Add confirmation-aware mobile tools for sensitive actions.
2. Add platform and permission fallback copy for unsupported environments.
3. Introduce write-capable tools like `create_calendar_event` with explicit approval.
4. Consider extracting reusable permission helpers for all mobile tool domains.
5. Continue updating this file as each phase lands.
