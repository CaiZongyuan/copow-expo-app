import type {
  ChatToolPlatform,
  ToolAvailability,
  ToolCapabilityKey,
  ToolContext,
  ToolError,
  ToolManifest,
} from "@/features/chat/tools/types";
import { formatFallbackError } from "@/features/chat/tools/presentation";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unknown tool error.";
}

export function available(): ToolAvailability {
  return { available: true };
}

export function createDefaultError(
  code: ToolError["code"],
  message: string,
  suggestedAction?: string
): ToolError {
  return {
    code,
    message,
    retryable: code === "execution_failed",
    suggestedAction,
  };
}

export function createDefaultMapError() {
  return (error: unknown): ToolError => {
    const message = errorMessage(error);

    if (message.includes("permission")) {
      return createDefaultError(
        "permission_denied",
        message,
        "Grant the required device permission and try again."
      );
    }

    if (message.includes("only available")) {
      return createDefaultError(
        "unsupported_platform",
        message,
        "Try this tool on a supported platform."
      );
    }

    if (message.includes("not available")) {
      return createDefaultError(
        "capability_unavailable",
        message,
        "Check whether the device capability is enabled."
      );
    }

    if (message.includes("must") || message.includes("invalid")) {
      return createDefaultError("validation_failed", message);
    }

    return createDefaultError("execution_failed", message);
  };
}

export function createManifestAvailability({
  platforms,
  capability,
  requiresMobileExecution = false,
}: {
  platforms: readonly ChatToolPlatform[];
  capability?: ToolCapabilityKey;
  requiresMobileExecution?: boolean;
}) {
  return (context: ToolContext): ToolAvailability => {
    if (!platforms.includes(context.platform)) {
      return {
        available: false,
        reason: "unsupported_platform",
        message: `This tool is not available on ${context.platform}.`,
      };
    }

    if (
      requiresMobileExecution &&
      !context.runtimeAvailability.mobileExecution
    ) {
      return {
        available: false,
        reason: "runtime_unavailable",
        message: "Mobile tool execution is not available in this runtime.",
      };
    }

    if (capability && context.knownCapabilities[capability] === false) {
      return {
        available: false,
        reason: "capability_unavailable",
        message: `The ${capability} capability is not available in the current context.`,
      };
    }

    if (
      capability === "externalLinking" &&
      context.runtimeAvailability.externalLinking === false
    ) {
      return {
        available: false,
        reason: "runtime_unavailable",
        message: "External linking is not available in this runtime.",
      };
    }

    return available();
  };
}

export function shouldIncludeManifest(
  manifest: ToolManifest,
  context: ToolContext
) {
  if (
    !context.debug &&
    context.domainScope &&
    manifest.domain !== "utility" &&
    !context.domainScope.includes(manifest.domain)
  ) {
    return false;
  }

  return manifest.availability(context).available;
}

export function formatManifestError(
  manifest: ToolManifest,
  error: unknown
) {
  const mappedError = manifest.mapError(error);

  return manifest.presentation.formatError
    ? manifest.presentation.formatError(mappedError)
    : formatFallbackError(mappedError);
}
