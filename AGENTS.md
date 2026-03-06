## Project Overview

This is a React Native mobile application built with Expo SDK 55, React 19, and React Native 0.83. The app is configured for iOS and Android with native module support for HealthKit, Calendar, Contacts, Location, Maps, and File System.

## Development Commands

```bash
# Start development server
bun start
# or
npm start

# Run on specific platform
bun run android    # Android emulator or device
bun run ios        # iOS simulator or device

# Lint code
bun run lint

# Type check (ALWAYS run after code changes)
bun run tsc --noEmit
# or
npx tsc --noEmit
```

## Code Change Workflow

After making any code changes, always run TypeScript type checking:

```bash
npx tsc --noEmit
```

This ensures type safety before committing or running the app.

## Documentation Workflow

Meaningful agent tasks must leave durable notes in `docs/`.

- For multi-step work, architecture changes, debugging discoveries, or unfinished follow-up work, create or update a relevant markdown file in `docs/`.
- Keep planning/progress documents updated as work advances rather than relying on chat history.
- Record blockers, risks, and resolutions so another developer can continue without re-discovery.
- Prefer updating an existing long-lived doc for the same topic instead of creating many tiny docs.
- Follow the process documented in `docs/agent-planning-process.md`.

For the mobile agent capability work, update `docs/mobile-agent-tools-plan.md` as the source of truth for scope, decisions, progress, issues, and next steps.

## Commit Message Guidelines

When generating commit messages, create detailed, structured messages following this format:

```
<type>(<scope>): <subject>
<= blank line =>
<= detailed body with sections =>

## Summary
- Brief description of what was changed
- Any key implementation details

## Changes
- Specific files or components modified
- New features added
- Breaking changes (if any)

## Testing
- How the changes were tested
- Any edge cases considered

## Related Issues
- References to related issues or tickets
```

**Important:** Do NOT include AI attribution in commit messages.

## Architecture

### File-Based Routing

Uses **expo-router** with file-based routing. Routes are defined in `src/app/` directory:

- `_layout.tsx` - Root layout with providers
- `index.tsx` - Home screen
- Follow expo-router conventions for creating new routes

### Styling System

The project uses a multi-layered styling approach:

1. **Uniwind** - Primary styling utility that brings Tailwind-like class names to React Native
   - Configured in `metro.config.js` with entry point at `src/global.css`
   - Auto-generates TypeScript types in `src/uniwind-types.d.ts` (do not edit manually)
   - Themes: light, dark

2. **Tailwind CSS v4** - Imported in `global.css` for additional utility classes

3. **HeroUI Native** - UI component library (`heroui-native`)
   - Provides pre-built components: Button, Card, etc.
   - Components follow compound pattern (e.g. `Button.Label`, `Card.Body`)

### TypeScript Path Aliases

Configured in `tsconfig.json`:

- `@/*` -> `./src/*`
- `@/assets/*` -> `./assets/*`

### Provider Stack

In `_layout.tsx`, wrap components in order:

1. `GestureHandlerRootView`
2. `HeroUINativeProvider`

## Component Patterns

- Prefer `className` with Uniwind/Tailwind over inline `style` objects whenever the styling is static or can be expressed with utilities.
- Use inline `style` only for values that are truly dynamic or not practical to express with the existing utility classes.
- HeroUI Native components use the compound component pattern.
- Keep changes minimal and aligned with existing Expo Router structure.

## Key Dependencies

- `expo-router` - File-based routing
- `heroui-native` - UI component library
- `uniwind` - Tailwind-like styling for React Native
- `react-native-reanimated` - Animations
- `@gorhom/bottom-sheet` - Bottom sheet component
- `@kingstinct/react-native-healthkit` - iOS HealthKit integration
