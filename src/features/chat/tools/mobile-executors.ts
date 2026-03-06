import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailableAsync,
  type ObjectTypeIdentifier,
  queryCategorySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { Platform } from "react-native";

import { type MobileToolName } from "@/features/chat/tools/registry";

type MobileToolExecutor = (input: any) => Promise<unknown>;

function toIsoString(value: Date) {
  return value.toISOString();
}

function startOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function toDateValue(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown mobile tool error.";
}

async function ensureHealthkitAccess(objectTypes: readonly ObjectTypeIdentifier[]) {
  if (Platform.OS !== "ios") {
    throw new Error("HealthKit tools are only available on iOS devices.");
  }

  const isAvailable = await isHealthDataAvailableAsync();

  if (!isAvailable) {
    throw new Error("HealthKit is not available on this device.");
  }

  const granted = await requestAuthorization({
    toRead: objectTypes,
    toShare: [],
  });

  if (!granted) {
    throw new Error("HealthKit permission was not granted.");
  }
}

async function ensureContactsAccess() {
  const permission = await Contacts.requestPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Contacts permission was not granted.");
  }
}

async function ensureCalendarAccess() {
  const permission = await Calendar.requestCalendarPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Calendar permission was not granted.");
  }
}

async function ensureForegroundLocationAccess() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location permission was not granted.");
  }
}

const mobileToolExecutors: Record<MobileToolName, MobileToolExecutor> = {
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
  search_contacts: async ({ query, limit = 5 }) => {
    await ensureContactsAccess();

    const response = await Contacts.getContactsAsync({
      name: query,
      pageSize: limit,
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Company],
    });

    const contacts = response.data.map((contact) => ({
      id: contact.id,
      name:
        contact.name ??
        ([contact.firstName, contact.middleName, contact.lastName]
          .filter(Boolean)
          .join(" ") ||
          "Unnamed contact"),
      company: contact.company ?? null,
      phoneNumbers: (contact.phoneNumbers ?? [])
        .map((phoneNumber) => phoneNumber.number)
        .filter((value): value is string => Boolean(value)),
      emails: (contact.emails ?? [])
        .map((email) => email.email)
        .filter((value): value is string => Boolean(value)),
    }));

    return {
      query,
      total: contacts.length,
      contacts,
    };
  },
  get_upcoming_events: async ({ days = 7, limit = 10 }) => {
    await ensureCalendarAccess();

    const startDate = new Date();
    const endDate = new Date(startDate);

    endDate.setDate(endDate.getDate() + days);

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarLookup = new Map(
      calendars.map((calendar) => [calendar.id, calendar.title])
    );
    const visibleCalendarIds = calendars
      .filter((calendar) => calendar.isVisible !== false)
      .map((calendar) => calendar.id);

    const events = visibleCalendarIds.length
      ? await Calendar.getEventsAsync(visibleCalendarIds, startDate, endDate)
      : [];

    const normalizedEvents = events
      .map((event) => {
        const eventStartDate = toDateValue(event.startDate);
        const eventEndDate = toDateValue(event.endDate);

        if (!eventStartDate || !eventEndDate) {
          return undefined;
        }

        return {
          id: event.id,
          title: event.title,
          startDate: toIsoString(eventStartDate),
          endDate: toIsoString(eventEndDate),
          location: event.location ?? null,
          isAllDay: event.allDay,
          calendarTitle: calendarLookup.get(event.calendarId) ?? "Unknown calendar",
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort(
        (left, right) =>
          new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
      )
      .slice(0, limit);

    return {
      days,
      total: normalizedEvents.length,
      rangeStart: toIsoString(startDate),
      rangeEnd: toIsoString(endDate),
      events: normalizedEvents,
    };
  },
  get_current_location: async ({ includeAddress = true }) => {
    await ensureForegroundLocationAccess();

    const position = await Location.getCurrentPositionAsync();
    const { coords } = position;
    const geocodedAddress = includeAddress
      ? (await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }))[0]
      : undefined;

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
      address: geocodedAddress
        ? {
            name: geocodedAddress.name,
            city: geocodedAddress.city,
            region: geocodedAddress.region,
            country: geocodedAddress.country,
            postalCode: geocodedAddress.postalCode,
            formattedAddress: geocodedAddress.formattedAddress,
          }
        : null,
    };
  },
};

export async function executeMobileTool(toolName: MobileToolName, input: any) {
  try {
    return await mobileToolExecutors[toolName](input);
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}
