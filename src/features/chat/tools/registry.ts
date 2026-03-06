import { tool } from "ai";
import { z } from "zod";

type ChatToolRuntime = "server" | "mobile";
type ChatToolDomain = "utility" | "health" | "contacts" | "calendar" | "location";
type ChatToolPlatform = "ios" | "android" | "web";
type ChatToolApprovalMode = "auto" | "confirm";

type ChatToolExecute = (input: any) => Promise<unknown>;

type ChatToolDefinition = {
  label: string;
  description: string;
  runtime: ChatToolRuntime;
  domain: ChatToolDomain;
  platforms: readonly ChatToolPlatform[];
  approvalMode: ChatToolApprovalMode;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
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
      "Search the user's contacts by name and return a compact list of matching contacts.",
    runtime: "mobile",
    domain: "contacts",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: searchContactsInputSchema,
    outputSchema: searchContactsOutputSchema,
  },
  get_upcoming_events: {
    label: "Upcoming Events",
    description:
      "Get the user's upcoming calendar events for the next few days.",
    runtime: "mobile",
    domain: "calendar",
    platforms: ["ios", "android"],
    approvalMode: "auto",
    inputSchema: getUpcomingEventsInputSchema,
    outputSchema: getUpcomingEventsOutputSchema,
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
      execute: definition.execute,
      needsApproval: definition.approvalMode === "confirm",
    });
  }

  return tool({
    title: definition.label,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema ?? z.unknown(),
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

export const toolLabels = Object.fromEntries(
  Object.entries(chatToolDefinitions).map(([name, definition]) => [
    name,
    definition.label,
  ])
) as Record<ChatToolName, string>;
