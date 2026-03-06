# Workout Types Reference

HealthKit supports 75+ workout activity types. Each workout can include detailed metrics like distance, calories, heart rate, and more.

## Query API
```typescript
import { queryWorkoutSamples, queryWorkoutSamplesWithAnchor } from '@kingstinct/react-native-healthkit'

// Basic query
const workouts = await queryWorkoutSamples({
  filter: {
    workoutActivityType: WorkoutActivityType.running,
    date: { startDate, endDate }
  },
  limit: 20
})

// With anchor for syncing
const { workouts, deletedSamples, newAnchor } = await queryWorkoutSamplesWithAnchor({
  filter: {
    OR: [
      { workoutActivityType: WorkoutActivityType.running },
      { workoutActivityType: WorkoutActivityType.cycling }
    ]
  },
  limit: 100,
  anchor: storedAnchor
})
```

## Save API
```typescript
import { saveWorkoutSample, WorkoutActivityType } from '@kingstinct/react-native-healthkit'

await saveWorkoutSample(
  WorkoutActivityType.running,
  [  // Quantities array (detailed metrics)
    {
      quantityType: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
      unit: 'm',
      quantity: 5000,
      startDate: workoutStart,
      endDate: workoutEnd
    }
  ],
  workoutStart,
  workoutEnd,
  {  // Totals
    distance: 5000,
    energyBurned: 350
  },
  {  // Metadata
    HKWasUserEntered: true
  }
)
```

## Workout Activity Types

### Running & Walking
| Type | Description |
|------|-------------|
| `running` | Running |
| `walking` | Walking |
| `wheelchairRun` | Wheelchair running |
| `wheelchairWalk` | Wheelchair walking |

### Cycling
| Type | Description |
|------|-------------|
| `cycling` | Cycling |
| `handCycling` | Hand cycling |

### Water Sports
| Type | Description |
|------|-------------|
| `swimming` | Swimming |
| `swimmingLap` | Swimming laps |
| `swimmingOpenWater` | Open water swimming |
| `waterFitness` | Water fitness |
| `waterPolo` | Water polo |
| `surfing` | Surfing |
| `waterskiing` | Water skiing |
| `wakeboarding` | Wakeboarding |
| `kayaking` | Kayaking |
| `rower` | Rowing |

### Winter Sports
| Type | Description |
|------|-------------|
| `skiing` | Skiing (general) |
| `crossCountrySkiing` | Cross-country skiing |
| `downhillSkiing` | Downhill skiing |
| `snowboarding` | Snowboarding |
| `skating` | Skating |
| `iceSkating` | Ice skating |
| `figureSkating` | Figure skating |
| `speedSkating` | Speed skating |

### Fitness & Gym
| Type | Description |
|------|-------------|
| `traditionalStrengthTraining` | Traditional strength training |
| `functionalStrengthTraining` | Functional strength training |
| `crossTraining` | Cross training |
| `mixedCardio` | Mixed cardio |
| `highIntensityIntervalTraining` | HIIT |
| `flexibility` | Flexibility/stretching |
| `coreTraining` | Core training |
| `preparationAndRecovery` | Warm-up/cool-down |

### Sports
| Type | Description |
|------|-------------|
| `basketball` | Basketball |
| `volleyball` | Volleyball |
| `soccer` | Soccer |
| `football` | American football |
| `tennis` | Tennis |
| `badminton` | Badminton |
| `baseball` | Baseball |
| `rugby` | Rugby |
| `hockey` | Hockey |
| `cricket` | Cricket |

### Other Activities
| Type | Description |
|------|-------------|
| `hiking` | Hiking |
| `climbing` | Rock climbing |
| `yoga` | Yoga |
| `pilates` | Pilates |
| `barre` | Barre |
| `dance` | Dance |
| `boxing` | Boxing |
| `kickboxing` | Kickboxing |
| `martialArts` | Martial arts |
| `gymnastics` | Gymnastics |
| `elliptical` | Elliptical |
| `stairs` | Stairs/stair climbing |
| `stepTraining` | Step training |
| `fencing` | Fencing |
| `golf` | Golf |
| `lacrosse` | Lacrosse |
| `racquetball` | Racquetball |
| `squash` | Squash |
| `tableTennis` | Table tennis (ping pong) |
| `trackAndField` | Track and field |
| `softball` | Softball |
| `handball` | Handball |
| `discSports` | Disc sports (Frisbee) |
| `cardioDance` | Cardio dance |
| `fitnessGaming` | Fitness gaming |
| `socialDance` | Social dance |

## Workout Totals

When saving a workout, you can include summary totals:

```typescript
{
  distance: number,      // Total distance in meters
  energyBurned: number,  // Total calories in kcal
  swimLaps?: number      // For swimming workouts
}
```

## Workout Quantities

Detailed metrics you can attach to workouts:

| Quantity Type | Description | Unit |
|---------------|-------------|------|
| `HKQuantityTypeIdentifierDistanceWalkingRunning` | Distance | m |
| `HKQuantityTypeIdentifierDistanceCycling` | Cycling distance | m |
| `HKQuantityTypeIdentifierDistanceSwimming` | Swimming distance | m |
| `HKQuantityTypeIdentifierHeartRate` | Heart rate | count/min |
| `HKQuantityTypeIdentifierStepCount` | Steps | count |
| `HKQuantityTypeIdentifierActiveEnergyBurned` | Calories | kcal |

## Workout Metadata

Common metadata keys:

| Key | Type | Description |
|-----|------|-------------|
| `HKWasUserEntered` | boolean | User manually entered |
| `HKMetadataKeyIndoorWorkout` | boolean | Indoor vs outdoor |
| `HKMetadataKeyAverageMETs` | number | Average METs |

## Example: Complete 5K Run

```typescript
import { saveWorkoutSample, WorkoutActivityType } from '@kingstinct/react-native-healthkit'

const startTime = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
const endTime = new Date()

const workout = await saveWorkoutSample(
  WorkoutActivityType.running,
  [
    {
      quantityType: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
      unit: 'm',
      quantity: 5000,
      startDate: startTime,
      endDate: endTime
    },
    {
      quantityType: 'HKQuantityTypeIdentifierStepCount',
      unit: 'count',
      quantity: 6250,
      startDate: startTime,
      endDate: endTime
    },
    {
      quantityType: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      unit: 'kcal',
      quantity: 350,
      startDate: startTime,
      endDate: endTime
    }
  ],
  startTime,
  endTime,
  {
    distance: 5000,
    energyBurned: 350
  },
  {
    HKWasUserEntered: true,
    HKMetadataKeyIndoorWorkout: false
  }
)
```

## Workout Duration Filter

Query workouts by minimum duration:

```typescript
const workouts = await queryWorkoutSamples({
  filter: {
    duration: {
      durationInSeconds: 1800,  // 30 minutes minimum
      predicateOperator: ComparisonPredicateOperator.greaterThanOrEqualTo
    }
  }
})
```
