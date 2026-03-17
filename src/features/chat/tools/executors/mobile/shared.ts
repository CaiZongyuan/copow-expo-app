import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import { Platform } from "react-native";
import type { ObjectTypeIdentifier } from "@kingstinct/react-native-healthkit";
import {
  isHealthDataAvailableAsync,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";

export type MobileToolExecutor = (input: any) => Promise<unknown>;

export type WritableEventCalendar = Calendar.Calendar & {
  allowsModifications: true;
};

export function toIsoString(value: Date) {
  return value.toISOString();
}

export function startOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

export function toDateValue(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

export function parseRequiredDate(value: string, fieldName: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Calendar event ${fieldName} must be a valid ISO date string.`);
  }

  return parsed;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown mobile tool error.";
}

export async function ensureHealthkitAccess(
  objectTypes: readonly ObjectTypeIdentifier[]
) {
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

export async function ensureContactsAccess() {
  const permission = await Contacts.requestPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Contacts permission was not granted.");
  }
}

export async function ensureCalendarAccess() {
  const permission = await Calendar.requestCalendarPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Calendar permission was not granted.");
  }
}

export function isWritableEventCalendar(
  calendar: Calendar.Calendar
): calendar is WritableEventCalendar {
  return calendar.entityType === Calendar.EntityTypes.EVENT && calendar.allowsModifications;
}

export function normalizeWritableCalendar(calendar: WritableEventCalendar) {
  return {
    id: calendar.id,
    title: calendar.title,
    sourceName: calendar.source?.name ?? null,
    ownerAccount: calendar.ownerAccount ?? null,
    isPrimary: calendar.isPrimary === true,
    isVisible: calendar.isVisible !== false,
  };
}

export async function listWritableEventCalendars(includeHidden = false) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  return calendars
    .filter(isWritableEventCalendar)
    .filter((calendar) => includeHidden || calendar.isVisible !== false)
    .map(normalizeWritableCalendar)
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      if (left.isVisible !== right.isVisible) {
        return left.isVisible ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function getWritableEventCalendar(preferredCalendarId?: string) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writableCalendars = calendars.filter(isWritableEventCalendar);

  if (preferredCalendarId) {
    const preferredCalendar = writableCalendars.find(
      (calendar) => calendar.id === preferredCalendarId
    );

    if (!preferredCalendar) {
      throw new Error(
        "The requested calendar could not be found or does not allow event creation."
      );
    }

    return preferredCalendar;
  }

  if (Platform.OS === "ios") {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();

      if (defaultCalendar && isWritableEventCalendar(defaultCalendar)) {
        return defaultCalendar;
      }
    } catch {
      // Fall back to the writable calendar list below.
    }
  }

  const fallbackCalendar =
    writableCalendars.find(
      (calendar) => calendar.isPrimary || calendar.isVisible !== false
    ) ??
    writableCalendars.find((calendar) => calendar.isVisible !== false) ??
    writableCalendars[0];

  if (!fallbackCalendar) {
    throw new Error("No writable event calendar is available on this device.");
  }

  return fallbackCalendar;
}

export async function ensureForegroundLocationAccess() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location permission was not granted.");
  }
}
