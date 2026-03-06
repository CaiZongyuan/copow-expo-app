# Category Types Reference

HealthKit Category Types represent discrete health states, events, or classifications. These use predefined integer codes rather than numeric measurements.

## Query API
```typescript
import { CategoryTypes } from '@kingstinct/react-native-healthkit/modules'

// Query category samples
const samples = await CategoryTypes.queryCategorySamples(
  'HKCategoryTypeIdentifierSleepAnalysis',
  {
    filter: { date: { startDate, endDate } },
    limit: 20
  }
)
```

## Save API
```typescript
import { saveCategorySample } from '@kingstinct/react-native-healthkit'

await saveCategorySample(
  'HKCategoryTypeIdentifierSleepAnalysis',
  2,  // Value code for "asleep"
  startDate,
  endDate,
  { metadata: {} }
)
```

## Sleep Analysis Values
| Value | Meaning |
|-------|---------|
| 0 | In bed |
| 1 | Asleep (unspecified) |
| 2 | Asleep (core) |
| 3 | Asleep (deep) |
| 4 | Asleep (REM) |
| 5 | Awake |

## Common Category Type Identifiers

### Sleep
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierSleepAnalysis` | 0-5 | Sleep stages |

### Mindfulness
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierMindfulSession` | 0 | Mindful session completed |

### Menstrual Health
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierMenstrualFlow` | 1-5 | Flow level (unspecified, none, light, medium, heavy) |
| `HKCategoryTypeIdentifierOvulationTestResult` | 1-5 | Test result |
| `HKCategoryTypeIdentifierCervicalMucusQuality` | 1-5 | Mucus quality |
| `HKCategoryTypeIdentifierSexualActivity` | 0 | Sexual activity event |

### Symptoms
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierHeadache` | 0-5 | Severity (not present, mild, moderate, severe, unspecified) |
| `HKCategoryTypeIdentifierSoreThroat` | 0-5 | Severity |
| `HKCategoryTypeIdentifierHeartburn` | 0-5 | Severity |
| `HKCategoryTypeIdentifierNausea` | 0-5 | Severity |
| `HKCategoryTypeIdentifierCough` | 0-5 | Severity |
| `HKCategoryTypeIdentifierFatigue` | 0-5 | Severity |
| `HKCategoryTypeIdentifierFever` | 0-5 | Severity |
| `HKCategoryTypeIdentifierCongestion` | 0-5 | Severity |
| `HKCategoryTypeIdentifierRunnyNose` | 0-5 | Severity |
| `HKCategoryTypeIdentifierShortnessOfBreath` | 0-5 | Severity |
| `HKCategoryTypeIdentifierDizziness` | 0-5 | Severity |
| `HKCategoryTypeIdentifierApathy` | 0-5 | Severity |
| `HKCategoryTypeIdentifierEuphoria` | 0-5 | Severity |
| `HKCategoryTypeIdentifierWheezing` | 0-5 | Severity |
| `HKCategoryTypeIdentifierDiarrhea` | 0-5 | Severity |
| `HKCategoryTypeIdentifierConstipation` | 0-5 | Severity |
| `HKCategoryTypeIdentifierAbdominalCramps` | 0-5 | Severity |
| `HKCategoryTypeIdentifierSkipBleeding` | 0-5 | Severity |
| `HKCategoryTypeIdentifierPregnancy` | 1-4 | Status (not pregnant, pregnant, unsure) |
| `HKCategoryTypeIdentifierLactation` | 0-1 | Lactating |

### Health Events
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierAppleStandHour` | 0-2 | Stand hour (stood, idle, unknown) |
| `HKCategoryTypeIdentifierLowCardioFitnessEvent` | 0 | Low cardio fitness |
| `HKCategoryTypeIdentifierHighHeartRateEvent` | 0 | High heart rate event |
| `HKCategoryTypeIdentifierIrregularHeartRhythmEvent` | 0 | Irregular rhythm |
| `HKCategoryTypeIdentifierEnvironmentalAudioExposureEvent` | 1-3 | Audio exposure |

### Mobility
| Identifier | Values | Description |
|------------|--------|-------------|
| `HKCategoryTypeIdentifierSixMinuteWalkTestDistance` | 0-5 | Walking distance category |

## Value Code Patterns

Most symptom types use this severity scale:
- 0: Not present
- 1: Mild
- 2: Moderate
- 3: Severe
- 4: Unspecified
- 5: (varies by type)

## Binary Categories

Some category types are binary (present/absent):
- `HKCategoryTypeIdentifierMindfulSession`: 0 = session occurred
- `HKCategoryTypeIdentifierSexualActivity`: 0 = activity occurred
- `HKCategoryTypeIdentifierLactation`: 0 = not lactating, 1 = lactating

## Sleep Analysis Detail

The most complex category type is sleep analysis with specific stage codes:

```typescript
enum SleepAnalysisValue {
  InBed = 0,
  AsleepUnspecified = 1,
  Awake = 5,
  AsleepCore = 2,
  AsleepDeep = 3,
  AsleepREM = 4
}
```

## Example Usage

```typescript
// Save sleep analysis
await saveCategorySample(
  'HKCategoryTypeIdentifierSleepAnalysis',
  3,  // Deep sleep
  new Date('2024-01-01T23:00:00'),
  new Date('2024-01-01T23:30:00')
)

// Query sleep
const sleep = await CategoryTypes.queryCategorySamples(
  'HKCategoryTypeIdentifierSleepAnalysis',
  {
    filter: {
      date: { startDate, endDate }
    }
  }
)

// Filter by specific value
const deepSleep = sleep.filter(s => s.value === 3)
```

## Key Difference from Quantity Types

| Aspect | Category Types | Quantity Types |
|--------|---------------|----------------|
| Values | Integer codes | Numeric with units |
| Operations | No math | Can average, sum, etc. |
| Examples | Sleep stages, symptoms | Steps, heart rate |
| Units | None | Always has unit |
