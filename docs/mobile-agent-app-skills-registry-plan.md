# Mobile Agent App Skills Registry Plan

## Background

The current mobile agent toolset can already read health, contacts, calendar, and location data, and can now create calendar events with explicit confirmation.

The next major capability area is app-to-app action orchestration: opening map apps, ride-hailing apps, payment apps, social apps, and document/media flows in a structured, agent-friendly way.

The product goal is not just "open a URL". The agent needs a durable way to understand:

- which apps are supported,
- what actions each app can perform,
- how deep links or universal links should be constructed,
- what follow-up information is required before execution,
- what safety checks and confirmations are required,
- and what fallback behavior should happen when an app is unavailable.

The user explicitly wants this modeled in a style inspired by the OpenClaw workspace-file approach, where structured markdown files act as durable agent-readable rules and knowledge rather than overloading a single giant prompt.

Using the naming guidance from the `skill-creator` skill, this concept is better framed as an app skills registry than as a filesystem. These files are effectively skill-like capability definitions for external apps.

## Current State

- The mobile agent currently uses a centralized tool registry in `src/features/chat/tools/registry.ts`.
- Client-side mobile tools execute through `src/features/chat/tools/mobile-executors.ts` and `src/app/(tabs)/chatbot/index.tsx`.
- Confirmation-aware execution now exists for write/sensitive mobile tools.
- There is no app skills registry or durable file-backed description of supported third-party app behaviors.
- There is no generalized `open_external_url` tool yet.
- There is no `list_writable_calendars` helper yet.
- The current implementation knows how to create a calendar event, but if users later want to target a specific writable calendar (for example "put this on my work calendar"), the agent has no helper to inspect writable calendar options first.

## Goals

- Add a safe, confirmation-required `open_external_url` tool as the low-level execution primitive for opening external apps, links, and deep links.
- Add a read-only `list_writable_calendars` helper so the agent can inspect available writable calendars before creating calendar events.
- Introduce an app skills / capability registry under `docs/` that acts as a durable, structured knowledge base for app-specific linking behavior.
- Make the system work for both global apps and China-specific ecosystems such as Apple Maps, AMap, and DiDi.
- Keep the agent's high-level reasoning grounded in files that can be revised without rewriting core tool code.

## Non-Goals

- This phase does not aim to implement every ecosystem integration immediately.
- This phase does not aim to guarantee that background execution continues while the app is backgrounded.
- This phase does not aim to solve session persistence or multi-session orchestration.
- This phase does not require a fully dynamic file reader tool yet; the first version can keep the registry as developer-maintained documentation/config that is incorporated into prompts or resolver logic.

## Proposed Architecture

The design has three layers.

### Layer 1 - Low-level execution tools

These are the actual tools callable by the model.

1. `open_external_url`
   - Runtime: mobile
   - Approval mode: confirm
   - Responsibility: open a provided URL, app link, deep link, or universal link on-device
   - Responsibility boundary: execution only; it should not own all app-specific business rules

2. `list_writable_calendars`
   - Runtime: mobile
   - Approval mode: auto
   - Responsibility: return writable event calendars with compact metadata suitable for agent choice

3. Existing action tools such as `create_calendar_event`
   - May optionally use helper tools like `list_writable_calendars` before execution

### Layer 2 - Resolver logic

This layer translates a structured app intent into a concrete link.

Examples:

- "Navigate to Shanghai Hongqiao Station using AMap"
- "Open DiDi and start a ride to the airport"
- "Open Apple Maps for walking directions"

The resolver logic should eventually map:

- app identity
- action name
- structured parameters
- platform

into:

- a concrete URL/deep link,
- fallback candidates,
- and execution safety metadata.

This logic can live partly in code and partly in the app skills registry.

### Layer 3 - App skills / capability registry

This is the durable file-based knowledge layer.

It is not a user-facing file picker and not a literal device filesystem tool. It is a structured collection of markdown files that describe app capabilities in a stable, skill-like format so the agent and the implementation both have a shared reference.

## Proposed App Skills Registry Layout

```text
docs/mobile-agent-apps/
  index.md
  TOOL_RULES.md
  maps/
    apple-maps.md
    amap.md
  transport/
    didi.md
  media/
    system-share.md
  templates/
    app-capability-template.md
```

### File responsibilities

- `index.md`
  - top-level catalog of supported apps and categories
  - cross-reference entry point for future contributors and agent prompts

- `TOOL_RULES.md`
  - shared rules for when to use `open_external_url`
  - confirmation requirements
  - app availability checks
  - fallback policy
  - prompt-injection cautions for third-party URLs

- per-app files such as `maps/amap.md`
  - capability definition for one app
  - action list, parameters, URL templates, fallbacks, examples

- `templates/app-capability-template.md`
  - standard schema for adding new app files consistently

## Proposed App Capability File Schema

Each app markdown file should use stable sections so both humans and future automation can parse it consistently.

Recommended sections:

1. `Overview`
   - App name
   - Category
   - Platforms
   - Whether installation detection is required

2. `Supported Actions`
   - A small enumerated list such as `navigate`, `search_place`, `ride_to_destination`

3. `Input Requirements`
   - Required structured fields per action
   - Optional fields
   - Clarification rules when required fields are missing

4. `Link Templates`
   - URL scheme examples
   - Universal link/web fallback examples
   - Platform-specific differences

5. `Fallback Strategy`
   - What to do when app unavailable
   - Whether to fall back to another app, web URL, or ask the user

6. `Safety`
   - Whether confirmation is required
   - Any platform or privacy constraints
   - Any risk notes

7. `Examples`
   - A few structured examples mapping user intent to action + parameters + resolved URL

## Example App File Shape

Illustrative structure for `docs/mobile-agent-apps/maps/amap.md`:

```md
# AMap

## Overview
- Category: maps
- Platforms: iOS, Android
- Preferred for: mainland China navigation and local POI search

## Supported Actions
- search_place
- navigate
- open_coordinates

## Input Requirements
- `navigate` requires a destination name
- prefer latitude/longitude when available
- if coordinates are missing, allow place-name fallback

## Link Templates
- App scheme: `androidamap://...`
- Universal/web fallback: `https://uri.amap.com/...`

## Fallback Strategy
- If AMap unavailable on iOS, consider Apple Maps
- If no app link works, fall back to web map URL

## Safety
- confirmation required before leaving the app

## Examples
- intent: navigate to Shanghai Hongqiao Station by car
- params: `{ destinationName, lat, lon }`
- resolved link: `...`
```

## Proposed Tool Definitions

### `open_external_url`

Purpose:

- open a concrete external URL after explicit user confirmation

Recommended input shape:

```ts
{
  url: string;
  label?: string;
  appName?: string;
  intent?: string;
  fallbackUrl?: string;
}
```

Recommended output shape:

```ts
{
  status: "opened" | "fallback-opened";
  url: string;
  appName: string | null;
  usedFallback: boolean;
}
```

Execution notes:

- validate URL protocol against an allowlist
- show confirmation summary in the chat UI before execution
- prefer app-specific universal links or safe schemes from the app skills registry
- if the primary URL cannot open and a `fallbackUrl` exists, try the fallback
- report which URL actually opened

### `list_writable_calendars`

Purpose:

- list writable event calendars so the agent can target the right calendar before creation

Recommended input shape:

```ts
{
  includeHidden?: boolean;
}
```

Recommended output shape:

```ts
{
  total: number;
  calendars: Array<{
    id: string;
    title: string;
    sourceName: string | null;
    ownerAccount: string | null;
    isPrimary: boolean;
    isVisible: boolean;
  }>;
}
```

Why this tool is useful:

- users often have multiple calendars such as iCloud, Google, Exchange, work, or subscribed calendars
- not every calendar is writable
- the default writable calendar may not match the user's intent
- the user may say "add it to my work calendar" or "put it on my personal calendar"
- this tool allows the agent to choose correctly rather than silently writing to an arbitrary default

Recommended agent behavior:

- if the user explicitly names a calendar and it is ambiguous, call `list_writable_calendars`
- if the user does not care, `create_calendar_event` may still use the default writable calendar
- if there are multiple likely matches, the assistant should ask a follow-up question rather than guessing

## Execution Flow Examples

### Flow A - AMap navigation

1. User asks: "Use AMap to navigate to Shanghai Hongqiao Station"
2. Model identifies AMap capability file and the `navigate` action
3. Model determines required fields are present or asks follow-up questions
4. Resolver constructs the app link
5. Model calls `open_external_url`
6. User approves
7. Client opens the app link and returns a compact result

### Flow B - Calendar creation with calendar choice

1. User asks: "Create a meeting on my work calendar tomorrow at 2pm"
2. Model resolves date/time and event details
3. If "work calendar" is ambiguous, model calls `list_writable_calendars`
4. Assistant asks user which matching writable calendar to use if needed
5. Model calls `create_calendar_event` with the chosen `calendarId`
6. User approves
7. Client creates the event and returns normalized output

## Safety Rules

- `open_external_url` should always require confirmation
- the resolver should only construct links from trusted capability files or trusted internal templates
- arbitrary URLs from untrusted content should not be opened automatically
- external content must be treated as potentially hostile; links coming from web pages, documents, or model hallucinations should not bypass confirmation or allowlist checks
- app skill files should explicitly state whether an action is safe, confirm-required, or disallowed

## Plan

### Phase 1 - Design and registry scaffolding

- Create this design doc and align it with the main mobile agent plan
- Create `docs/mobile-agent-apps/` with index, tool rules, and template files
- Define the stable app skill file format

### Phase 2 - Low-level tool implementation

- Implement `open_external_url`
- Implement `list_writable_calendars`
- Add chat UI summaries for both tools

### Phase 3 - First ecosystem files

- Add `apple-maps.md`
- Add `amap.md`
- Add `didi.md`

### Phase 4 - Resolver integration

- Decide whether resolver logic lives in prompt guidance only, code only, or a hybrid approach
- Add few-shot examples tying user requests to app actions and URL resolution
- Reuse confirmation flow for all app-opening actions

## Progress

- `Completed`: identified the need for an app skills / capability registry inspired by the OpenClaw workspace-file pattern.
- `Completed`: defined the three-layer architecture of execution tools, resolver logic, and capability files.
- `Completed`: scoped the next two concrete tools as `open_external_url` and `list_writable_calendars`.
- `Completed`: implemented `open_external_url` as a confirm-only mobile tool with explicit scheme validation, fallback URL support, and chat UI summaries.
- `Completed`: implemented `list_writable_calendars` as a read-only mobile helper that returns compact writable calendar metadata for later calendar targeting.
- `Pending`: scaffold `docs/mobile-agent-apps/` files.
- `Pending`: add first app skill files for Apple Maps, AMap, and DiDi.

## Issues & Risks

- Deep links differ substantially across platforms and apps; documentation can drift as apps update.
- Some apps may not expose stable public URL schemes or may change them without notice.
- The agent must not hallucinate unsupported app links; registry files should remain the source of truth.
- App opening is sensitive because it jumps out of the current UI and can trigger real-world actions.
- China-specific ecosystems may need more careful fallback handling than global apps.
- Generic URL opening still needs future app-specific resolver rules so the model does not over-rely on ad-hoc or hallucinated deep links.

## Decisions

- Use `open_external_url` as the low-level execution primitive rather than baking every app into a separate executor first.
- Represent app-specific behavior in durable markdown files under `docs/mobile-agent-apps/`.
- Keep `list_writable_calendars` as a read-only helper tool because calendar targeting is a common prerequisite for correct event creation.
- Prefer a layered design where capability knowledge and execution logic evolve independently.
- For the first pass, `open_external_url` should validate explicit schemes, block obviously unsafe schemes, support a fallback URL, and remain confirmation-only.
- For the first pass, `list_writable_calendars` should stay compact and selection-oriented instead of returning the full native calendar payload.

## Open Questions

- Should the agent read registry files dynamically at runtime, or should their contents be summarized into prompt context/tool descriptions during build time?
- Should app-installation detection be part of `open_external_url`, a separate helper, or platform-specific native checks?
- Should we add a more structured `open_app_intent` tool later, above `open_external_url`, once enough app skill files exist?
- How should we version app skill files as ecosystems change?

## Next Steps

1. Create the `docs/mobile-agent-apps/` directory with `index.md`, `TOOL_RULES.md`, and a reusable template.
2. Author initial capability files for Apple Maps, AMap, and DiDi.
3. Decide whether first-pass app resolution will be prompt-driven, code-driven, or hybrid.
4. Tighten `open_external_url` later with app-specific validation once the first registry files exist.
5. Consider adding a higher-level calendar selector or resolver that can translate phrases like "work calendar" into a `calendarId` using `list_writable_calendars` output.
6. Link the resulting implementation progress back into `docs/mobile-agent-tools-plan.md`.
