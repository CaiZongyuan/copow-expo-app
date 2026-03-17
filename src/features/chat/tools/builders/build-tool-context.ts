import type {
  ChatToolDomain,
  ChatToolPlatform,
  ToolContext,
  ToolContextInput,
} from "@/features/chat/tools/types";

const supportedPlatforms = new Set<ChatToolPlatform>(["ios", "android", "web"]);

function normalizePlatform(value?: string | null): ChatToolPlatform {
  if (value && supportedPlatforms.has(value as ChatToolPlatform)) {
    return value as ChatToolPlatform;
  }

  return "web";
}

function normalizeDomainScope(
  value?: ChatToolDomain | ChatToolDomain[] | null
): ChatToolDomain[] | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value : [value];
}

export function buildToolContext(input: ToolContextInput = {}): ToolContext {
  const platform = normalizePlatform(input.platform);

  return {
    platform,
    knownCapabilities: input.knownCapabilities ?? {},
    domainScope: normalizeDomainScope(input.domainScope),
    runtimeAvailability: {
      mobileExecution:
        input.runtimeAvailability?.mobileExecution ??
        (platform === "ios" || platform === "android"),
      externalLinking:
        input.runtimeAvailability?.externalLinking ?? platform !== "web",
    },
    sessionHints: input.sessionHints ?? [],
    debug: input.debug ?? false,
  };
}
