---
name: react-native-healthkit
description: Help developers use @kingstinct/react-native-healthkit for Apple HealthKit APIs in React Native. Reference apps/example for implementation patterns. Use this skill when working with health data, requesting permissions, querying/saving samples (steps, heart rate, workouts, sleep, etc.), subscribing to HealthKit changes, or any HealthKit-related task in React Native. Essential for developers integrating Apple Health who need to find the right API, understand data types (QuantityTypeIdentifier, CategoryTypeIdentifier, WorkoutActivityType), debug authorization issues, or follow the monorepo development workflow (codegen, typecheck, iOS build verification).
---

# React Native HealthKit Helper

This skill helps developers use `@kingstinct/react-native-healthkit` to access Apple HealthKit APIs in React Native apps. The library uses react-native-nitro-modules for type-safe bindings.

## Project Structure

The codebase is a monorepo:
```
react-native-healthkit/
├── apps/example/           # Expo example app with implementation patterns
├── packages/react-native-healthkit/
│   ├── src/specs/         # Nitro module definitions (API surface)
│   ├── src/types/         # TypeScript type definitions
│   ├── src/hooks/         # React hooks (useMostRecentQuantitySample, etc.)
│   └── src/modules.ts     # Main exports
```

## Development Workflow

After making changes:
1. **Type changes in specs/**: Run `bun codegen` to regenerate types
2. **Verify code quality**: Run `bun typecheck` and `bun lint`
3. **Build verification**: Use xcodebuild to compile for iOS Simulator
4. **For features/bug fixes**: Run `bun changeset` to document changes

## Core Concepts

### HealthKit Data Types

HealthKit data is organized into type identifiers:

| Category | Identifiers | Examples |
|----------|-------------|----------|
| Quantity Types | `HKQuantityTypeIdentifier*` | Steps, heart rate, blood glucose, distance |
| Category Types | `HKCategoryTypeIdentifier*` | Sleep analysis, mindful sessions |
| Workout Types | `HKWorkoutActivityType*` | Running, swimming, cycling, etc. |
| Correlation Types | `HKCorrelationTypeIdentifier*` | Food + blood pressure |

### Authorization Pattern

**CRITICAL**: Always request authorization before querying or writing data. Failing to do so will crash your app.

```typescript
import { requestAuthorization } from '@kingstinct/react-native-healthkit'

// Request permissions first
await requestAuthorization({
  toRead: ['HKQuantityTypeIdentifierStepCount'],
  toShare: ['HKQuantityTypeIdentifierStepCount']
})

// Then query data
```

## API Reference by Module

### Core Module (`CoreModule.nitro.ts`)

Authorization and HealthKit availability:
- `requestAuthorization(toRequest)` - Request read/write permissions
- `getRequestStatusForAuthorization(toCheck)` - Check authorization status
- `authorizationStatusFor(type)` - Get authorization for specific type
- `isHealthDataAvailable()` - Check if HealthKit is available
- `subscribeToObserverQuery(typeIdentifier, callback)` - Subscribe to data changes
- `unsubscribeQuery(queryId)` - Unsubscribe from changes

### Quantity Types (`QuantityTypeModule.nitro.ts`)

Query and save numeric health data:
- `queryQuantitySamples(identifier, options)` - Query samples with sorting/filtering
- `queryQuantitySamplesWithAnchor(identifier, options)` - Query with sync anchor
- `saveQuantitySample(identifier, unit, value, start, end, metadata?)` - Save a sample
- `queryStatisticsForQuantity(identifier, statistics, options?)` - Get statistics (avg, max, min, sum)

**Common QuantityTypeIdentifiers**:
- `HKQuantityTypeIdentifierStepCount` - Steps
- `HKQuantityTypeIdentifierHeartRate` - Heart rate (count/min)
- `HKQuantityTypeIdentifierActiveEnergyBurned` - Calories burned (kcal)
- `HKQuantityTypeIdentifierDistanceWalkingRunning` - Distance (m)
- `HKQuantityTypeIdentifierBloodGlucose` - Blood glucose (mg/dL)
- `HKQuantityTypeIdentifierBodyFatPercentage` - Body fat (%)

### Category Types (`CategoryTypeModule.nitro.ts`)

Query and save discrete health categories:
- `queryCategorySamples(identifier, options)` - Query category samples
- `saveCategorySample(identifier, value, start, end, metadata?)` - Save category sample

**Common CategoryTypeIdentifiers**:
- `HKCategoryTypeIdentifierSleepAnalysis` - Sleep stages
- `HKCategoryTypeIdentifierMindfulSession` - Mindful minutes
- `HKCategoryTypeIdentifierMenstrualFlow` - Menstrual data

### Workouts (`WorkoutsModule.nitro.ts`)

Query and save workout data:
- `queryWorkoutSamples(options)` - Query workouts
- `queryWorkoutSamplesWithAnchor(options)` - Query with anchor
- `saveWorkoutSample(activityType, quantities, start, end, totals?, metadata?)` - Save workout

**WorkoutActivityType values**: `running`, `walking`, `cycling`, `swimming`, `traditionalStrengthTraining`, and 70+ more.

### Other Modules

- `HeartbeatSeriesModule.nitro.ts` - Heartbeat series data (watchOS)
- `ElectrocardiogramModule.nitro.ts` - ECG data
- `MedicationModule.nitro.ts` - Medication tracking
- `StateOfMindModule.nitro.ts` - Mental health data
- `CorrelationTypeModule.nitro.ts` - Correlated data types

## React Hooks

Available hooks for common patterns:
```typescript
import {
  useHealthkitAuthorization,
  useMostRecentQuantitySample,
  useMostRecentCategorySample,
  useMostRecentWorkout,
  useSubscribeToChanges
} from '@kingstinct/react-native-healthkit'

// Authorization hook
const [status, requestAuth] = useHealthkitAuthorization(['HKQuantityTypeIdentifierStepCount'])

// Get most recent sample
const steps = useMostRecentQuantitySample('HKQuantityTypeIdentifierStepCount')

// Subscribe to changes
useSubscribeToChanges('HKQuantityTypeIdentifierStepCount', () => {
  // Refetch data
})
```

## Query Options Pattern

Most query functions use the `QueryOptions` pattern:
```typescript
{
  filter?: {
    date?: { startDate: Date, endDate: Date }
    uuid?: string | string[]
    workoutUuid?: string
    metadata?: { withMetadataKey: string, operatorType, value: any }
    // Type-specific filters
    quantity?: { quantity: number, unit: string, operatorType }
    duration?: { durationInSeconds: number, predicateOperator }
    workoutActivityType?: WorkoutActivityType
    // Logical operators
    OR?: Filter[], AND?: Filter[], NOT?: Filter
  },
  ascending?: boolean,
  limit?: number,
  anchor?: string  // For anchor-based queries
}
```

## Anchor-Based Syncing

For efficient data syncing:
```typescript
import { queryQuantitySamplesWithAnchor } from '@kingstinct/react-native-healthkit'

const result = await queryQuantitySamplesWithAnchor('HKQuantityTypeIdentifierStepCount', {
  limit: 100,
  anchor: storedAnchor  // Pass previous anchor
})

// Save newAnchor for next sync
// result.samples contains new/changed samples
// result.deletedSamples contains deleted UUIDs
```

## Saving Data Pattern

```typescript
import { saveQuantitySample } from '@kingstinct/react-native-healthkit'

await saveQuantitySample(
  'HKQuantityTypeIdentifierStepCount',
  'count',           // unit
  1000,              // value
  startDate,         // Date
  endDate,           // Date
  {
    metadata: {
      HKWasUserEntered: true,
      customField: 'value'
    }
  }
)
```

## Implementation Examples from `apps/example`

### Authorization (apps/example/app/auth.tsx)
```typescript
import { requestAuthorization, getRequestStatusForAuthorization } from '@kingstinct/react-native-healthkit'

// Check status
const status = await getRequestStatusForAuthorization({
  toRead: AllObjectTypesInApp,
  toShare: AllSampleTypesInApp
})

// Request authorization
await requestAuthorization({
  toRead: ['HKQuantityTypeIdentifierStepCount'],
  toShare: ['HKQuantityTypeIdentifierStepCount']
})
```

### Quantity Query (apps/example/app/(tabs)/quantityTypes/index.tsx)
```typescript
import { QuantityTypes } from '@kingstinct/react-native-healthkit/modules'

const samples = await QuantityTypes.queryQuantitySamples(
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  {
    filter: {
      date: { startDate: fromDate, endDate: toDate }
    },
    ascending: false,
    limit: 20
  }
)
```

### Workouts (apps/example/app/(tabs)/workouts/index.tsx)
```typescript
import { queryWorkoutSamplesWithAnchor, saveWorkoutSample, WorkoutActivityType } from '@kingstinct/react-native-healthkit'

const { workouts, deletedSamples, newAnchor } = await queryWorkoutSamplesWithAnchor({
  filter: {
    OR: [
      { workoutActivityType: WorkoutActivityType.running },
      { workoutActivityType: WorkoutActivityType.walking }
    ],
    date: { endDate: new Date() },
    duration: {
      durationInSeconds: 60,
      predicateOperator: ComparisonPredicateOperator.greaterThanOrEqualTo
    }
  },
  limit: 20
})
```

## Common Issues & Solutions

1. **App crashes when querying data** - You didn't request authorization first
2. **"Not authorized" errors** - Check `authorizationStatusFor()` before accessing
3. **Type errors after changing specs** - Run `bun codegen`
4. **Unit confusion** - Use `getPreferredUnits()` to get user's preferred units
5. **Metadata key naming** - Serialized names drop `HKMetadataKey` prefix (e.g., `HKExternalUUID`)

## Key Files to Reference

- `apps/example/app/auth.tsx` - Authorization pattern
- `apps/example/app/(tabs)/quantityTypes/index.tsx` - Quantity queries
- `apps/example/app/(tabs)/workouts/index.tsx` - Workout queries with complex filters
- `packages/react-native-healthkit/src/specs/*.nitro.ts` - API definitions
- `packages/react-native-healthkit/src/types/` - Type definitions
- `packages/react-native-healthkit/src/index.ts` - Main exports

## Reference Documentation

For detailed information on specific topics, see the reference files:

- **`references/quantity-types.md`** - Complete list of 100+ quantity type identifiers, units, and statistics options
- **`references/category-types.md`** - All category types including sleep analysis values and symptom codes
- **`references/workout-types.md`** - 75+ workout activity types with detailed examples
- **`references/development-workflow.md`** - Monorepo structure, commands, and build verification steps
