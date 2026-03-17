import type { ToolError } from "@/features/chat/tools/types";

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatUnknownValue(value: unknown) {
  if (value == null) {
    return "No data available.";
  }

  if (typeof value === "string") {
    return value;
  }

  return safeJsonStringify(value);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function minutesToReadableDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatFallbackError(error: ToolError | string) {
  if (typeof error === "string") {
    return error;
  }

  return error.suggestedAction
    ? `${error.message} ${error.suggestedAction}`
    : error.message;
}
