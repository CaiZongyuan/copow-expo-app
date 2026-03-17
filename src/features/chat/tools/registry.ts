import {
  buildChatTools,
} from "@/features/chat/tools/builders/build-chat-tools";
import {
  buildToolContext,
} from "@/features/chat/tools/builders/build-tool-context";
import {
  getMobileToolManifest,
  mobileToolDefinitions,
  mobileToolNames,
  type MobileToolName,
} from "@/features/chat/tools/manifests/mobile";
import { serverToolDefinitions, type ServerToolName } from "@/features/chat/tools/manifests/server";
import { formatUnknownValue } from "@/features/chat/tools/presentation";
import type {
  ChatToolApprovalMode,
  ToolContext,
  ToolContextInput,
  ToolError,
  ToolManifest,
} from "@/features/chat/tools/types";

export type { ChatToolDomain, ToolContext, ToolManifest } from "@/features/chat/tools/types";
export { buildChatTools, buildToolContext };

export type ChatToolName = MobileToolName | ServerToolName;

export const chatToolDefinitions = {
  ...serverToolDefinitions,
  ...mobileToolDefinitions,
} satisfies Record<string, ToolManifest>;

const mobileToolNameSet = new Set<string>(mobileToolNames);

export function isMobileToolName(toolName: string): toolName is MobileToolName {
  return mobileToolNameSet.has(toolName);
}

export function getToolManifest(toolName: string) {
  return (chatToolDefinitions as Record<string, ToolManifest | undefined>)[toolName];
}

export function getToolLabel(toolName: string | undefined) {
  if (!toolName) {
    return "Tool";
  }

  return getToolManifest(toolName)?.label ?? toolName;
}

export function getToolApprovalMode(
  toolName: string
): ChatToolApprovalMode | undefined {
  return getToolManifest(toolName)?.approvalMode;
}

export function toolRequiresConfirmation(toolName: string) {
  return getToolApprovalMode(toolName) === "confirm";
}

export function formatToolInput(toolName: string | undefined, input: unknown) {
  if (!toolName) {
    return formatUnknownValue(input);
  }

  return (
    getToolManifest(toolName)?.presentation.formatInput?.(input as never) ??
    formatUnknownValue(input)
  );
}

export function formatToolOutput(toolName: string | undefined, output: unknown) {
  if (!toolName) {
    return formatUnknownValue(output);
  }

  return (
    getToolManifest(toolName)?.presentation.formatOutput?.(output as never) ??
    formatUnknownValue(output)
  );
}

export function formatToolApproval(toolName: string | undefined, input: unknown) {
  if (!toolName) {
    return formatUnknownValue(input);
  }

  return (
    getToolManifest(toolName)?.presentation.formatApproval?.(input as never) ??
    formatToolInput(toolName, input)
  );
}

export function formatToolError(toolName: string | undefined, error: ToolError | string) {
  if (!toolName) {
    return typeof error === "string" ? error : error.message;
  }

  return (
    getToolManifest(toolName)?.presentation.formatError?.(error) ??
    (typeof error === "string" ? error : error.message)
  );
}

export function getMobileToolContext(input: ToolContextInput = {}): ToolContext {
  return buildToolContext(input);
}

export { getMobileToolManifest };
