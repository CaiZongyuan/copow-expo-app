import {
  formatManifestError,
} from "@/features/chat/tools/manifests/shared";
import {
  getMobileToolManifest,
  mobileToolDefinitions,
  type MobileToolName,
} from "@/features/chat/tools/manifests/mobile";
import { calendarExecutors } from "@/features/chat/tools/executors/mobile/calendar";
import { contactsExecutors } from "@/features/chat/tools/executors/mobile/contacts";
import { externalExecutors } from "@/features/chat/tools/executors/mobile/external";
import { healthExecutors } from "@/features/chat/tools/executors/mobile/health";
import { locationExecutors } from "@/features/chat/tools/executors/mobile/location";
import type { MobileToolExecutor } from "@/features/chat/tools/executors/mobile/shared";

const mobileToolExecutors: Record<MobileToolName, MobileToolExecutor> = {
  ...healthExecutors,
  ...contactsExecutors,
  ...calendarExecutors,
  ...locationExecutors,
  ...externalExecutors,
} satisfies Record<MobileToolName, MobileToolExecutor>;

export async function executeMobileTool(toolName: MobileToolName, input: any) {
  const manifest = getMobileToolManifest(toolName) ?? mobileToolDefinitions[toolName];

  try {
    return await mobileToolExecutors[toolName](input);
  } catch (error) {
    throw new Error(formatManifestError(manifest, error));
  }
}
