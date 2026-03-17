import { z } from "zod";

import {
  formatDateTime,
  formatFallbackError,
  minutesToReadableDuration,
} from "@/features/chat/tools/presentation";
import {
  createDefaultMapError,
  createManifestAvailability,
} from "@/features/chat/tools/manifests/shared";
import type { ToolManifest } from "@/features/chat/tools/types";

const getRecentSleepInputSchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(7)
    .describe("How many past days of sleep data to inspect"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(30)
    .describe("Maximum number of sleep samples to return"),
});

const getRecentSleepOutputSchema = z.object({
  days: z.number(),
  sampleCount: z.number(),
  totalSleepMinutes: z.number(),
  entries: z.array(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      durationMinutes: z.number(),
      stage: z.string(),
    })
  ),
});

const getTodayStepsInputSchema = z.object({});

const getTodayStepsOutputSchema = z.object({
  date: z.string(),
  steps: z.number(),
  unit: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

const searchContactsInputSchema = z.object({
  query: z.string().min(1).describe("Name fragment to search in contacts"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum number of matching contacts to return"),
});

const searchContactsOutputSchema = z.object({
  query: z.string(),
  total: z.number(),
  contacts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      company: z.string().nullable(),
      phoneNumbers: z.array(z.string()),
      emails: z.array(z.string()),
    })
  ),
});

const getUpcomingEventsInputSchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(7)
    .describe("How many upcoming days of calendar events to inspect"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10)
    .describe("Maximum number of upcoming events to return"),
});

const getUpcomingEventsOutputSchema = z.object({
  days: z.number(),
  total: z.number(),
  rangeStart: z.string(),
  rangeEnd: z.string(),
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      location: z.string().nullable(),
      isAllDay: z.boolean(),
      calendarTitle: z.string(),
    })
  ),
});

const listWritableCalendarsInputSchema = z.object({
  includeHidden: z
    .boolean()
    .default(false)
    .describe(
      "Whether to include writable calendars that are currently hidden in the system calendar UI"
    ),
});

const listWritableCalendarsOutputSchema = z.object({
  total: z.number(),
  calendars: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      sourceName: z.string().nullable(),
      ownerAccount: z.string().nullable(),
      isPrimary: z.boolean(),
      isVisible: z.boolean(),
    })
  ),
});

const createCalendarEventInputSchema = z.object({
  title: z.string().min(1).describe("Title for the new calendar event"),
  startDate: z
    .string()
    .describe("ISO 8601 start date and time for the event"),
  endDate: z.string().describe("ISO 8601 end date and time for the event"),
  location: z
    .string()
    .optional()
    .describe("Optional event location to save with the calendar event"),
  notes: z
    .string()
    .optional()
    .describe("Optional event notes or description"),
  allDay: z
    .boolean()
    .default(false)
    .describe("Whether the event should be created as an all-day event"),
  calendarId: z
    .string()
    .optional()
    .describe(
      "Optional target calendar ID. Omit this to use the default writable calendar."
    ),
});

const createCalendarEventOutputSchema = z.object({
  status: z.literal("created"),
  eventId: z.string(),
  calendarId: z.string(),
  calendarTitle: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  isAllDay: z.boolean(),
});

const openExternalUrlInputSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      "The exact external URL, universal link, or deep link to open. It must include an explicit scheme such as https:, maps:, tel:, mailto:, or an app-specific custom scheme."
    ),
  label: z
    .string()
    .optional()
    .describe("Short human-readable label for the action being opened"),
  appName: z
    .string()
    .optional()
    .describe("Optional target app name such as Apple Maps, AMap, or DiDi"),
  intent: z
    .string()
    .optional()
    .describe(
      "Short description of why this URL is being opened, such as navigate, ride_hailing, or open_web_page"
    ),
  fallbackUrl: z
    .string()
    .optional()
    .describe(
      "Optional fallback URL to try if the primary deep link cannot be opened"
    ),
});

const openExternalUrlOutputSchema = z.object({
  status: z.enum(["opened", "fallback-opened"]),
  requestedUrl: z.string(),
  openedUrl: z.string(),
  label: z.string().nullable(),
  appName: z.string().nullable(),
  intent: z.string().nullable(),
  usedFallback: z.boolean(),
});

const getCurrentLocationInputSchema = z.object({
  includeAddress: z
    .boolean()
    .default(true)
    .describe("Whether to include reverse geocoded address details"),
});

const getCurrentLocationOutputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  timestamp: z.string(),
  address: z
    .object({
      name: z.string().nullable(),
      city: z.string().nullable(),
      region: z.string().nullable(),
      country: z.string().nullable(),
      postalCode: z.string().nullable(),
      formattedAddress: z.string().nullable(),
    })
    .nullable(),
});

const defaultMapError = createDefaultMapError();

export const mobileToolDefinitions = {
  get_recent_sleep: {
    name: "get_recent_sleep",
    label: "Recent Sleep",
    description:
      "Get the user's recent Apple Health sleep samples. Use this when the user asks about recent sleep, sleep stages, or sleep duration.",
    runtime: "mobile",
    domain: "health",
    platforms: ["ios"],
    approvalMode: "auto",
    permissions: ["healthkit.read.sleep"],
    riskLevel: "low",
    whenToUse:
      "Use when the user asks about recent sleep duration or sleep stages.",
    whenNotToUse:
      "Do not use when the user is asking for general wellness advice instead of device data.",
    availability: createManifestAvailability({
      platforms: ["ios"],
      capability: "healthkit",
      requiresMobileExecution: true,
    }),
    inputSchema: getRecentSleepInputSchema,
    outputSchema: getRecentSleepOutputSchema,
    presentation: {
      formatInput: ({ days, limit }) =>
        [`Days checked: ${days}`, `Sample limit: ${limit}`].join("\n"),
      formatOutput: (output) =>
        [
          `Days checked: ${output.days}`,
          `Sleep entries: ${output.sampleCount}`,
          `Total sleep: ${minutesToReadableDuration(output.totalSleepMinutes)}`,
          ...(output.entries ?? [])
            .slice(0, 5)
            .map(
              (entry: any) =>
                `- ${entry.stage}: ${minutesToReadableDuration(entry.durationMinutes)} (${formatDateTime(entry.startDate)})`
            ),
        ].join("\n"),
      formatApproval: ({ days }) =>
        `Approval is not required before reading sleep data for the last ${days} day(s).`,
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  get_today_steps: {
    name: "get_today_steps",
    label: "Today's Steps",
    description:
      "Get the user's total Apple Health step count for today.",
    runtime: "mobile",
    domain: "health",
    platforms: ["ios"],
    approvalMode: "auto",
    permissions: ["healthkit.read.steps"],
    riskLevel: "low",
    whenToUse: "Use when the user asks for today's step count.",
    whenNotToUse:
      "Do not use when the user wants a multi-day trend instead of today's total.",
    availability: createManifestAvailability({
      platforms: ["ios"],
      capability: "healthkit",
      requiresMobileExecution: true,
    }),
    inputSchema: getTodayStepsInputSchema,
    outputSchema: getTodayStepsOutputSchema,
    presentation: {
      formatInput: () => "Today",
      formatOutput: ({ date, steps, unit }) =>
        [`Date: ${date}`, `Steps: ${steps} ${unit}`].join("\n"),
      formatApproval: () =>
        "Approval is not required before reading today's steps.",
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  search_contacts: {
    name: "search_contacts",
    label: "Search Contacts",
    description:
      "Search the user's contacts by name and return a compact list of matching contacts. Use this when the user mentions a person by name and wants contact details from the device.",
    runtime: "mobile",
    domain: "contacts",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    permissions: ["contacts.read"],
    riskLevel: "medium",
    whenToUse:
      "Use when the user wants contact information from the device address book.",
    whenNotToUse:
      "Do not use when the user only mentions a person conversationally without asking for contact details.",
    availability: createManifestAvailability({
      platforms: ["ios", "android"],
      capability: "contacts",
      requiresMobileExecution: true,
    }),
    inputSchema: searchContactsInputSchema,
    outputSchema: searchContactsOutputSchema,
    inputExamples: [
      { input: { query: "Alex", limit: 5 } },
      { input: { query: "Mom", limit: 3 } },
    ],
    presentation: {
      formatInput: ({ query, limit }) =>
        [`Query: ${query}`, `Limit: ${limit}`].join("\n"),
      formatOutput: (output) =>
        [
          `Query: ${output.query}`,
          `Matches: ${output.total}`,
          ...(output.contacts ?? []).map((contact: any) => {
            const phone = contact.phoneNumbers?.[0]
              ? ` | ${contact.phoneNumbers[0]}`
              : "";
            const email = contact.emails?.[0] ? ` | ${contact.emails[0]}` : "";
            const company = contact.company ? ` (${contact.company})` : "";

            return `- ${contact.name}${company}${phone}${email}`;
          }),
        ].join("\n"),
      formatApproval: ({ query }) =>
        `Approval is not required before searching contacts for ${query}.`,
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  get_upcoming_events: {
    name: "get_upcoming_events",
    label: "Upcoming Events",
    description:
      "Get the user's upcoming calendar events for the next few days. Use this when the user asks what is on their calendar, what meetings are coming up, or whether they are free soon.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    permissions: ["calendar.read"],
    riskLevel: "medium",
    whenToUse:
      "Use when the user asks about upcoming calendar events or free time.",
    whenNotToUse:
      "Do not use when the user wants to create or edit an event.",
    availability: createManifestAvailability({
      platforms: ["ios", "android"],
      capability: "calendar",
      requiresMobileExecution: true,
    }),
    inputSchema: getUpcomingEventsInputSchema,
    outputSchema: getUpcomingEventsOutputSchema,
    inputExamples: [
      { input: { days: 3, limit: 10 } },
      { input: { days: 7, limit: 5 } },
    ],
    presentation: {
      formatInput: ({ days, limit }) =>
        [`Days ahead: ${days}`, `Limit: ${limit}`].join("\n"),
      formatOutput: (output) =>
        [
          `Window: ${formatDateTime(output.rangeStart)} -> ${formatDateTime(output.rangeEnd)}`,
          `Events: ${output.total}`,
          ...(output.events ?? []).map(
            (event: any) =>
              `- ${event.title} | ${formatDateTime(event.startDate)} | ${event.calendarTitle}${event.location ? ` | ${event.location}` : ""}`
          ),
        ].join("\n"),
      formatApproval: ({ days }) =>
        `Approval is not required before reading the next ${days} day(s) of calendar events.`,
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  list_writable_calendars: {
    name: "list_writable_calendars",
    label: "List Writable Calendars",
    description:
      "List the user's writable event calendars. Use this before creating a calendar event when the user mentions a specific calendar such as work or personal, or when you need to know which calendars can actually accept new events.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    permissions: ["calendar.read"],
    riskLevel: "low",
    whenToUse:
      "Use before event creation when the target calendar is ambiguous or named explicitly.",
    whenNotToUse:
      "Do not use when the default writable calendar is acceptable and no selection is needed.",
    availability: createManifestAvailability({
      platforms: ["ios", "android"],
      capability: "calendar",
      requiresMobileExecution: true,
    }),
    inputSchema: listWritableCalendarsInputSchema,
    outputSchema: listWritableCalendarsOutputSchema,
    inputExamples: [{ input: {} }, { input: { includeHidden: true } }],
    presentation: {
      formatInput: ({ includeHidden }) =>
        `Include hidden: ${includeHidden ? "yes" : "no"}`,
      formatOutput: (output) =>
        [
          `Writable calendars: ${output.total}`,
          ...(output.calendars ?? []).map((calendar: any) => {
            const details = [
              calendar.sourceName,
              calendar.ownerAccount,
              calendar.isPrimary ? "primary" : null,
              calendar.isVisible ? null : "hidden",
            ]
              .filter(Boolean)
              .join(" | ");

            return details
              ? `- ${calendar.title} | ${details}`
              : `- ${calendar.title}`;
          }),
        ].join("\n"),
      formatApproval: () =>
        "Approval is not required before listing writable calendars.",
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  create_calendar_event: {
    name: "create_calendar_event",
    label: "Create Calendar Event",
    description:
      "Create a new calendar event on the user's device after they explicitly approve it. Only use this when the user clearly wants to add something to their calendar and you already know the event title, start time, and end time as concrete ISO datetimes. If any of those are missing or ambiguous, ask follow-up questions first instead of guessing.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "confirm",
    permissions: ["calendar.write"],
    riskLevel: "high",
    whenToUse:
      "Use only when the user clearly wants to create an event and the structured event data is complete.",
    whenNotToUse:
      "Do not use when title or times are ambiguous or missing.",
    availability: createManifestAvailability({
      platforms: ["ios", "android"],
      capability: "calendar",
      requiresMobileExecution: true,
    }),
    inputSchema: createCalendarEventInputSchema,
    outputSchema: createCalendarEventOutputSchema,
    inputExamples: [
      {
        input: {
          title: "Dentist appointment",
          startDate: "2026-03-07T09:00:00+08:00",
          endDate: "2026-03-07T10:00:00+08:00",
          location: "Central Clinic",
          notes: "Bring insurance card",
          allDay: false,
        },
      },
      {
        input: {
          title: "Project kickoff",
          startDate: "2026-03-08T14:00:00+08:00",
          endDate: "2026-03-08T15:00:00+08:00",
          allDay: false,
        },
      },
    ],
    presentation: {
      formatInput: (input) =>
        [
          `Title: ${input.title}`,
          `Starts: ${formatDateTime(input.startDate)}`,
          `Ends: ${formatDateTime(input.endDate)}`,
          `All day: ${input.allDay ? "yes" : "no"}`,
          input.location ? `Location: ${input.location}` : null,
          input.notes ? `Notes: ${input.notes}` : null,
          input.calendarId
            ? `Calendar ID: ${input.calendarId}`
            : "Calendar: default writable calendar",
        ]
          .filter(Boolean)
          .join("\n"),
      formatOutput: (output) =>
        [
          `Status: ${output.status}`,
          `Calendar: ${output.calendarTitle}`,
          `Title: ${output.title}`,
          `Starts: ${formatDateTime(output.startDate)}`,
          `Ends: ${formatDateTime(output.endDate)}`,
          output.location ? `Location: ${output.location}` : null,
          output.notes ? `Notes: ${output.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      formatApproval: (input) =>
        [
          "Approval required before creating the calendar event.",
          `Title: ${input.title}`,
          `Starts: ${formatDateTime(input.startDate)}`,
          `Ends: ${formatDateTime(input.endDate)}`,
        ].join("\n"),
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
    requiresFollowUp: true,
  },
  open_external_url: {
    name: "open_external_url",
    label: "Open External URL",
    description:
      "Open an external app link, universal link, or web URL on the user's device after explicit confirmation. Use this only when the user clearly wants to leave the app or hand work off to another app such as maps, browser, phone, email, or ride-hailing. Prefer a fallback URL when the primary link depends on a specific app.",
    runtime: "mobile",
    domain: "external",
    platforms: ["ios", "android", "web"],
    approvalMode: "confirm",
    permissions: ["linking.open"],
    riskLevel: "high",
    whenToUse:
      "Use when the user explicitly wants to open another app or URL.",
    whenNotToUse:
      "Do not use when the user only wants information inside the current app.",
    availability: createManifestAvailability({
      platforms: ["ios", "android", "web"],
      capability: "externalLinking",
      requiresMobileExecution: false,
    }),
    inputSchema: openExternalUrlInputSchema,
    outputSchema: openExternalUrlOutputSchema,
    inputExamples: [
      {
        input: {
          url: "https://maps.apple.com/?q=Shanghai%20Hongqiao%20Station",
          label: "Open map search",
          appName: "Apple Maps",
          intent: "search_place",
        },
      },
      {
        input: {
          url: "myapp://open?destination=airport",
          fallbackUrl: "https://example.com/open?destination=airport",
          label: "Open app deep link",
          appName: "Example App",
          intent: "handoff_to_external_app",
        },
      },
    ],
    presentation: {
      formatInput: (input) =>
        [
          input.label ? `Label: ${input.label}` : null,
          input.appName ? `App: ${input.appName}` : null,
          input.intent ? `Intent: ${input.intent}` : null,
          `URL: ${input.url}`,
          input.fallbackUrl ? `Fallback: ${input.fallbackUrl}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      formatOutput: (output) =>
        [
          `Status: ${output.status}`,
          output.appName ? `App: ${output.appName}` : null,
          output.intent ? `Intent: ${output.intent}` : null,
          output.label ? `Label: ${output.label}` : null,
          `Opened: ${output.openedUrl}`,
          output.usedFallback ? `Requested: ${output.requestedUrl}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      formatApproval: (input) =>
        [
          "Approval required before opening the external app.",
          input.label ? `Label: ${input.label}` : null,
          input.appName ? `App: ${input.appName}` : null,
          `URL: ${input.url}`,
        ]
          .filter(Boolean)
          .join("\n"),
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  get_current_location: {
    name: "get_current_location",
    label: "Current Location",
    description:
      "Get the user's current location and optionally a reverse geocoded address.",
    runtime: "mobile",
    domain: "location",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    permissions: ["location.read"],
    riskLevel: "medium",
    whenToUse: "Use when the user asks for their current location.",
    whenNotToUse:
      "Do not use when a previously known location is sufficient.",
    availability: createManifestAvailability({
      platforms: ["ios", "android"],
      capability: "location",
      requiresMobileExecution: true,
    }),
    inputSchema: getCurrentLocationInputSchema,
    outputSchema: getCurrentLocationOutputSchema,
    presentation: {
      formatInput: ({ includeAddress }) =>
        `Include address: ${includeAddress ? "yes" : "no"}`,
      formatOutput: (output) =>
        [
          `Coordinates: ${output.latitude}, ${output.longitude}`,
          `Accuracy: ${output.accuracy ?? "unknown"}`,
          output.address?.formattedAddress
            ? `Address: ${output.address.formattedAddress}`
            : output.address
              ? `Address: ${[
                  output.address.name,
                  output.address.city,
                  output.address.region,
                  output.address.country,
                ]
                  .filter(Boolean)
                  .join(", ")}`
              : "Address: unavailable",
        ].join("\n"),
      formatApproval: () =>
        "Approval is not required before reading the current location.",
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
} satisfies Record<string, ToolManifest>;

export type MobileToolName = keyof typeof mobileToolDefinitions;

export function getMobileToolManifest(toolName: string) {
  return (mobileToolDefinitions as Record<string, ToolManifest | undefined>)[
    toolName
  ];
}

export const mobileToolNames = Object.keys(
  mobileToolDefinitions
) as MobileToolName[];
