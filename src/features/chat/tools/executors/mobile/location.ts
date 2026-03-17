import * as Location from "expo-location";

import {
  ensureForegroundLocationAccess,
  type MobileToolExecutor,
} from "@/features/chat/tools/executors/mobile/shared";

export const locationExecutors = {
  get_current_location: async ({ includeAddress = true }) => {
    await ensureForegroundLocationAccess();

    const position = await Location.getCurrentPositionAsync();
    const { coords } = position;
    const geocodedAddress = includeAddress
      ? (
          await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
        )[0]
      : undefined;

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
      address: geocodedAddress
        ? {
            name: geocodedAddress.name,
            city: geocodedAddress.city,
            region: geocodedAddress.region,
            country: geocodedAddress.country,
            postalCode: geocodedAddress.postalCode,
            formattedAddress: geocodedAddress.formattedAddress,
          }
        : null,
    };
  },
} satisfies Record<string, MobileToolExecutor>;
