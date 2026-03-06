import { tool } from "ai";
import { z } from "zod";

type ChatToolRuntime = "server" | "mobile";
type ChatToolDomain =
  | "utility"
  | "health"
  | "contacts"
  | "calendar"
  | "location"
  | "external";
type ChatToolPlatform = "ios" | "android" | "web";
export type ChatToolApprovalMode = "auto" | "confirm";

type ChatToolExecute = (input: any) => Promise<unknown>;
type ChatToolInputExample = {
  input: Record<string, unknown>;
};

type ChatToolDefinition = {
  label: string;
  description: string;
  runtime: ChatToolRuntime;
  domain: ChatToolDomain;
  platforms: readonly ChatToolPlatform[];
  approvalMode: ChatToolApprovalMode;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  inputExamples?: ChatToolInputExample[];
  execute?: ChatToolExecute;
};

const weatherInputSchema = z.object({
  location: z.string().describe("The location to get the weather for"),
});

const weatherOutputSchema = z.object({
  location: z.string(),
  temperature: z.number(),
});

const convertTemperatureInputSchema = z.object({
  temperature: z
    .number()
    .describe("The temperature in fahrenheit to convert"),
});

const convertTemperatureOutputSchema = z.object({
  celsius: z.number(),
});

const getCurrentTimeInputSchema = z.object({
  timeZone: z
    .string()
    .optional()
    .describe(
      "Optional IANA timezone like Asia/Shanghai or America/Los_Angeles. Leave empty to use the server timezone."
    ),
});

const getCurrentTimeOutputSchema = z.object({
  nowIso: z.string(),
  date: z.string(),
  time: z.string(),
  timeZone: z.string(),
  utcOffsetMinutes: z.number(),
  unixMs: z.number(),
});

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

export const serverToolDefinitions = {
  get_current_time: {
    label: "Current Time",
    description:
      "Get the current time. Use this whenever the user asks about now, today, the current date, the current time, or when you need a concrete time reference before planning calendar actions.",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    inputSchema: getCurrentTimeInputSchema,
    outputSchema: getCurrentTimeOutputSchema,
    inputExamples: [
      { input: {} },
      { input: { timeZone: "America/Los_Angeles" } },
    ],
    execute: async ({ timeZone }) => {
      const now = new Date();
      const resolvedTimeZone =
        timeZone && timeZone.trim().length > 0
          ? timeZone.trim()
          : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: resolvedTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const readPart = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "00";

      const year = readPart("year");
      const month = readPart("month");
      const day = readPart("day");
      const hour = readPart("hour");
      const minute = readPart("minute");
      const second = readPart("second");

      const offsetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: resolvedTimeZone,
        timeZoneName: "shortOffset",
        hour: "2-digit",
      });
      const offsetValue =
        offsetFormatter
          .formatToParts(now)
          .find((part) => part.type === "timeZoneName")
          ?.value ?? "GMT+0";
      const offsetMatch = offsetValue.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
      const utcOffsetMinutes = offsetMatch
        ? (offsetMatch[1] === "+" ? 1 : -1) *
          (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] ?? "0"))
        : 0;

      return {
        nowIso: now.toISOString(),
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}:${second}`,
        timeZone: resolvedTimeZone,
        utcOffsetMinutes,
        unixMs: now.getTime(),
      };
    },
  },
  weather: {
    label: "Weather",
    description: "Get the weather in a location (fahrenheit)",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    inputSchema: weatherInputSchema,
    outputSchema: weatherOutputSchema,
    execute: async ({ location }) => {
      const temperature = Math.round(Math.random() * (90 - 32) + 32);

      return {
        location,
        temperature,
      };
    },
  },
  convertFahrenheitToCelsius: {
    label: "Temperature Converter",
    description: "Convert a temperature in fahrenheit to celsius",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    inputSchema: convertTemperatureInputSchema,
    outputSchema: convertTemperatureOutputSchema,
    execute: async ({ temperature }) => {
      const celsius = Math.round((temperature - 32) * (5 / 9));

      return {
        celsius,
      };
    },
  },
} satisfies Record<string, ChatToolDefinition>;

export const mobileToolDefinitions = {
  get_recent_sleep: {
    label: "Recent Sleep",
    description:
      "Get the user's recent Apple Health sleep samples. Use this when the user asks about recent sleep, sleep stages, or sleep duration.",
    runtime: "mobile",
    domain: "health",
    platforms: ["ios"],
    approvalMode: "auto",
    inputSchema: getRecentSleepInputSchema,
    outputSchema: getRecentSleepOutputSchema,
  },
  get_today_steps: {
    label: "Today's Steps",
    description:
      "Get the user's total Apple Health step count for today.",
    runtime: "mobile",
    domain: "health",
    platforms: ["ios"],
    approvalMode: "auto",
    inputSchema: getTodayStepsInputSchema,
    outputSchema: getTodayStepsOutputSchema,
  },
  search_contacts: {
    label: "Search Contacts",
    description:
      "Search the user's contacts by name and return a compact list of matching contacts. Use this when the user mentions a person by name and wants contact details from the device.",
    runtime: "mobile",
    domain: "contacts",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: searchContactsInputSchema,
    outputSchema: searchContactsOutputSchema,
    inputExamples: [
      { input: { query: "Alex", limit: 5 } },
      { input: { query: "Mom", limit: 3 } },
    ],
  },
  get_upcoming_events: {
    label: "Upcoming Events",
    description:
      "Get the user's upcoming calendar events for the next few days. Use this when the user asks what is on their calendar, what meetings are coming up, or whether they are free soon.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: getUpcomingEventsInputSchema,
    outputSchema: getUpcomingEventsOutputSchema,
    inputExamples: [
      { input: { days: 3, limit: 10 } },
      { input: { days: 7, limit: 5 } },
    ],
  },
  list_writable_calendars: {
    label: "List Writable Calendars",
    description:
      "List the user's writable event calendars. Use this before creating a calendar event when the user mentions a specific calendar such as work or personal, or when you need to know which calendars can actually accept new events.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: listWritableCalendarsInputSchema,
    outputSchema: listWritableCalendarsOutputSchema,
    inputExamples: [{ input: {} }, { input: { includeHidden: true } }],
  },
  create_calendar_event: {
    label: "Create Calendar Event",
    description:
      "Create a new calendar event on the user's device after they explicitly approve it. Only use this when the user clearly wants to add something to their calendar and you already know the event title, start time, and end time as concrete ISO datetimes. If any of those are missing or ambiguous, ask follow-up questions first instead of guessing.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "confirm",
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
  },
  open_external_url: {
    label: "Open External URL",
    description:
      "Open an external app link, universal link, or web URL on the user's device after explicit confirmation. Use this only when the user clearly wants to leave the app or hand work off to another app such as maps, browser, phone, email, or ride-hailing. Prefer a fallback URL when the primary link depends on a specific app.",
    runtime: "mobile",
    domain: "external",
    platforms: ["ios", "android", "web"],
    approvalMode: "confirm",
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
  },
  get_current_location: {
    label: "Current Location",
    description:
      "Get the user's current location and optionally a reverse geocoded address.",
    runtime: "mobile",
    domain: "location",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: getCurrentLocationInputSchema,
    outputSchema: getCurrentLocationOutputSchema,
  },
} satisfies Record<string, ChatToolDefinition>;

export type MobileToolName = keyof typeof mobileToolDefinitions;
export type ServerToolName = keyof typeof serverToolDefinitions;
export type ChatToolName = MobileToolName | ServerToolName;

export const chatToolDefinitions = {
  ...serverToolDefinitions,
  ...mobileToolDefinitions,
} satisfies Record<string, ChatToolDefinition>;

function createAiTool(definition: ChatToolDefinition) {
  if (definition.execute) {
    return tool({
      title: definition.label,
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
      inputExamples: definition.inputExamples,
      execute: definition.execute,
      needsApproval: definition.approvalMode === "confirm",
    });
  }

  return tool({
    title: definition.label,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema ?? z.unknown(),
    inputExamples: definition.inputExamples,
    needsApproval: definition.approvalMode === "confirm",
  });
}

export const chatTools = Object.fromEntries(
  Object.entries(chatToolDefinitions).map(([name, definition]) => [
    name,
    createAiTool(definition),
  ])
);

export const mobileToolNameSet = new Set<string>(
  Object.keys(mobileToolDefinitions)
);

export function isMobileToolName(toolName: string): toolName is MobileToolName {
  return mobileToolNameSet.has(toolName);
}

export function getToolApprovalMode(
  toolName: string
): ChatToolApprovalMode | undefined {
  return (chatToolDefinitions as Record<string, ChatToolDefinition | undefined>)[
    toolName
  ]?.approvalMode;
}

export function toolRequiresConfirmation(toolName: string) {
  return getToolApprovalMode(toolName) === "confirm";
}

export const toolLabels = Object.fromEntries(
  Object.entries(chatToolDefinitions).map(([name, definition]) => [
    name,
    definition.label,
  ])
) as Record<ChatToolName, string>;
