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

## Commit Message Guidelines

When generating commit messages, create detailed, structured messages following this format:

```
<type>(<scope>): <subject>
<= blank line =>
<= detailed body with sections =>

## Summary
• Brief description of what was changed
• Any key implementation details

## Changes
• Specific files or components modified
• New features added
• Breaking changes (if any)

## Testing
• How the changes were tested
• Any edge cases considered

## Related Issues
• References to related issues or tickets
```

**Important:** Do NOT include "Co-Authored-By: Claude" or any AI attribution in commit messages.

## Architecture

### File-Based Routing
Uses **expo-router** with file-based routing. Routes are defined in `src/app/` directory:
- `_layout.tsx` - Root layout with providers (GestureHandlerRootView, HeroUINativeProvider)
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
   - Components follow compound pattern (e.g., `Button.Label`, `Card.Body`)

### TypeScript Path Aliases
Configured in `tsconfig.json`:
- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

### Provider Stack
In `_layout.tsx`, wrap components in order:
1. `GestureHandlerRootView` - For gesture handling
2. `HeroUINativeProvider` - UI theming and components

## Component Patterns

- Use `className` prop for styling with Tailwind/Uniwind utilities
- HeroUI Native components use compound pattern:
  ```tsx
  <Button variant="primary">
    <Button.Label>Button Text</Button.Label>
  </Button>
  ```
- Import icons from `@expo/vector-icons`

## Key Dependencies

- **expo-router** (~55.0.4) - File-based routing
- **heroui-native** (^1.0.0-rc.3) - UI component library
- **uniwind** (^1.5.0) - Tailwind-like styling for React Native
- **react-native-reanimated** (^4.1.1) - Animations
- **@gorhom/bottom-sheet** (^5.2.8) - Bottom sheet component
- **@kingstinct/react-native-healthkit** (^13.2.3) - iOS HealthKit integration
