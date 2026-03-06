import Constants from "expo-constants";

const getDevServerOrigin = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }

  const experienceUrl = Constants.experienceUrl;
  if (experienceUrl) {
    return experienceUrl.replace("exp://", "http://");
  }

  const linkingUri = Constants.linkingUri;
  if (linkingUri) {
    const match = linkingUri.match(/^[^:]+:\/\/([^/]+)/);
    if (match?.[1]) {
      return `http://${match[1]}`;
    }
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL;
};

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === "development") {
    const origin = getDevServerOrigin();
    if (!origin) {
      throw new Error(
        "Cannot determine development API base URL in dev client. Set EXPO_PUBLIC_API_BASE_URL or launch from Expo CLI.",
      );
    }

    return origin.concat(path);
  }

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL environment variable is not defined",
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};
