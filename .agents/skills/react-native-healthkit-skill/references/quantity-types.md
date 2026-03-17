# Quantity Types Reference

HealthKit Quantity Types represent numeric measurements with units. These are the most commonly used health data types.

## Query API
```typescript
import { QuantityTypes } from '@kingstinct/react-native-healthkit/modules'

// Query samples
const samples = await QuantityTypes.queryQuantitySamples(
  'HKQuantityTypeIdentifierStepCount',
  {
    filter: { date: { startDate, endDate } },
    limit: 20
  }
)

// Query with anchor for syncing
const result = await QuantityTypes.queryQuantitySamplesWithAnchor(
  'HKQuantityTypeIdentifierStepCount',
  { limit: 100, anchor: storedAnchor }
)
```

## Save API
```typescript
import { saveQuantitySample } from '@kingstinct/react-native-healthkit'

await saveQuantitySample(
  'HKQuantityTypeIdentifierStepCount',
  'count',
  1000,
  startDate,
  endDate,
  { metadata: { HKWasUserEntered: true } }
)
```

## Statistics API
```typescript
import { queryStatisticsForQuantity } from '@kingstinct/react-native-healthkit'

const stats = await queryStatisticsForQuantity(
  'HKQuantityTypeIdentifierStepCount',
  ['cumulativeSum', 'average'],
  { filter: { date: { startDate, endDate } } }
)
```

## Common Quantity Type Identifiers

### Activity & Movement
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierStepCount` | count | Number of steps |
| `HKQuantityTypeIdentifierDistanceWalkingRunning` | m | Distance walked/run |
| `HKQuantityTypeIdentifierDistanceSwimming` | m | Distance swum |
| `HKQuantityTypeIdentifierDistanceCycling` | m | Distance cycled |
| `HKQuantityTypeIdentifierFlightsClimbed` | count | Floors climbed |
| `HKQuantityTypeIdentifierWalkingSpeed` | m/s | Walking speed |
| `HKQuantityTypeIdentifierWalkingStepLength` | m | Average step length |
| `HKQuantityTypeIdentifierWalkingAsymmetryPercentage` | % | Walking asymmetry |

### Body Measurements
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierHeight` | m | Height |
| `HKQuantityTypeIdentifierBodyMass` | kg | Weight |
| `HKQuantityTypeIdentifierBodyMassIndex` | count | BMI |
| `HKQuantityTypeIdentifierBodyFatPercentage` | % | Body fat percentage |
| `HKQuantityTypeIdentifierLeanBodyMass` | kg | Lean body mass |

### Vitals
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierHeartRate` | count/min | Heart rate |
| `HKQuantityTypeIdentifierRestingHeartRate` | count/min | Resting heart rate |
| `HKQuantityTypeIdentifierWalkingHeartRateAverage` | count/min | Avg walking HR |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | ms | HRV (SDNN) |
| `HKQuantityTypeIdentifierBloodPressureSystolic` | mmHg | Systolic BP |
| `HKQuantityTypeIdentifierBloodPressureDiastolic` | mmHg | Diastolic BP |
| `HKQuantityTypeIdentifierBodyTemperature` | degC | Body temperature |
| `HKQuantityTypeIdentifierRespiratoryRate` | count/min | Respiratory rate |
| `HKQuantityTypeIdentifierOxygenSaturation` | % | Blood oxygen saturation |

### Energy & Exercise
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierActiveEnergyBurned` | kcal | Active calories |
| `HKQuantityTypeIdentifierBasalEnergyBurned` | kcal | Resting calories |
| `HKQuantityTypeIdentifierAppleExerciseTime` | min | Exercise minutes |
| `HKQuantityTypeIdentifierAppleMoveTime` | min | Move time |
| `HKQuantityTypeIdentifierAppleStandTime` | min | Stand time |

### Nutrition
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierDietaryEnergyConsumed` | kcal | Calories consumed |
| `HKQuantityTypeIdentifierDietaryProtein` | g | Protein |
| `HKQuantityTypeIdentifierDietaryFatTotal` | g | Total fat |
| `HKQuantityTypeIdentifierDietaryCarbohydrates` | g | Carbs |
| `HKQuantityTypeIdentifierDietarySugar` | g | Sugar |
| `HKQuantityTypeIdentifierDietaryFiber` | g | Fiber |
| `HKQuantityTypeIdentifierDietarySodium` | mg | Sodium |
| `HKQuantityTypeIdentifierDietaryWater` | mL | Water intake |
| `HKQuantityTypeIdentifierDietaryCaffeine` | mg | Caffeine |

### Health Metrics
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierBloodGlucose` | mg/dL | Blood glucose |
| `HKQuantityTypeIdentifierInsulinDelivery` | IU | Insulin delivered |
| `HKQuantityTypeIdentifierNumberOfAlcoholicDrinks` | count | Alcoholic drinks |

### Sleep
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierSleepAnalysis` | count/min | Sleep duration |

### Reproductive Health
| Identifier | Unit | Description |
|------------|------|-------------|
| `HKQuantityTypeIdentifierBasalBodyTemperature` | degC | Basal body temp |
| `HKQuantityTypeIdentifierCervicalMucusQuality` | count | Cervical mucus |
| `HKQuantityTypeIdentifierMenstrualFlow` | count | Menstrual flow |

## Units Reference

Common units for quantity types:

| Quantity Type | Common Units |
|---------------|--------------|
| Steps | `count` |
| Distance | `m`, `km`, `mi` |
| Weight | `kg`, `g` |
| Height | `m`, `cm` |
| Temperature | `degC`, `degF` |
| Energy | `kcal`, `kJ` |
| Heart Rate | `count/min` |
| Blood Pressure | `mmHg` |
| Glucose | `mg/dL`, `mmol/L` |
| Percentage | `%` |
| Time | `min`, `s`, `hr` |

## Statistics Options

For `queryStatisticsForQuantity`, use these options:

| Option | Description | Applicable To |
|--------|-------------|---------------|
| `cumulativeSum` | Total sum | Cumulative quantities (steps, distance) |
| `discreteAverage` | Average value | Discrete quantities (heart rate) |
| `discreteMax` | Maximum value | Discrete quantities |
| `discreteMin` | Minimum value | Discrete quantities |
| `mostRecent` | Most recent | All types |
| `duration` | Time duration | All types |

Check unit compatibility with `isQuantityCompatibleWithUnit(identifier, unit)`.
