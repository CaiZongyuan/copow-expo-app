import {
  CategoryValueSleepAnalysis,
  queryCategorySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import {
  ensureHealthkitAccess,
  startOfDay,
  toIsoString,
  type MobileToolExecutor,
} from "@/features/chat/tools/executors/mobile/shared";

function sleepStageLabel(value: CategoryValueSleepAnalysis) {
  switch (value) {
    case CategoryValueSleepAnalysis.asleepCore:
      return "core";
    case CategoryValueSleepAnalysis.asleepDeep:
      return "deep";
    case CategoryValueSleepAnalysis.asleepREM:
      return "rem";
    case CategoryValueSleepAnalysis.asleepUnspecified:
      return "asleep";
    case CategoryValueSleepAnalysis.inBed:
      return "in_bed";
    case CategoryValueSleepAnalysis.awake:
      return "awake";
    default:
      return "unknown";
  }
}

export const healthExecutors = {
  get_recent_sleep: async ({ days = 7, limit = 30 }) => {
    await ensureHealthkitAccess(["HKCategoryTypeIdentifierSleepAnalysis"]);

    const endDate = new Date();
    const startDate = new Date(endDate);

    startDate.setDate(startDate.getDate() - days);

    const samples = await queryCategorySamples(
      "HKCategoryTypeIdentifierSleepAnalysis",
      {
        filter: {
          date: {
            startDate,
            endDate,
          },
        },
        ascending: false,
        limit,
      }
    );

    const sleepEntries = samples
      .filter(
        (sample) =>
          sample.value !== CategoryValueSleepAnalysis.awake &&
          sample.value !== CategoryValueSleepAnalysis.inBed
      )
      .map((sample) => {
        const durationMinutes = Math.max(
          0,
          Math.round(
            (sample.endDate.getTime() - sample.startDate.getTime()) / 60000
          )
        );

        return {
          startDate: toIsoString(sample.startDate),
          endDate: toIsoString(sample.endDate),
          durationMinutes,
          stage: sleepStageLabel(sample.value),
        };
      });

    const totalSleepMinutes = sleepEntries.reduce(
      (sum, entry) => sum + entry.durationMinutes,
      0
    );

    return {
      days,
      sampleCount: sleepEntries.length,
      totalSleepMinutes,
      entries: sleepEntries,
    };
  },
  get_today_steps: async () => {
    await ensureHealthkitAccess(["HKQuantityTypeIdentifierStepCount"]);

    const now = new Date();
    const dayStart = startOfDay(now);
    const result = await queryStatisticsForQuantity(
      "HKQuantityTypeIdentifierStepCount",
      ["cumulativeSum"],
      {
        filter: {
          date: {
            startDate: dayStart,
            endDate: now,
          },
        },
        unit: "count",
      }
    );

    return {
      date: dayStart.toISOString().slice(0, 10),
      steps: Math.round(result.sumQuantity?.quantity ?? 0),
      unit: result.sumQuantity?.unit ?? "count",
      startDate: toIsoString(dayStart),
      endDate: toIsoString(now),
    };
  },
} satisfies Record<string, MobileToolExecutor>;
