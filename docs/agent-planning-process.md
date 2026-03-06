# Agent Planning & Progress Process

## Purpose

This project requires every meaningful agent task to leave a written trail in `docs/` so later developers can continue the work without reconstructing context from chat history.

## When to create or update a plan doc

Create or update a plan document when a task:

- spans multiple steps or phases,
- changes architecture, tools, APIs, or permissions,
- introduces new mobile capabilities,
- uncovers debugging findings worth preserving,
- or leaves follow-up work for another developer.

Small one-off edits do not need a standalone doc unless they reveal a reusable lesson.

## Recommended file naming

Use one of these patterns under `docs/`:

- `docs/<topic>-plan.md`
- `docs/<topic>-progress.md`
- `docs/<topic>-notes.md`

For long-running workstreams, prefer keeping a single document updated over creating many tiny files.

## Required sections

Each active planning/progress document should include:

1. `Background` - what problem is being solved.
2. `Current State` - what exists in the repo today.
3. `Plan` - phased implementation steps.
4. `Progress` - completed / in-progress / pending items.
5. `Issues & Risks` - blockers, platform limits, safety concerns.
6. `Decisions` - architecture choices and why.
7. `Next Steps` - concrete handoff checklist.

## Update rules

- Update the existing document before starting a new related implementation.
- Keep statuses explicit: `Completed`, `In Progress`, `Pending`, `Blocked`.
- Record important failures and how they were resolved.
- Prefer concise, durable knowledge over chat-style narration.
- Reference concrete repo files when relevant.

## Scope for the current project

For the mobile agent work, the source of truth should live in docs files rather than only in conversation history. Future contributors should be able to resume by reading the latest relevant plan/progress document in `docs/`.
