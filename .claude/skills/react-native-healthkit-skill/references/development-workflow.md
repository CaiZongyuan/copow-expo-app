# Development Workflow Reference

The react-native-healthkit project uses a monorepo structure with Nitro modules for type-safe native bindings.

## Monorepo Structure

```
react-native-healthkit/
├── apps/
│   └── example/           # Expo example app
│       ├── app/           # Implementation examples
│       └── ios/           # iOS project
├── packages/
│   └── react-native-healthkit/
│       ├── src/
│       │   ├── specs/     # Nitro module definitions (.nitro.ts)
│       │   ├── types/     # TypeScript types
│       │   ├── hooks/     # React hooks
│       │   ├── utils/     # Utility functions
│       │   ├── modules.ts # Module exports
│       │   └── index.ts   # Main exports
│       └── ios/           # Native iOS code
└── package.json           # Root package.json
```

## Development Commands

### Install Dependencies
```bash
# After adding new packages
bun install

# After adding native packages
cd apps/example/ios && pod install
```

### Code Generation (CRITICAL)
```bash
# After ANY changes to specs/ directory
bun codegen
```

**When to run `bun codegen`:**
- Modified any `.nitro.ts` file in `src/specs/`
- Added new type definitions
- Changed function signatures in specs
- Updated type references

**What it does:**
- Regenerates TypeScript types from Nitro specifications
- Updates native type bindings
- Ensures JS and native types are in sync

### Type Checking & Linting
```bash
# Run before committing
bun typecheck
bun lint

# Auto-fix linting issues
bun lint --fix
```

### Testing
```bash
# Run unit tests
bun test
```

### Building
```bash
# Start packager
cd apps/example && bun start

# Run on iOS
bun run ios
```

## Changeset Workflow

For features and bug fixes, document changes:

```bash
bun changeset
```

Follow semver:
- `major`: Breaking changes
- `minor`: New features
- `patch`: Bug fixes

## Key Files to Know

### Spec Files (API Surface)
Located in `packages/react-native-healthkit/src/specs/`:

| File | Module | Purpose |
|------|--------|---------|
| `CoreModule.nitro.ts` | Core | Authorization, subscriptions |
| `QuantityTypeModule.nitro.ts` | QuantityTypes | Query/save numeric data |
| `CategoryTypeModule.nitro.ts` | CategoryTypes | Query/save categories |
| `WorkoutsModule.nitro.ts` | Workouts | Query/save workouts |
| `HeartbeatSeriesModule.nitro.ts` | Heartbeat | Heart rate data |
| `ElectrocardiogramModule.nitro.ts` | ECG | ECG data |
| `MedicationModule.nitro.ts` | Medication | Medication tracking |
| `StateOfMindModule.nitro.ts` | Mind | Mental health |

### Example Implementations
Located in `apps/example/app/`:

| File | Demonstrates |
|------|--------------|
| `auth.tsx` | Authorization pattern |
| `(tabs)/quantityTypes/index.tsx` | Quantity queries with filters |
| `(tabs)/workouts/index.tsx` | Workout queries with complex filters |
| `(tabs)/subscriptions.tsx` | Subscription setup |

### Types Reference
Located in `packages/react-native-healthkit/src/types/`:

| File | Contains |
|------|----------|
| `QuantityTypeIdentifier.ts` | All quantity type strings |
| `CategoryTypeIdentifier.ts` | All category type strings |
| `Workouts.ts` | Workout types and interfaces |
| `QuantitySample.ts` | Sample structure |
| `QueryOptions.ts` | Filter and query options |

## Build Verification Rule

After making changes:

1. **Spec changes?** → Run `bun codegen`
2. **Always run** → `bun typecheck` and `bun lint`
3. **Before PR** → Build with xcodebuild

## Quick Reference

```bash
# Full development workflow
bun install              # Install dependencies
bun codegen              # Generate types (after spec changes)
bun typecheck            # Type check
bun lint                # Lint code
bun test                # Run tests
bun changeset            # Document changes
```

## Common Issues

### Type errors after changing specs
**Solution:** Run `bun codegen`

### Native code not updated
**Solution:** Run `cd apps/example/ios && pod install`

### Build fails in Xcode
**Solution:** Clean build folder (Shift+Cmd+K in Xcode)

### Hooks not working
**Solution:** Ensure `bun codegen` was run after spec changes
