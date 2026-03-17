import type { z } from "zod";

export type ChatToolRuntime = "server" | "mobile";
export type ChatToolDomain =
  | "utility"
  | "health"
  | "contacts"
  | "calendar"
  | "location"
  | "external";
export type ChatToolPlatform = "ios" | "android" | "web";
export type ChatToolApprovalMode = "auto" | "confirm";
export type ToolRiskLevel = "low" | "medium" | "high";
export type ToolCapabilityKey =
  | "healthkit"
  | "contacts"
  | "calendar"
  | "location"
  | "externalLinking";
export type ToolAvailabilityReason =
  | "unsupported_platform"
  | "permission_missing"
  | "capability_unavailable"
  | "disabled_by_scope"
  | "runtime_unavailable";
export type ToolErrorCode =
  | "permission_denied"
  | "unsupported_platform"
  | "capability_unavailable"
  | "validation_failed"
  | "execution_failed";

export type ToolAvailability =
  | { available: true }
  | {
      available: false;
      reason: ToolAvailabilityReason;
      message: string;
    };

export type ToolError = {
  code: ToolErrorCode;
  message: string;
  retryable: boolean;
  suggestedAction?: string;
};

export type ToolPresentation = {
  formatInput?: (input: any) => string;
  formatOutput?: (output: any) => string;
  formatApproval?: (input: any) => string;
  formatError?: (error: ToolError | string) => string;
};

export type ToolInputExample = {
  input: Record<string, unknown>;
};

export type ToolContext = {
  platform: ChatToolPlatform;
  knownCapabilities: Partial<Record<ToolCapabilityKey, boolean>>;
  domainScope: ChatToolDomain[] | null;
  runtimeAvailability: {
    mobileExecution: boolean;
    externalLinking: boolean;
  };
  sessionHints: string[];
  debug: boolean;
};

export type ToolContextInput = Partial<
  Omit<ToolContext, "platform" | "domainScope">
> & {
  platform?: string | null;
  domainScope?: ChatToolDomain | ChatToolDomain[] | null;
};

export type ToolManifest = {
  name: string;
  label: string;
  description: string;
  runtime: ChatToolRuntime;
  domain: ChatToolDomain;
  platforms: readonly ChatToolPlatform[];
  approvalMode: ChatToolApprovalMode;
  permissions: readonly string[];
  riskLevel: ToolRiskLevel;
  whenToUse: string;
  whenNotToUse: string;
  availability: (context: ToolContext) => ToolAvailability;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  inputExamples?: ToolInputExample[];
  execute?: (input: any) => Promise<unknown>;
  presentation: ToolPresentation;
  mapError: (error: unknown) => ToolError;
  requiresFollowUp?: boolean;
};
