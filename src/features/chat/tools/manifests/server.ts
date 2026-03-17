import { z } from "zod";

import {
  formatFallbackError,
} from "@/features/chat/tools/presentation";
import {
  available,
  createDefaultMapError,
} from "@/features/chat/tools/manifests/shared";
import type { ToolManifest } from "@/features/chat/tools/types";

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

const defaultMapError = createDefaultMapError();

export const serverToolDefinitions = {
  get_current_time: {
    name: "get_current_time",
    label: "Current Time",
    description:
      "Get the current time. Use this whenever the user asks about now, today, the current date, the current time, or when you need a concrete time reference before planning calendar actions.",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    permissions: [],
    riskLevel: "low",
    whenToUse:
      "Use when the user asks about now, today, the current date, or a precise time reference.",
    whenNotToUse:
      "Do not use when a stable historical date is already given explicitly.",
    availability: () => available(),
    inputSchema: getCurrentTimeInputSchema,
    outputSchema: getCurrentTimeOutputSchema,
    inputExamples: [
      { input: {} },
      { input: { timeZone: "America/Los_Angeles" } },
    ],
    execute: async ({ timeZone }: { timeZone?: string }) => {
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
      const offsetMatch = offsetValue.match(
        /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/
      );
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
    presentation: {
      formatInput: ({ timeZone }) =>
        timeZone ? `Timezone: ${timeZone}` : "Timezone: server default",
      formatOutput: (output) =>
        [
          `Date: ${output.date}`,
          `Time: ${output.time}`,
          `Timezone: ${output.timeZone}`,
          `ISO: ${output.nowIso}`,
        ].join("\n"),
      formatApproval: () => "Approval is not required for this tool.",
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  weather: {
    name: "weather",
    label: "Weather",
    description: "Get the weather in a location (fahrenheit).",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    permissions: [],
    riskLevel: "low",
    whenToUse: "Use when the user asks for a quick weather lookup.",
    whenNotToUse:
      "Do not use for exact real-world forecasts because this is only a demo tool.",
    availability: () => available(),
    inputSchema: weatherInputSchema,
    outputSchema: weatherOutputSchema,
    execute: async ({ location }: { location: string }) => ({
      location,
      temperature: Math.round(Math.random() * (90 - 32) + 32),
    }),
    presentation: {
      formatInput: ({ location }) => `Location: ${location}`,
      formatOutput: (output) =>
        [`Location: ${output.location}`, `Temperature: ${output.temperature}F`].join(
          "\n"
        ),
      formatApproval: ({ location }) =>
        `Approval is not required to look up weather for ${location}.`,
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
  convertFahrenheitToCelsius: {
    name: "convertFahrenheitToCelsius",
    label: "Temperature Converter",
    description: "Convert a temperature in fahrenheit to celsius.",
    runtime: "server",
    domain: "utility",
    platforms: ["ios", "android", "web"],
    approvalMode: "auto",
    permissions: [],
    riskLevel: "low",
    whenToUse: "Use when a fahrenheit temperature should be converted to celsius.",
    whenNotToUse:
      "Do not use when the user already gave the temperature in celsius.",
    availability: () => available(),
    inputSchema: convertTemperatureInputSchema,
    outputSchema: convertTemperatureOutputSchema,
    execute: async ({ temperature }: { temperature: number }) => ({
      celsius: Math.round((temperature - 32) * (5 / 9)),
    }),
    presentation: {
      formatInput: ({ temperature }) => `Temperature: ${temperature}F`,
      formatOutput: ({ celsius }) => `Celsius: ${celsius}C`,
      formatApproval: () => "Approval is not required for this tool.",
      formatError: formatFallbackError,
    },
    mapError: defaultMapError,
  },
} satisfies Record<string, ToolManifest>;

export type ServerToolName = keyof typeof serverToolDefinitions;
