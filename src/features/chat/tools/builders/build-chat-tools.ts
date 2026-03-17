import { tool } from "ai";
import { z } from "zod";

import { mobileToolDefinitions } from "@/features/chat/tools/manifests/mobile";
import { serverToolDefinitions } from "@/features/chat/tools/manifests/server";
import { shouldIncludeManifest } from "@/features/chat/tools/manifests/shared";
import type { ToolContext, ToolManifest } from "@/features/chat/tools/types";

export const allToolManifests = [
  ...Object.values(serverToolDefinitions),
  ...Object.values(mobileToolDefinitions),
] as ToolManifest[];

function createAiTool(manifest: ToolManifest) {
  if (manifest.execute) {
    return tool({
      title: manifest.label,
      description: manifest.description,
      inputSchema: manifest.inputSchema as any,
      outputSchema: manifest.outputSchema as any,
      inputExamples: manifest.inputExamples as any,
      execute: manifest.execute as any,
      needsApproval: manifest.approvalMode === "confirm",
    });
  }

  return tool({
    title: manifest.label,
    description: manifest.description,
    inputSchema: manifest.inputSchema as any,
    outputSchema: (manifest.outputSchema ?? z.unknown()) as any,
    inputExamples: manifest.inputExamples as any,
    needsApproval: manifest.approvalMode === "confirm",
  });
}

export function buildChatTools(context: ToolContext) {
  return Object.fromEntries(
    allToolManifests
      .filter((manifest) => shouldIncludeManifest(manifest, context))
      .map((manifest) => [manifest.name, createAiTool(manifest)])
  );
}
