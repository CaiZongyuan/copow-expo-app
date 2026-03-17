import * as Linking from "expo-linking";

import {
  errorMessage,
  type MobileToolExecutor,
} from "@/features/chat/tools/executors/mobile/shared";

const blockedExternalUrlSchemes = new Set([
  "about",
  "blob",
  "content",
  "data",
  "file",
  "javascript",
]);

function getUrlScheme(url: string) {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);

  return match?.[1]?.toLowerCase();
}

function validateExternalUrl(url: string, fieldName: string) {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new Error(`External URL ${fieldName} must not be empty.`);
  }

  const scheme = getUrlScheme(normalizedUrl);

  if (!scheme) {
    throw new Error(
      `External URL ${fieldName} must include an explicit URL scheme such as https: or an app-specific scheme.`
    );
  }

  if (blockedExternalUrlSchemes.has(scheme)) {
    throw new Error(
      `External URL ${fieldName} uses a blocked scheme: ${scheme}.`
    );
  }

  return normalizedUrl;
}

async function openExternalUrlWithFallback({
  url,
  fallbackUrl,
}: {
  url: string;
  fallbackUrl?: string;
}) {
  try {
    await Linking.openURL(url);

    return {
      status: "opened" as const,
      openedUrl: url,
      usedFallback: false,
    };
  } catch (primaryError) {
    if (!fallbackUrl || fallbackUrl === url) {
      throw new Error(
        `Could not open the requested external URL. ${errorMessage(primaryError)}`
      );
    }

    try {
      await Linking.openURL(fallbackUrl);

      return {
        status: "fallback-opened" as const,
        openedUrl: fallbackUrl,
        usedFallback: true,
      };
    } catch (fallbackError) {
      throw new Error(
        `Could not open the requested external URL or its fallback. Primary error: ${errorMessage(
          primaryError
        )} Fallback error: ${errorMessage(fallbackError)}`
      );
    }
  }
}

export const externalExecutors = {
  open_external_url: async ({ url, label, appName, intent, fallbackUrl }) => {
    const requestedUrl = validateExternalUrl(url, "url");
    const normalizedFallbackUrl = fallbackUrl
      ? validateExternalUrl(fallbackUrl, "fallbackUrl")
      : undefined;

    const result = await openExternalUrlWithFallback({
      url: requestedUrl,
      fallbackUrl: normalizedFallbackUrl,
    });

    return {
      status: result.status,
      requestedUrl,
      openedUrl: result.openedUrl,
      label: label ?? null,
      appName: appName ?? null,
      intent: intent ?? null,
      usedFallback: result.usedFallback,
    };
  },
} satisfies Record<string, MobileToolExecutor>;
